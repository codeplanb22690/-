import {
  Application,
  Container,
  Rectangle,
  Sprite,
  Texture,
  TilingSprite,
} from "pixi.js";

import type { BattleImageKey } from "@/features/battle/battleAssetLoader";
import type { MapId } from "@/features/maps/mapConfigs";

type Facing = "left" | "right";
type WeaponId = "mangoCake" | "strawberryMilkshake" | "starlightPaperPlane" | "luckyClover" | "moonBookmark" | "starPulse";
type PickupType = "exp" | "coin" | "heal" | "chest" | "luckyStar" | "energyDrink" | "mysteryBox";

export type PixiBattleChoice = {
  id: string;
  title: string;
  description: string;
  icon: string;
  highlighted?: boolean;
};

export type PixiBattleChoiceOverlay = {
  title: string;
  choices: PixiBattleChoice[];
};

export type PixiBattleUiOverlay =
  | { type: "none" }
  | { type: "loading"; text: string }
  | { type: "paused"; music: number; sfx: number }
  | { type: "choice"; title: string; choices: PixiBattleChoice[] }
  | { type: "result"; title: string; lines: string[]; primaryLabel: string };

export type PixiBattleChoiceRect = {
  id: string;
  left: number;
  top: number;
  width: number;
  height: number;
};

export type PixiBattleChoiceLayout = {
  panel: { left: number; top: number; width: number; height: number };
  cards: PixiBattleChoiceRect[];
};

export type PixiBattleActionRect = {
  id: string;
  left: number;
  top: number;
  width: number;
  height: number;
};

export type PixiBattleActionLayout = {
  panel: { left: number; top: number; width: number; height: number };
  actions: PixiBattleActionRect[];
};

export type PixiBattleHud = {
  mapName: string;
  difficultyName: string;
  mapMechanicName: string;
  timeLeft: number;
  level: number;
  xp: number;
  xpToNext: number;
  coins: number;
  kills: number;
  mapEventNotice: string;
  weaponLines: Array<{ text: string; evolved?: boolean }>;
  relicLines: string[];
  achievementTitle?: string;
  evolutionFlash?: boolean;
};

type TouchStickState = {
  active: boolean;
  baseX: number;
  baseY: number;
  knobX: number;
  knobY: number;
};

type PixiBattleMonster = {
  id: number;
  kind: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  shieldHp?: number;
  maxShieldHp?: number;
  radius: number;
  drawSize: number;
  isElite: boolean;
  isDying: boolean;
  dyingAt: number;
};

type PixiBattleProjectile = {
  id: number;
  weapon: WeaponId;
  x: number;
  y: number;
  rotation: number;
  bornAt: number;
  customLifetimeMs?: number;
};

type PixiBattleEnemyProjectile = {
  id: number;
  x: number;
  y: number;
  radius: number;
};

type PixiBattlePickup = {
  id: number;
  type: PickupType;
  x: number;
  y: number;
  chestTier?: "normal" | "rare" | "legendary";
};

export type PixiBattleEngineState = {
  mapConfig: {
    id: MapId;
    bossId: string;
  };
  player: {
    x: number;
    y: number;
    frame: number;
    facing: Facing;
    isMoving: boolean;
  };
  stats: {
    hp: number;
    maxHp: number;
    milkshakeDuration: number;
  };
  evolvedWeapons: Record<WeaponId, boolean>;
  pickups: PixiBattlePickup[];
  enemyProjectiles: PixiBattleEnemyProjectile[];
  monsters: PixiBattleMonster[];
  projectiles: PixiBattleProjectile[];
};

type PooledSprite = Sprite & {
  poolKey?: string;
};

const FLOOR_TILE_SCREEN_SIZE = 512;
const FLOOR_TILE_SAFE_MARGIN = 128;
const DRAW_CULL_MARGIN = 140;
const XINGLI_WALK_FRAMES = 5;
const MONSTER_DEATH_MS = 420;
const STAT_MILKSHAKE_DURATION_MAX = 4.5;
const EXP_BAR_FRAME_SOURCE_WIDTH = 1240;
const EXP_BAR_FRAME_SOURCE_HEIGHT = 232;
const EXP_BAR_TRACK_SOURCE = { x: 48, y: 96, width: 1144, height: 70 };
const expBarMaskCache = new WeakMap<HTMLImageElement, HTMLCanvasElement>();

const BOSS_MONSTER_IDS = new Set([
  "giant-dango-king",
  "nightmare-cat",
  "rogue-robot-mk01",
  "forgotten-shadow",
  "starrail-conductor",
  "dawn-core",
]);

function getZoom(width: number, height: number) {
  return width < height ? 0.52 : 0.42;
}

function getBattleRenderResolution() {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const isMobileLike =
    window.matchMedia?.("(pointer: coarse)").matches ||
    Math.min(window.innerWidth || 0, window.innerHeight || 0) < 760;
  return Math.min(dpr, isMobileLike ? 1.25 : 1.5);
}

function getProjectileAlpha(projectile: PixiBattleProjectile, engine: PixiBattleEngineState) {
  if (projectile.weapon !== "strawberryMilkshake") return 1;

  const age = performance.now() - projectile.bornAt;
  const lifetime = projectile.customLifetimeMs ?? Math.max(900, Math.min(STAT_MILKSHAKE_DURATION_MAX, engine.stats.milkshakeDuration) * 1000);
  const fadeInMs = Math.min(160, lifetime * 0.22);
  const fadeOutMs = Math.min(260, lifetime * 0.32);
  const fadeIn = Math.min(1, age / Math.max(1, fadeInMs));
  const fadeOut = Math.min(1, (lifetime - age) / Math.max(1, fadeOutMs));
  return Math.max(0, Math.min(1, fadeIn, fadeOut));
}

function imageAspect(image: HTMLImageElement) {
  return image.naturalWidth > 0 && image.naturalHeight > 0 ? image.naturalWidth / image.naturalHeight : 1;
}

function formatHudTime(seconds: number) {
  const clampedSeconds = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(clampedSeconds / 60);
  const remainingSeconds = clampedSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

function mixHexColor(from: [number, number, number], to: [number, number, number], amount: number) {
  const clamped = Math.max(0, Math.min(1, amount));
  const r = Math.round(from[0] + (to[0] - from[0]) * clamped);
  const g = Math.round(from[1] + (to[1] - from[1]) * clamped);
  const b = Math.round(from[2] + (to[2] - from[2]) * clamped);
  return `rgb(${r}, ${g}, ${b})`;
}

function getExpBarTrack(frame: HTMLImageElement) {
  const sourceWidth = frame.naturalWidth || EXP_BAR_FRAME_SOURCE_WIDTH;
  const sourceHeight = frame.naturalHeight || EXP_BAR_FRAME_SOURCE_HEIGHT;
  const scaleX = sourceWidth / EXP_BAR_FRAME_SOURCE_WIDTH;
  const scaleY = sourceHeight / EXP_BAR_FRAME_SOURCE_HEIGHT;
  return {
    x: Math.round(EXP_BAR_TRACK_SOURCE.x * scaleX),
    y: Math.round(EXP_BAR_TRACK_SOURCE.y * scaleY),
    width: Math.round(EXP_BAR_TRACK_SOURCE.width * scaleX),
    height: Math.round(EXP_BAR_TRACK_SOURCE.height * scaleY),
  };
}

function getExpBarMask(frame: HTMLImageElement) {
  const cached = expBarMaskCache.get(frame);
  if (cached) return cached;

  const width = frame.naturalWidth || EXP_BAR_FRAME_SOURCE_WIDTH;
  const height = frame.naturalHeight || EXP_BAR_FRAME_SOURCE_HEIGHT;
  const track = getExpBarTrack(frame);
  const mask = document.createElement("canvas");
  mask.width = width;
  mask.height = height;
  const context = mask.getContext("2d", { willReadFrequently: true });
  if (!context) {
    expBarMaskCache.set(frame, mask);
    return mask;
  }

  context.clearRect(0, 0, width, height);
  context.drawImage(frame, 0, 0, width, height);
  const imageData = context.getImageData(0, 0, width, height);
  for (let y = 0; y < height; y += 1) {
    const inTrackY = y >= track.y && y < track.y + track.height;
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const inTrack = inTrackY && x >= track.x && x < track.x + track.width;
      const visible = inTrack && imageData.data[index + 3] < 16;
      imageData.data[index] = 255;
      imageData.data[index + 1] = 255;
      imageData.data[index + 2] = 255;
      imageData.data[index + 3] = visible ? 255 : 0;
    }
  }
  context.putImageData(imageData, 0, 0);
  expBarMaskCache.set(frame, mask);
  return mask;
}

function createPixelExpBarCanvas(frame: HTMLImageElement, progress: number) {
  const width = frame.naturalWidth || EXP_BAR_FRAME_SOURCE_WIDTH;
  const height = frame.naturalHeight || EXP_BAR_FRAME_SOURCE_HEIGHT;
  const track = getExpBarTrack(frame);
  const mask = getExpBarMask(frame);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return canvas;

  const clampedProgress = Math.max(0, Math.min(1, progress));
  const pixelStep = Math.max(4, Math.round(width / 180));
  const fillWidth = Math.round(track.width * clampedProgress);
  context.imageSmoothingEnabled = false;
  context.clearRect(0, 0, width, height);
  context.fillStyle = "#08091a";
  context.fillRect(track.x, track.y, track.width, track.height);

  for (let x = 0; x < fillWidth; x += pixelStep) {
    const blockWidth = Math.min(pixelStep, fillWidth - x);
    const amount = track.width <= pixelStep ? 1 : x / Math.max(1, track.width - pixelStep);
    const baseColor =
      amount < 0.52
        ? mixHexColor([18, 76, 220], [27, 182, 255], amount / 0.52)
        : mixHexColor([27, 182, 255], [137, 239, 255], (amount - 0.52) / 0.48);
    context.fillStyle = baseColor;
    context.fillRect(track.x + x, track.y, blockWidth, track.height);
    context.fillStyle = "rgba(255, 255, 255, 0.2)";
    context.fillRect(track.x + x, track.y + 5, blockWidth, Math.max(4, Math.round(track.height * 0.18)));
    context.fillStyle = "rgba(0, 19, 78, 0.22)";
    context.fillRect(track.x + x, track.y + track.height - Math.max(5, Math.round(track.height * 0.2)), blockWidth, Math.max(5, Math.round(track.height * 0.2)));
  }

  context.globalCompositeOperation = "destination-in";
  context.drawImage(mask, 0, 0);
  context.globalCompositeOperation = "source-over";
  context.drawImage(frame, 0, 0, width, height);
  return canvas;
}

export function getPixiBattleChoiceLayout(width: number, height: number, choices: PixiBattleChoice[]): PixiBattleChoiceLayout {
  const safeWidth = Math.max(1, width);
  const safeHeight = Math.max(1, height);
  const count = Math.max(1, choices.length);
  const portrait = safeWidth < safeHeight;
  const columns = portrait || safeWidth < 560 || choices.some((choice) => choice.highlighted) ? 1 : Math.min(2, count);
  const rows = Math.ceil(count / columns);
  const panelWidth = Math.min(safeWidth * 0.9, columns === 1 ? 430 : 620);
  const padding = safeWidth < 520 ? 16 : 22;
  const gap = safeWidth < 520 ? 10 : 12;
  const titleHeight = safeWidth < 520 ? 38 : 46;
  const availableCardHeight = Math.floor((safeHeight * 0.82 - padding * 2 - titleHeight - gap * Math.max(0, rows - 1)) / rows);
  const cardHeight = Math.max(104, Math.min(safeWidth < 520 ? 132 : 150, availableCardHeight));
  const cardWidth = (panelWidth - padding * 2 - gap * (columns - 1)) / columns;
  const panelHeight = padding * 2 + titleHeight + cardHeight * rows + gap * Math.max(0, rows - 1);
  const panelLeft = (safeWidth - panelWidth) / 2;
  const panelTop = Math.max(18, (safeHeight - panelHeight) / 2);
  const firstCardTop = panelTop + padding + titleHeight;

  return {
    panel: { left: panelLeft, top: panelTop, width: panelWidth, height: panelHeight },
    cards: choices.map((choice, index) => {
      const row = Math.floor(index / columns);
      const column = index % columns;
      return {
        id: choice.id,
        left: panelLeft + padding + column * (cardWidth + gap),
        top: firstCardTop + row * (cardHeight + gap),
        width: cardWidth,
        height: cardHeight,
      };
    }),
  };
}

export function getPixiBattleHudLayout(width: number, height: number) {
  const compact = width < 700 || height < 560;
  const padding = compact ? 10 : 16;
  const pauseSize = compact ? 38 : 44;
  return {
    pause: {
      id: "pause",
      left: width - padding - pauseSize,
      top: padding,
      width: pauseSize,
      height: pauseSize,
    },
  };
}

export function getPixiBattlePauseLayout(width: number, height: number): PixiBattleActionLayout {
  const safeWidth = Math.max(1, width);
  const safeHeight = Math.max(1, height);
  const panelWidth = Math.min(safeWidth - 36, 360);
  const compact = safeWidth < 520;
  const panelHeight = compact ? 276 : 296;
  const panelLeft = (safeWidth - panelWidth) / 2;
  const panelTop = Math.max(18, (safeHeight - panelHeight) / 2);
  const bodyLeft = panelLeft + 20;
  const bodyWidth = panelWidth - 40;
  const sliderWidth = Math.min(160, Math.max(118, bodyWidth - 108));
  const sliderLeft = panelLeft + panelWidth - 20 - 42 - sliderWidth - 16;
  const footerButtonWidth = compact ? 104 : 112;
  const buttonHeight = compact ? 38 : 40;
  return {
    panel: { left: panelLeft, top: panelTop, width: panelWidth, height: panelHeight },
    actions: [
      { id: "close", left: panelLeft + panelWidth - 52, top: panelTop + 12, width: 32, height: 32 },
      { id: "music", left: sliderLeft, top: panelTop + (compact ? 82 : 88), width: sliderWidth, height: 24 },
      { id: "sfx", left: sliderLeft, top: panelTop + (compact ? 126 : 136), width: sliderWidth, height: 24 },
      {
        id: "confirm",
        left: panelLeft + panelWidth - 20 - footerButtonWidth,
        top: panelTop + panelHeight - buttonHeight - 16,
        width: footerButtonWidth,
        height: buttonHeight,
      },
      {
        id: "return",
        left: bodyLeft,
        top: panelTop + panelHeight - buttonHeight - 16,
        width: Math.min(132, bodyWidth - footerButtonWidth - 12),
        height: buttonHeight,
      },
    ],
  };
}

export function getPixiBattleResultLayout(width: number, height: number, lineCount: number): PixiBattleActionLayout {
  const safeWidth = Math.max(1, width);
  const safeHeight = Math.max(1, height);
  const panelWidth = Math.min(safeWidth * 0.86, 430);
  const panelHeight = Math.min(safeHeight * 0.78, 142 + Math.max(1, lineCount) * 24);
  const panelLeft = (safeWidth - panelWidth) / 2;
  const panelTop = Math.max(18, (safeHeight - panelHeight) / 2);
  const buttonHeight = safeWidth < 520 ? 42 : 46;
  return {
    panel: { left: panelLeft, top: panelTop, width: panelWidth, height: panelHeight },
    actions: [
      {
        id: "return",
        left: panelLeft + 26,
        top: panelTop + panelHeight - buttonHeight - 18,
        width: panelWidth - 52,
        height: buttonHeight,
      },
    ],
  };
}

export function pointInPixiRect(x: number, y: number, rect: PixiBattleActionRect | PixiBattleChoiceRect) {
  return x >= rect.left && x <= rect.left + rect.width && y >= rect.top && y <= rect.top + rect.height;
}

function fitSprite(sprite: Sprite, image: HTMLImageElement, maxSize: number) {
  const aspect = imageAspect(image);
  sprite.width = aspect >= 1 ? maxSize : maxSize * aspect;
  sprite.height = aspect >= 1 ? maxSize / aspect : maxSize;
}

function makeCanvasTexture(key: string, width: number, height: number, draw: (context: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (context) draw(context);
  const texture = Texture.from(canvas);
  texture.label = key;
  return texture;
}

function makeProjectileTexture(key: string, weapon: WeaponId, evolved: boolean) {
  return makeCanvasTexture(key, 96, 96, (context) => {
    const cx = 48;
    const cy = 48;
    context.imageSmoothingEnabled = false;

    if (weapon === "starlightPaperPlane") {
      context.fillStyle = evolved ? "#b8f4ff" : "#d7fbff";
      context.beginPath();
      context.moveTo(76, 48);
      context.lineTo(28, 68);
      context.lineTo(42, 48);
      context.lineTo(28, 28);
      context.closePath();
      context.fill();
      context.strokeStyle = evolved ? "#62d7ff" : "#7bbcff";
      context.lineWidth = 4;
      context.beginPath();
      context.moveTo(42, 48);
      context.lineTo(76, 48);
      context.stroke();
      return;
    }

    if (weapon === "luckyClover") {
      const radius = 10;
      context.fillStyle = evolved ? "#f7e26a" : "#74df90";
      context.beginPath();
      context.arc(cx - 8, cy - 8, radius, 0, Math.PI * 2);
      context.arc(cx + 8, cy - 8, radius, 0, Math.PI * 2);
      context.arc(cx - 8, cy + 8, radius, 0, Math.PI * 2);
      context.arc(cx + 8, cy + 8, radius, 0, Math.PI * 2);
      context.fill();
      return;
    }

    if (weapon === "moonBookmark") {
      context.fillStyle = evolved ? "#d7e9ff" : "#9fc9ff";
      context.beginPath();
      context.moveTo(72, 48);
      context.lineTo(48, 57);
      context.lineTo(24, 48);
      context.lineTo(48, 39);
      context.closePath();
      context.fill();
      context.strokeStyle = evolved ? "#fff4a8" : "#d7e9ff";
      context.lineWidth = 4;
      context.beginPath();
      context.arc(cx, cy, 18, -0.4, 0.9);
      context.stroke();
      return;
    }

    if (weapon === "strawberryMilkshake") {
      context.fillStyle = evolved ? "#ff94cf" : "#ffb2cf";
      context.beginPath();
      context.arc(cx, cy, 20, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = "#fff1f7";
      context.fillRect(cx - 11, cy - 17, 22, 11);
      return;
    }

    context.strokeStyle = evolved ? "#d9fbff" : "#8fd9ff";
    context.lineWidth = 6;
    context.beginPath();
    context.arc(cx, cy, evolved ? 32 : 25, 0, Math.PI * 2);
    context.stroke();
    context.fillStyle = evolved ? "rgba(190, 245, 255, 0.32)" : "rgba(110, 210, 255, 0.24)";
    context.beginPath();
    context.arc(cx, cy, evolved ? 15 : 12, 0, Math.PI * 2);
    context.fill();
  });
}

function makeCircleTexture(key: string, fill: string, stroke?: string) {
  return makeCanvasTexture(key, 96, 96, (context) => {
    context.fillStyle = fill;
    context.beginPath();
    context.arc(48, 48, 34, 0, Math.PI * 2);
    context.fill();
    if (stroke) {
      context.strokeStyle = stroke;
      context.lineWidth = 6;
      context.beginPath();
      context.arc(48, 48, 30, 0, Math.PI * 2);
      context.stroke();
    }
  });
}

function roundedRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.lineTo(x + width - r, y);
  context.quadraticCurveTo(x + width, y, x + width, y + r);
  context.lineTo(x + width, y + height - r);
  context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  context.lineTo(x + r, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - r);
  context.lineTo(x, y + r);
  context.quadraticCurveTo(x, y, x + r, y);
  context.closePath();
}

function wrapText(context: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number) {
  const words = Array.from(text);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line + word;
    if (context.measureText(next).width <= maxWidth || line.length === 0) {
      line = next;
      continue;
    }
    lines.push(line);
    line = word;
    if (lines.length >= maxLines) break;
  }
  if (lines.length < maxLines && line) lines.push(line);
  if (lines.length > 0 && lines.length === maxLines && context.measureText(lines[lines.length - 1]).width > maxWidth) {
    lines[lines.length - 1] = `${lines[lines.length - 1].slice(0, Math.max(1, lines[lines.length - 1].length - 2))}...`;
  }
  return lines;
}

function drawChoiceIcon(context: CanvasRenderingContext2D, choice: PixiBattleChoice, x: number, y: number, size: number) {
  const highlighted = Boolean(choice.highlighted);
  const iconColors: Record<string, string> = {
    attack: "#8ee8ff",
    attackSpeed: "#74df90",
    cooldown: "#9fc9ff",
    moveSpeed: "#fff1a8",
    range: "#ffb347",
    pickupRange: "#71d9ff",
    mangoCake: "#ffd37a",
    strawberryMilkshake: "#ff94cf",
    starlightPaperPlane: "#d7fbff",
    luckyClover: "#74df90",
    moonBookmark: "#9fc9ff",
    starPulse: "#8ee8ff",
    relic: "#fff1a8",
    evolution: "#fff1a8",
    coins: "#ffd37a",
    chest: "#ffb347",
  };
  const color = highlighted ? "#fff1a8" : iconColors[choice.icon] ?? "#8ee8ff";
  context.save();
  context.translate(x, y);
  context.fillStyle = "rgba(8, 14, 24, 0.58)";
  roundedRect(context, -size / 2, -size / 2, size, size, 10);
  context.fill();
  context.strokeStyle = color;
  context.lineWidth = 3;
  roundedRect(context, -size / 2 + 3, -size / 2 + 3, size - 6, size - 6, 8);
  context.stroke();
  context.fillStyle = color;
  context.font = `900 ${Math.floor(size * 0.44)}px "PingFang SC", "Microsoft YaHei", sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(choice.title.slice(0, 1), 0, 1);
  context.restore();
}

export class PixiBattleRenderer {
  private app: Application;
  private host: HTMLElement;
  private root = new Container();
  private backgroundLayer = new Container();
  private pickupLayer = new Container();
  private enemyProjectileLayer = new Container();
  private monsterLayer = new Container();
  private projectileLayer = new Container();
  private playerLayer = new Container();
  private uiLayer = new Container();
  private overlayLayer = new Container();
  private textures = new Map<string, Texture>();
  private playerFrameTextures = new Map<string, Texture[]>();
  private choiceOverlaySprite: Sprite | null = null;
  private choiceOverlayTexture: Texture | null = null;
  private choiceOverlaySignature = "";
  private hudSprite: Sprite | null = null;
  private hudTexture: Texture | null = null;
  private hudSignature = "";
  private background: TilingSprite | null = null;
  private spareSprites = new Map<string, PooledSprite[]>();
  private sprites = {
    pickups: new Map<number, PooledSprite>(),
    enemyProjectiles: new Map<number, PooledSprite>(),
    monsters: new Map<number, PooledSprite>(),
    monsterShadows: new Map<number, PooledSprite>(),
    monsterEliteRings: new Map<number, PooledSprite>(),
    monsterShields: new Map<number, PooledSprite>(),
    bossHpBacks: new Map<number, PooledSprite>(),
    bossHpFills: new Map<number, PooledSprite>(),
    projectiles: new Map<number, PooledSprite>(),
  };
  private player: Sprite | null = null;
  private playerHpBack: Sprite;
  private playerHpFill: Sprite;
  private touchBase: Sprite;
  private touchKnob: Sprite;
  private readonly maxSpareSpritesPerKey = 64;

  private constructor(app: Application, host: HTMLElement) {
    this.app = app;
    this.host = host;
    this.root.sortableChildren = true;
    this.app.stage.addChild(this.root);
    this.root.addChild(this.backgroundLayer, this.pickupLayer, this.enemyProjectileLayer, this.monsterLayer, this.projectileLayer, this.playerLayer, this.uiLayer, this.overlayLayer);
    this.playerHpBack = new Sprite(Texture.WHITE);
    this.playerHpFill = new Sprite(Texture.WHITE);
    this.touchBase = new Sprite(makeCircleTexture("touch-base", "rgba(255, 230, 204, 0.08)", "rgba(255, 230, 204, 0.38)"));
    this.touchKnob = new Sprite(makeCircleTexture("touch-knob", "rgba(255, 179, 71, 0.52)"));
    this.touchBase.anchor.set(0.5);
    this.touchKnob.anchor.set(0.5);
    this.playerHpBack.tint = 0x250a12;
    this.playerHpBack.alpha = 0.82;
    this.playerHpFill.tint = 0x9f1425;
    this.uiLayer.addChild(this.playerHpBack, this.playerHpFill, this.touchBase, this.touchKnob);
  }

  static async create(host: HTMLElement) {
    const app = new Application();
    await app.init({
      autoDensity: true,
      backgroundAlpha: 0,
      height: Math.max(1, host.clientHeight),
      preference: "webgl",
      resolution: getBattleRenderResolution(),
      width: Math.max(1, host.clientWidth),
    });
    app.canvas.className = "battle-render-canvas";
    app.canvas.style.width = "100%";
    app.canvas.style.height = "100%";
    app.canvas.style.display = "block";
    host.appendChild(app.canvas);
    return new PixiBattleRenderer(app, host);
  }

  destroy() {
    this.choiceOverlayTexture?.destroy(true);
    this.hudTexture?.destroy(true);
    this.app.destroy(true);
  }

  render(
    engine: PixiBattleEngineState,
    images: Record<BattleImageKey, HTMLImageElement>,
    touchStick: TouchStickState,
    hud: PixiBattleHud | null = null,
    uiOverlay: PixiBattleUiOverlay | null = null,
  ) {
    const width = Math.max(1, this.host.clientWidth || this.app.canvas.clientWidth);
    const height = Math.max(1, this.host.clientHeight || this.app.canvas.clientHeight);
    this.app.canvas.style.width = "100%";
    this.app.canvas.style.height = "100%";
    const resolution = getBattleRenderResolution();
    if (this.app.renderer.width !== Math.floor(width * resolution) || this.app.renderer.height !== Math.floor(height * resolution)) {
      this.app.renderer.resolution = resolution;
      this.app.renderer.resize(width, height);
    }

    const zoom = getZoom(width, height);
    const centerX = width / 2;
    const centerY = height / 2;
    const toScreenX = (x: number) => centerX + (x - engine.player.x) * zoom;
    const toScreenY = (y: number) => centerY + (y - engine.player.y) * zoom;
    const isVisible = (x: number, y: number, margin = DRAW_CULL_MARGIN) => x >= -margin && x <= width + margin && y >= -margin && y <= height + margin;

    this.renderBackground(engine, images, width, height, zoom);
    this.renderPickups(engine, images, toScreenX, toScreenY, isVisible);
    this.renderEnemyProjectiles(engine, toScreenX, toScreenY, isVisible, zoom);
    this.renderMonsters(engine, images, toScreenX, toScreenY, isVisible, zoom);
    this.renderProjectiles(engine, images, toScreenX, toScreenY, isVisible);
    this.renderPlayer(engine, images, width, height);
    this.renderTouchStick(touchStick);
    this.renderHud(hud, images, width, height);
    this.renderUiOverlay(uiOverlay, width, height);
  }

  private texture(key: string, image: HTMLImageElement) {
    const cached = this.textures.get(key);
    if (cached) return cached;
    const texture = Texture.from(image);
    texture.source.scaleMode = "nearest";
    this.textures.set(key, texture);
    return texture;
  }

  private playerTextures(key: "xingliLeft" | "xingliRight", image: HTMLImageElement) {
    const cached = this.playerFrameTextures.get(key);
    if (cached) return cached;
    const base = this.texture(key, image);
    const frameWidth = image.naturalWidth / XINGLI_WALK_FRAMES;
    const frames = Array.from({ length: XINGLI_WALK_FRAMES }, (_, frame) => (
      new Texture({
        frame: new Rectangle(frameWidth * frame, 0, frameWidth, image.naturalHeight),
        source: base.source,
      })
    ));
    this.playerFrameTextures.set(key, frames);
    return frames;
  }

  private spriteFrom(pool: Map<number, PooledSprite>, id: number, layer: Container, texture: Texture, poolKey: string) {
    let sprite = pool.get(id);
    if (!sprite) {
      sprite = this.spareSprites.get(poolKey)?.pop() ?? new Sprite(texture);
      sprite.anchor.set(0.5);
      pool.set(id, sprite);
      if (sprite.parent !== layer) layer.addChild(sprite);
    }
    if (sprite.poolKey !== poolKey) {
      sprite.texture = texture;
      sprite.poolKey = poolKey;
    }
    sprite.visible = true;
    return sprite;
  }

  private hideMissing(pool: Map<number, PooledSprite>, liveIds: Set<number>) {
    for (const [id, sprite] of pool) {
      if (liveIds.has(id)) continue;
      pool.delete(id);
      sprite.visible = false;
      const poolKey = sprite.poolKey ?? "sprite";
      const spareSprites = this.spareSprites.get(poolKey) ?? [];
      if (!this.spareSprites.has(poolKey)) this.spareSprites.set(poolKey, spareSprites);
      if (spareSprites.length < this.maxSpareSpritesPerKey) {
        spareSprites.push(sprite);
      } else {
        sprite.parent?.removeChild(sprite);
        sprite.destroy();
      }
    }
  }

  private renderBackground(engine: PixiBattleEngineState, images: Record<BattleImageKey, HTMLImageElement>, width: number, height: number, zoom: number) {
    const texture = this.texture(engine.mapConfig.id, images[engine.mapConfig.id]);
    if (!this.background) {
      this.background = new TilingSprite({ texture, width, height });
      this.backgroundLayer.addChild(this.background);
    } else if (this.background.texture !== texture) {
      this.background.texture = texture;
    }
    this.background.width = width + FLOOR_TILE_SAFE_MARGIN * 2;
    this.background.height = height + FLOOR_TILE_SAFE_MARGIN * 2;
    this.background.x = -FLOOR_TILE_SAFE_MARGIN;
    this.background.y = -FLOOR_TILE_SAFE_MARGIN;
    this.background.tileScale.set(FLOOR_TILE_SCREEN_SIZE / Math.max(1, images[engine.mapConfig.id].naturalWidth));
    this.background.tilePosition.set(
      -(((engine.player.x * zoom) % FLOOR_TILE_SCREEN_SIZE) + FLOOR_TILE_SCREEN_SIZE) % FLOOR_TILE_SCREEN_SIZE,
      -(((engine.player.y * zoom) % FLOOR_TILE_SCREEN_SIZE) + FLOOR_TILE_SCREEN_SIZE) % FLOOR_TILE_SCREEN_SIZE,
    );
  }

  private renderPickups(
    engine: PixiBattleEngineState,
    images: Record<BattleImageKey, HTMLImageElement>,
    toScreenX: (x: number) => number,
    toScreenY: (y: number) => number,
    isVisible: (x: number, y: number, margin?: number) => boolean,
  ) {
    const liveIds = new Set<number>();
    for (const pickup of engine.pickups) {
      const x = toScreenX(pickup.x);
      const y = toScreenY(pickup.y);
      if (!isVisible(x, y, 80)) continue;
      const key = pickup.type === "chest" ? "chest" : pickup.type;
      const image = images[key];
      const sprite = this.spriteFrom(this.sprites.pickups, pickup.id, this.pickupLayer, this.texture(key, image), key);
      const size = pickup.type === "chest" ? pickup.chestTier === "legendary" ? 54 : pickup.chestTier === "rare" ? 49 : 45 : pickup.type === "heal" ? 34 : pickup.type === "coin" ? 28 : 30;
      sprite.position.set(x, y);
      sprite.alpha = 1;
      sprite.rotation = 0;
      fitSprite(sprite, image, size);
      liveIds.add(pickup.id);
    }
    this.hideMissing(this.sprites.pickups, liveIds);
  }

  private renderEnemyProjectiles(
    engine: PixiBattleEngineState,
    toScreenX: (x: number) => number,
    toScreenY: (y: number) => number,
    isVisible: (x: number, y: number, margin?: number) => boolean,
    zoom: number,
  ) {
    const texture = this.getProceduralTexture("enemy-projectile", () => makeCircleTexture("enemy-projectile", "rgba(255, 226, 247, 0.92)", "rgba(255, 95, 144, 0.92)"));
    const liveIds = new Set<number>();
    for (const projectile of engine.enemyProjectiles) {
      const x = toScreenX(projectile.x);
      const y = toScreenY(projectile.y);
      if (!isVisible(x, y, 80)) continue;
      const sprite = this.spriteFrom(this.sprites.enemyProjectiles, projectile.id, this.enemyProjectileLayer, texture, "enemy-projectile");
      const size = Math.max(10, projectile.radius * zoom * 3);
      sprite.position.set(x, y);
      sprite.width = size;
      sprite.height = size;
      sprite.alpha = 1;
      liveIds.add(projectile.id);
    }
    this.hideMissing(this.sprites.enemyProjectiles, liveIds);
  }

  private renderMonsters(
    engine: PixiBattleEngineState,
    images: Record<BattleImageKey, HTMLImageElement>,
    toScreenX: (x: number) => number,
    toScreenY: (y: number) => number,
    isVisible: (x: number, y: number, margin?: number) => boolean,
    zoom: number,
  ) {
    const liveIds = new Set<number>();
    const shadowLiveIds = new Set<number>();
    const eliteLiveIds = new Set<number>();
    const shieldLiveIds = new Set<number>();
    const bossHpLiveIds = new Set<number>();
    const now = performance.now();

    for (const monster of engine.monsters) {
      const x = toScreenX(monster.x);
      const y = toScreenY(monster.y);
      if (!isVisible(x, y, monster.drawSize + DRAW_CULL_MARGIN)) continue;

      const isBoss = BOSS_MONSTER_IDS.has(monster.kind) || monster.kind === engine.mapConfig.bossId;
      if (!monster.isDying) {
        const shadowTexture = this.getProceduralTexture(isBoss ? "boss-shadow" : "monster-shadow", () => makeCircleTexture(isBoss ? "boss-shadow" : "monster-shadow", isBoss ? "rgba(142, 16, 40, 0.13)" : "rgba(255, 179, 71, 0.1)"));
        const shadow = this.spriteFrom(this.sprites.monsterShadows, monster.id, this.monsterLayer, shadowTexture, isBoss ? "boss-shadow" : "monster-shadow");
        shadow.position.set(x, y + monster.radius * zoom * 0.16);
        shadow.width = monster.radius * zoom * 2;
        shadow.height = monster.radius * zoom * 1.24;
        shadow.alpha = 1;
        shadowLiveIds.add(monster.id);

        if (monster.isElite) {
          const ringTexture = this.getProceduralTexture("elite-ring", () => makeCircleTexture("elite-ring", "rgba(0,0,0,0)", "rgba(255, 232, 140, 0.68)"));
          const ring = this.spriteFrom(this.sprites.monsterEliteRings, monster.id, this.monsterLayer, ringTexture, "elite-ring");
          ring.position.set(x, y);
          ring.width = monster.drawSize * 0.78;
          ring.height = monster.drawSize * 0.78;
          ring.alpha = 1;
          eliteLiveIds.add(monster.id);
        }

        if ((monster.shieldHp ?? 0) > 0) {
          const shieldTexture = this.getProceduralTexture("shield-ring", () => makeCircleTexture("shield-ring", "rgba(0,0,0,0)", "rgba(113, 217, 255, 0.72)"));
          const shield = this.spriteFrom(this.sprites.monsterShields, monster.id, this.monsterLayer, shieldTexture, "shield-ring");
          shield.position.set(x, y);
          shield.width = monster.drawSize * 0.92;
          shield.height = monster.drawSize * 0.92;
          shield.alpha = 0.28 + Math.max(0, (monster.shieldHp ?? 0) / Math.max(1, monster.maxShieldHp ?? 1)) * 0.48;
          shieldLiveIds.add(monster.id);
        }
      }

      const imageKey = monster.kind as BattleImageKey;
      const image = images[imageKey];
      const sprite = this.spriteFrom(this.sprites.monsters, monster.id, this.monsterLayer, this.texture(imageKey, image), imageKey);
      const deathAge = monster.isDying ? now - monster.dyingAt : 0;
      const deathScale = monster.isDying ? 1 + Math.min(1, deathAge / MONSTER_DEATH_MS) * 0.7 : 1;
      sprite.position.set(x, y);
      sprite.alpha = monster.isDying ? Math.max(0, 1 - deathAge / MONSTER_DEATH_MS) : 1;
      fitSprite(sprite, image, monster.drawSize * deathScale);
      liveIds.add(monster.id);

      if (isBoss && !monster.isDying) {
        const hpBack = this.spriteFrom(this.sprites.bossHpBacks, monster.id, this.monsterLayer, Texture.WHITE, "boss-hp-back");
        const hpFill = this.spriteFrom(this.sprites.bossHpFills, monster.id, this.monsterLayer, Texture.WHITE, "boss-hp-fill");
        const hpPercent = Math.max(0, monster.hp / Math.max(1, monster.maxHp));
        hpBack.tint = 0x1a0910;
        hpBack.alpha = 0.82;
        hpBack.anchor.set(0, 0.5);
        hpBack.position.set(x - 64, y - monster.drawSize * 0.72);
        hpBack.width = 128;
        hpBack.height = 8;
        hpFill.tint = 0x8e1028;
        hpFill.anchor.set(0, 0.5);
        hpFill.position.set(x - 64, y - monster.drawSize * 0.72);
        hpFill.width = 128 * hpPercent;
        hpFill.height = 8;
        bossHpLiveIds.add(monster.id);
      }
    }

    this.hideMissing(this.sprites.monsters, liveIds);
    this.hideMissing(this.sprites.monsterShadows, shadowLiveIds);
    this.hideMissing(this.sprites.monsterEliteRings, eliteLiveIds);
    this.hideMissing(this.sprites.monsterShields, shieldLiveIds);
    this.hideMissing(this.sprites.bossHpBacks, bossHpLiveIds);
    this.hideMissing(this.sprites.bossHpFills, bossHpLiveIds);
  }

  private renderProjectiles(
    engine: PixiBattleEngineState,
    images: Record<BattleImageKey, HTMLImageElement>,
    toScreenX: (x: number) => number,
    toScreenY: (y: number) => number,
    isVisible: (x: number, y: number, margin?: number) => boolean,
  ) {
    const liveIds = new Set<number>();
    for (const projectile of engine.projectiles) {
      const x = toScreenX(projectile.x);
      const y = toScreenY(projectile.y);
      if (!isVisible(x, y, 180)) continue;
      const evolved = engine.evolvedWeapons[projectile.weapon];
      const key = `${projectile.weapon}-${evolved ? "evolved" : "normal"}`;
      const texture =
        projectile.weapon === "mangoCake"
          ? this.texture(evolved ? "rainbowCakeProjectile" : "mangoCakeProjectile", images[evolved ? "rainbowCakeProjectile" : "mangoCakeProjectile"])
          : this.getProceduralTexture(key, () => makeProjectileTexture(key, projectile.weapon, evolved));
      const sprite = this.spriteFrom(this.sprites.projectiles, projectile.id, this.projectileLayer, texture, key);
      const size = projectile.weapon === "mangoCake" ? (evolved ? 36 : 32) : projectile.weapon === "starPulse" ? (evolved ? 72 : 54) : 34;
      sprite.position.set(x, y);
      sprite.rotation = projectile.rotation;
      sprite.alpha = getProjectileAlpha(projectile, engine);
      sprite.width = size;
      sprite.height = size;
      liveIds.add(projectile.id);
    }
    this.hideMissing(this.sprites.projectiles, liveIds);
  }

  private renderPlayer(engine: PixiBattleEngineState, images: Record<BattleImageKey, HTMLImageElement>, width: number, height: number) {
    const key = engine.player.facing === "left" ? "xingliLeft" : "xingliRight";
    const textures = this.playerTextures(key, images[key]);
    const frame = engine.player.isMoving ? engine.player.frame : 0;
    if (!this.player) {
      this.player = new Sprite(textures[frame]);
      this.player.anchor.set(0.5);
      this.playerLayer.addChild(this.player);
    } else {
      this.player.texture = textures[frame];
    }

    const playerHeight = Math.max(58, Math.min(82, width * 0.08));
    const playerWidth = playerHeight * (210 / 325);
    this.player.position.set(width / 2, height / 2);
    this.player.width = playerWidth;
    this.player.height = playerHeight;

    const hpPercent = Math.max(0, engine.stats.hp / engine.stats.maxHp);
    this.playerHpBack.anchor.set(0, 0.5);
    this.playerHpBack.position.set(width / 2 - playerWidth * 0.42, height / 2 + playerHeight * 0.53);
    this.playerHpBack.width = playerWidth * 0.84;
    this.playerHpBack.height = 6;
    this.playerHpFill.anchor.set(0, 0.5);
    this.playerHpFill.position.set(width / 2 - playerWidth * 0.42, height / 2 + playerHeight * 0.53);
    this.playerHpFill.width = playerWidth * 0.84 * hpPercent;
    this.playerHpFill.height = 6;
  }

  private renderTouchStick(touchStick: TouchStickState) {
    this.touchBase.visible = touchStick.active;
    this.touchKnob.visible = touchStick.active;
    if (!touchStick.active) return;
    this.touchBase.position.set(touchStick.baseX, touchStick.baseY);
    this.touchBase.width = 104;
    this.touchBase.height = 104;
    this.touchKnob.position.set(touchStick.baseX + touchStick.knobX, touchStick.baseY + touchStick.knobY);
    this.touchKnob.width = 42;
    this.touchKnob.height = 42;
  }

  private renderHud(hud: PixiBattleHud | null, images: Record<BattleImageKey, HTMLImageElement>, width: number, height: number) {
    if (!hud) {
      if (this.hudSprite) this.hudSprite.visible = false;
      return;
    }

    const signature = JSON.stringify({
      width: Math.round(width),
      height: Math.round(height),
      time: Math.ceil(hud.timeLeft),
      level: hud.level,
      xpBucket: Math.round((hud.xp / Math.max(1, hud.xpToNext)) * (width < 700 ? 48 : 80)),
      xpToNext: hud.xpToNext,
      notice: hud.mapEventNotice,
      weapons: hud.weaponLines,
      relics: hud.relicLines,
      achievement: hud.achievementTitle,
      evolutionFlash: hud.evolutionFlash ? 1 : 0,
    });

    if (signature !== this.hudSignature) {
      this.hudSignature = signature;
      this.hudTexture?.destroy(true);
      this.hudTexture = this.createHudTexture(hud, images, width, height);
      if (!this.hudSprite) {
        this.hudSprite = new Sprite(this.hudTexture);
        this.uiLayer.addChildAt(this.hudSprite, 0);
      } else {
        this.hudSprite.texture = this.hudTexture;
      }
    }

    if (!this.hudSprite) return;
    this.hudSprite.visible = true;
    this.hudSprite.position.set(0, 0);
    this.hudSprite.width = width;
    this.hudSprite.height = height;
  }

  private createHudTexture(hud: PixiBattleHud, images: Record<BattleImageKey, HTMLImageElement>, width: number, height: number) {
    const scale = getBattleRenderResolution();
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext("2d");
    if (!context) return Texture.from(canvas);

    const panel = (x: number, y: number, w: number, h: number, alpha = 0.3) => {
      context.fillStyle = `rgba(0, 0, 0, ${alpha})`;
      roundedRect(context, x, y, w, h, 6);
      context.fill();
      context.strokeStyle = "rgba(255, 255, 255, 0.16)";
      context.lineWidth = 1;
      roundedRect(context, x + 0.5, y + 0.5, w - 1, h - 1, 6);
      context.stroke();
    };

    context.scale(scale, scale);
    context.clearRect(0, 0, width, height);
    if (hud.evolutionFlash) {
      const flash = context.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) * 0.62);
      flash.addColorStop(0, "rgba(255, 241, 168, 0.34)");
      flash.addColorStop(0.55, "rgba(255, 179, 71, 0.16)");
      flash.addColorStop(1, "rgba(255, 179, 71, 0)");
      context.fillStyle = flash;
      context.fillRect(0, 0, width, height);
    }
    context.textBaseline = "middle";
    context.lineJoin = "round";
    context.shadowColor = "rgba(0, 0, 0, 0.72)";
    context.shadowBlur = 4;

    const compact = width < 700 || height < 560;
    const padding = compact ? 10 : 16;
    const fontFamily = '"PingFang SC", "Microsoft YaHei", sans-serif';

    const mapW = Math.min(width * 0.32, compact ? 190 : 240);
    panel(padding, padding, mapW, compact ? 42 : 48);
    context.textAlign = "left";
    context.fillStyle = "#fff8f0";
    context.font = `900 ${compact ? 12 : 15}px ${fontFamily}`;
    context.fillText(hud.mapName, padding + 10, padding + (compact ? 15 : 17), mapW - 20);
    context.fillStyle = "rgba(255, 238, 214, 0.76)";
    context.font = `800 ${compact ? 9 : 11}px ${fontFamily}`;
    context.fillText(`${hud.difficultyName} · ${hud.mapMechanicName}`, padding + 10, padding + (compact ? 31 : 34), mapW - 20);

    const timerW = compact ? 84 : 98;
    panel((width - timerW) / 2, padding, timerW, compact ? 30 : 34);
    context.textAlign = "center";
    context.fillStyle = "#ffffff";
    context.font = `900 ${compact ? 16 : 21}px ${fontFamily}`;
    context.fillText(formatHudTime(hud.timeLeft), width / 2, padding + (compact ? 15 : 17));

    const { pause } = getPixiBattleHudLayout(width, height);
    panel(pause.left, pause.top, pause.width, pause.height, 0.34);
    context.strokeStyle = "rgba(255, 230, 204, 0.36)";
    context.lineWidth = 1.5;
    roundedRect(context, pause.left + 0.75, pause.top + 0.75, pause.width - 1.5, pause.height - 1.5, 6);
    context.stroke();
    context.fillStyle = "rgba(255, 255, 255, 0.92)";
    const barW = Math.max(3, Math.round(pause.width * 0.12));
    const barH = Math.round(pause.height * 0.42);
    const barY = pause.top + (pause.height - barH) / 2;
    const barX = pause.left + pause.width / 2 - barW - 3;
    context.fillRect(barX, barY, barW, barH);
    context.fillRect(barX + barW + 6, barY, barW, barH);

    const expFrame = images.expBarFrame;
    const expW = Math.min(width * (compact ? 0.9 : 0.58), compact ? 430 : 620);
    const expH = expW / Math.max(1, imageAspect(expFrame));
    const expX = (width - expW) / 2;
    const expY = padding + (compact ? 34 : 42);
    const expProgress = Math.max(0, Math.min(1, hud.xp / Math.max(1, hud.xpToNext)));
    const expBarCanvas = createPixelExpBarCanvas(expFrame, expProgress);
    const previousImageSmoothing = context.imageSmoothingEnabled;
    context.shadowBlur = 0;
    context.imageSmoothingEnabled = false;
    context.drawImage(expBarCanvas, Math.round(expX), Math.round(expY), Math.round(expW), Math.round(expH));
    context.imageSmoothingEnabled = previousImageSmoothing;
    context.shadowColor = "rgba(0, 0, 0, 0.72)";
    context.shadowBlur = 4;
    context.fillStyle = "#ffffff";
    context.font = `900 ${compact ? 12 : 14}px ${fontFamily}`;
    context.textAlign = "center";
    context.fillText(`Lv.${hud.level}`, expX + expW * 0.5, expY + expH * 0.58);

    if (!compact) {
      const loadoutW = Math.min(210, width * 0.28);
      const loadoutX = padding;
      const loadoutY = Math.max(122, height * 0.42 - 94);
      const weaponLines = hud.weaponLines.slice(0, 6);
      const relicLines = hud.relicLines.length > 0 ? hud.relicLines.slice(0, 6) : ["未获得"];
      const loadoutH = 48 + weaponLines.length * 16 + relicLines.length * 16;
      panel(loadoutX, loadoutY, loadoutW, loadoutH);
      context.textAlign = "left";
      context.fillStyle = "#fff1a8";
      context.font = `900 12px ${fontFamily}`;
      context.fillText("武器", loadoutX + 10, loadoutY + 18);
      context.font = `800 11px ${fontFamily}`;
      weaponLines.forEach((line, index) => {
        context.fillStyle = line.evolved ? "#ffe27d" : "rgba(255, 246, 232, 0.88)";
        context.fillText(line.text, loadoutX + 10, loadoutY + 39 + index * 16, loadoutW - 20);
      });
      const relicTitleY = loadoutY + 43 + weaponLines.length * 16;
      context.fillStyle = "#fff1a8";
      context.font = `900 12px ${fontFamily}`;
      context.fillText("遗物", loadoutX + 10, relicTitleY);
      context.font = `800 11px ${fontFamily}`;
      relicLines.forEach((line, index) => {
        context.fillStyle = line === "未获得" ? "rgba(255, 246, 232, 0.5)" : "rgba(255, 246, 232, 0.88)";
        context.fillText(line, loadoutX + 10, relicTitleY + 21 + index * 16, loadoutW - 20);
      });
    }

    if (hud.mapEventNotice) {
      const noticeW = Math.min(width * 0.78, 540);
      const noticeH = 34;
      const noticeX = (width - noticeW) / 2;
      const noticeY = height - Math.max(78, height * 0.12);
      panel(noticeX, noticeY, noticeW, noticeH, 0.34);
      context.fillStyle = "#fff8f0";
      context.font = `900 ${compact ? 12 : 14}px ${fontFamily}`;
      context.textAlign = "center";
      context.fillText(hud.mapEventNotice, width / 2, noticeY + noticeH / 2, noticeW - 24);
    }

    if (hud.achievementTitle) {
      const toastW = Math.min(width * 0.82, 360);
      const toastH = compact ? 48 : 54;
      const toastX = (width - toastW) / 2;
      const toastY = padding + (compact ? 82 : 92);
      panel(toastX, toastY, toastW, toastH, 0.46);
      context.textAlign = "center";
      context.fillStyle = "#8ee8ff";
      context.font = `800 ${compact ? 10 : 11}px ${fontFamily}`;
      context.fillText("成就解锁", width / 2, toastY + toastH * 0.33);
      context.fillStyle = "#fff8f0";
      context.font = `900 ${compact ? 13 : 15}px ${fontFamily}`;
      context.fillText(hud.achievementTitle, width / 2, toastY + toastH * 0.68, toastW - 24);
    }

    context.shadowBlur = 0;
    const texture = Texture.from(canvas);
    texture.source.scaleMode = "linear";
    return texture;
  }

  private renderUiOverlay(uiOverlay: PixiBattleUiOverlay | null, width: number, height: number) {
    if (!uiOverlay || uiOverlay.type === "none") {
      if (this.choiceOverlaySprite) this.choiceOverlaySprite.visible = false;
      return;
    }

    const signature = JSON.stringify({
      width: Math.round(width),
      height: Math.round(height),
      overlay: uiOverlay,
    });
    if (signature !== this.choiceOverlaySignature) {
      this.choiceOverlaySignature = signature;
      this.choiceOverlayTexture?.destroy(true);
      this.choiceOverlayTexture = this.createUiOverlayTexture(uiOverlay, width, height);
      if (!this.choiceOverlaySprite) {
        this.choiceOverlaySprite = new Sprite(this.choiceOverlayTexture);
        this.overlayLayer.addChild(this.choiceOverlaySprite);
      } else {
        this.choiceOverlaySprite.texture = this.choiceOverlayTexture;
      }
    }

    if (!this.choiceOverlaySprite) return;
    this.choiceOverlaySprite.visible = true;
    this.choiceOverlaySprite.position.set(0, 0);
    this.choiceOverlaySprite.width = width;
    this.choiceOverlaySprite.height = height;
  }

  private createUiOverlayTexture(uiOverlay: PixiBattleUiOverlay, width: number, height: number) {
    if (uiOverlay.type === "choice") return this.createChoiceOverlayTexture(uiOverlay, width, height);
    if (uiOverlay.type === "none") return Texture.EMPTY;
    return this.createActionOverlayTexture(uiOverlay, width, height);
  }

  private createActionOverlayTexture(uiOverlay: Exclude<PixiBattleUiOverlay, { type: "choice" | "none" }>, width: number, height: number) {
    const scale = getBattleRenderResolution();
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext("2d");
    if (!context) return Texture.from(canvas);

    const fontFamily = '"PingFang SC", "Microsoft YaHei", sans-serif';
    const compact = width < 520;
    const drawPanel = (panel: PixiBattleActionLayout["panel"]) => {
      const gradient = context.createLinearGradient(0, panel.top, 0, panel.top + panel.height);
      gradient.addColorStop(0, "rgba(26, 18, 40, 0.98)");
      gradient.addColorStop(1, "rgba(14, 10, 20, 0.98)");
      context.fillStyle = gradient;
      roundedRect(context, panel.left, panel.top, panel.width, panel.height, 8);
      context.fill();
      context.strokeStyle = "rgba(255, 180, 100, 0.2)";
      context.lineWidth = 1;
      roundedRect(context, panel.left + 0.5, panel.top + 0.5, panel.width - 1, panel.height - 1, 8);
      context.stroke();
    };
    const drawButton = (rect: PixiBattleActionRect, label: string, primary = false) => {
      context.fillStyle = primary ? "rgba(22, 24, 34, 0.86)" : "rgba(18, 22, 34, 0.78)";
      roundedRect(context, rect.left, rect.top, rect.width, rect.height, 6);
      context.fill();
      context.strokeStyle = "rgba(255, 214, 168, 0.28)";
      context.lineWidth = 1;
      roundedRect(context, rect.left + 0.5, rect.top + 0.5, rect.width - 1, rect.height - 1, 6);
      context.stroke();
      context.fillStyle = "#fff8f0";
      context.font = `800 ${compact ? 13 : 14}px ${fontFamily}`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(label, rect.left + rect.width / 2, rect.top + rect.height / 2);
    };
    const drawBar = (rect: PixiBattleActionRect, label: string, value: number) => {
      const clamped = Math.max(0, Math.min(100, value));
      context.fillStyle = "rgba(255, 240, 220, 0.85)";
      context.font = `700 ${compact ? 13 : 14}px ${fontFamily}`;
      context.textAlign = "left";
      context.textBaseline = "middle";
      context.fillText(label, rect.left - 58, rect.top + rect.height / 2);
      context.fillStyle = "rgba(3, 9, 18, 0.88)";
      roundedRect(context, rect.left, rect.top + 6, rect.width, rect.height - 12, 7);
      context.fill();
      context.fillStyle = "#ffb347";
      roundedRect(context, rect.left, rect.top + 6, rect.width * (clamped / 100), rect.height - 12, 7);
      context.fill();
      context.strokeStyle = "rgba(255, 220, 180, 0.18)";
      context.lineWidth = 1;
      roundedRect(context, rect.left + 0.5, rect.top + 6.5, rect.width - 1, rect.height - 13, 7);
      context.stroke();
      context.fillStyle = "rgba(255, 241, 168, 0.9)";
      context.font = `800 ${compact ? 11 : 12}px ${fontFamily}`;
      context.textAlign = "right";
      context.fillText(`${Math.round(clamped)}%`, rect.left + rect.width + 58, rect.top + rect.height / 2);
    };
    const drawClose = (rect: PixiBattleActionRect) => {
      context.fillStyle = "rgba(18, 22, 34, 0.78)";
      roundedRect(context, rect.left, rect.top, rect.width, rect.height, 6);
      context.fill();
      context.strokeStyle = "rgba(255, 220, 180, 0.18)";
      context.lineWidth = 1;
      roundedRect(context, rect.left + 0.5, rect.top + 0.5, rect.width - 1, rect.height - 1, 6);
      context.stroke();
      context.strokeStyle = "rgba(255, 220, 180, 0.76)";
      context.lineWidth = 2.2;
      context.lineCap = "round";
      context.beginPath();
      context.moveTo(rect.left + 11, rect.top + 11);
      context.lineTo(rect.left + rect.width - 11, rect.top + rect.height - 11);
      context.moveTo(rect.left + rect.width - 11, rect.top + 11);
      context.lineTo(rect.left + 11, rect.top + rect.height - 11);
      context.stroke();
    };

    context.scale(scale, scale);
    context.clearRect(0, 0, width, height);
    context.fillStyle = "rgba(0, 0, 0, 0.48)";
    context.fillRect(0, 0, width, height);

    if (uiOverlay.type === "loading") {
      const layout = getPixiBattleResultLayout(width, height, 1);
      drawPanel(layout.panel);
      context.fillStyle = "#fff8f0";
      context.font = `900 ${compact ? 22 : 26}px ${fontFamily}`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(uiOverlay.text, width / 2, layout.panel.top + layout.panel.height / 2);
    }

    if (uiOverlay.type === "paused") {
      const layout = getPixiBattlePauseLayout(width, height);
      drawPanel(layout.panel);
      context.fillStyle = "#fff8f0";
      context.font = `600 ${compact ? 17 : 18}px ${fontFamily}`;
      context.textAlign = "left";
      context.textBaseline = "middle";
      context.fillText("设置", layout.panel.left + 20, layout.panel.top + 28);
      context.strokeStyle = "rgba(255, 180, 100, 0.12)";
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(layout.panel.left, layout.panel.top + 56);
      context.lineTo(layout.panel.left + layout.panel.width, layout.panel.top + 56);
      context.stroke();
      context.beginPath();
      context.moveTo(layout.panel.left, layout.panel.top + layout.panel.height - (compact ? 70 : 72));
      context.lineTo(layout.panel.left + layout.panel.width, layout.panel.top + layout.panel.height - (compact ? 70 : 72));
      context.stroke();
      layout.actions.forEach((action) => {
        if (action.id === "close") drawClose(action);
        if (action.id === "music") drawBar(action, "音乐", uiOverlay.music);
        if (action.id === "sfx") drawBar(action, "音效", uiOverlay.sfx);
        if (action.id === "confirm") drawButton(action, "确定", true);
        if (action.id === "return") drawButton(action, "返回主界面");
      });
    }

    if (uiOverlay.type === "result") {
      const layout = getPixiBattleResultLayout(width, height, uiOverlay.lines.length);
      drawPanel(layout.panel);
      context.fillStyle = "#fff8f0";
      context.font = `900 ${compact ? 24 : 30}px ${fontFamily}`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(uiOverlay.title, layout.panel.left + layout.panel.width / 2, layout.panel.top + (compact ? 36 : 44));
      context.font = `800 ${compact ? 12 : 14}px ${fontFamily}`;
      context.fillStyle = "rgba(255, 236, 210, 0.9)";
      const firstLineY = layout.panel.top + (compact ? 72 : 84);
      uiOverlay.lines.forEach((line, index) => {
        context.fillText(line, layout.panel.left + layout.panel.width / 2, firstLineY + index * (compact ? 20 : 24), layout.panel.width - 42);
      });
      const returnAction = layout.actions.find((action) => action.id === "return");
      if (returnAction) drawButton(returnAction, uiOverlay.primaryLabel, true);
    }

    const texture = Texture.from(canvas);
    texture.source.scaleMode = "linear";
    return texture;
  }

  private createChoiceOverlayTexture(choiceOverlay: PixiBattleChoiceOverlay, width: number, height: number) {
    const scale = getBattleRenderResolution();
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext("2d");
    if (!context) return Texture.from(canvas);

    context.scale(scale, scale);
    context.clearRect(0, 0, width, height);
    context.fillStyle = "rgba(0, 0, 0, 0.48)";
    context.fillRect(0, 0, width, height);

    const layout = getPixiBattleChoiceLayout(width, height, choiceOverlay.choices);
    const panel = layout.panel;
    const gradient = context.createLinearGradient(0, panel.top, 0, panel.top + panel.height);
    gradient.addColorStop(0, "rgba(30, 20, 38, 0.96)");
    gradient.addColorStop(1, "rgba(10, 10, 18, 0.96)");
    context.fillStyle = gradient;
    roundedRect(context, panel.left, panel.top, panel.width, panel.height, 10);
    context.fill();
    context.strokeStyle = "rgba(255, 214, 168, 0.3)";
    context.lineWidth = 1.5;
    roundedRect(context, panel.left + 0.75, panel.top + 0.75, panel.width - 1.5, panel.height - 1.5, 10);
    context.stroke();

    context.fillStyle = "#fff8f0";
    context.font = `900 ${width < 520 ? 24 : 30}px "PingFang SC", "Microsoft YaHei", sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(choiceOverlay.title, panel.left + panel.width / 2, panel.top + (width < 520 ? 35 : 42));

    choiceOverlay.choices.forEach((choice, index) => {
      const rect = layout.cards[index];
      const highlighted = Boolean(choice.highlighted);
      context.fillStyle = highlighted ? "rgba(84, 66, 34, 0.94)" : "rgba(18, 22, 34, 0.94)";
      roundedRect(context, rect.left, rect.top, rect.width, rect.height, 8);
      context.fill();
      context.strokeStyle = highlighted ? "rgba(255, 241, 168, 0.96)" : "rgba(255, 214, 168, 0.28)";
      context.lineWidth = highlighted ? 2 : 1.5;
      roundedRect(context, rect.left + 0.75, rect.top + 0.75, rect.width - 1.5, rect.height - 1.5, 8);
      context.stroke();

      const iconSize = Math.min(48, Math.max(38, rect.height * 0.31));
      drawChoiceIcon(context, choice, rect.left + rect.width / 2, rect.top + iconSize * 0.78, iconSize);

      context.fillStyle = highlighted ? "#fff1a8" : "#fff8f0";
      context.font = `900 ${width < 520 ? 14 : 16}px "PingFang SC", "Microsoft YaHei", sans-serif`;
      context.textAlign = "center";
      context.textBaseline = "top";
      const titleLines = wrapText(context, choice.title, rect.width - 22, 2);
      titleLines.forEach((line, lineIndex) => {
        context.fillText(line, rect.left + rect.width / 2, rect.top + iconSize * 1.28 + lineIndex * 18);
      });

      context.fillStyle = "rgba(255, 236, 210, 0.82)";
      context.font = `700 ${width < 520 ? 11 : 12}px "PingFang SC", "Microsoft YaHei", sans-serif`;
      const descriptionTop = rect.top + iconSize * 1.28 + titleLines.length * 18 + 8;
      const descriptionLines = wrapText(context, choice.description, rect.width - 24, rect.height < 122 ? 2 : 3);
      descriptionLines.forEach((line, lineIndex) => {
        context.fillText(line, rect.left + rect.width / 2, descriptionTop + lineIndex * 16);
      });
    });

    const texture = Texture.from(canvas);
    texture.source.scaleMode = "linear";
    return texture;
  }

  private getProceduralTexture(key: string, factory: () => Texture) {
    const cached = this.textures.get(key);
    if (cached) return cached;
    const texture = factory();
    texture.source.scaleMode = "nearest";
    this.textures.set(key, texture);
    return texture;
  }
}

export async function createPixiBattleRenderer(host: HTMLElement) {
  return PixiBattleRenderer.create(host);
}
