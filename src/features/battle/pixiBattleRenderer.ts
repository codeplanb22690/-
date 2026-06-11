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

export class PixiBattleRenderer {
  private app: Application;
  private root = new Container();
  private backgroundLayer = new Container();
  private pickupLayer = new Container();
  private enemyProjectileLayer = new Container();
  private monsterLayer = new Container();
  private projectileLayer = new Container();
  private playerLayer = new Container();
  private uiLayer = new Container();
  private textures = new Map<string, Texture>();
  private playerFrameTextures = new Map<string, Texture[]>();
  private background: TilingSprite | null = null;
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

  private constructor(app: Application) {
    this.app = app;
    this.root.sortableChildren = true;
    this.app.stage.addChild(this.root);
    this.root.addChild(this.backgroundLayer, this.pickupLayer, this.enemyProjectileLayer, this.monsterLayer, this.projectileLayer, this.playerLayer, this.uiLayer);
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
      resolution: Math.max(1, window.devicePixelRatio || 1),
      width: Math.max(1, host.clientWidth),
    });
    app.canvas.className = "battle-canvas";
    host.appendChild(app.canvas);
    return new PixiBattleRenderer(app);
  }

  destroy() {
    this.app.destroy(true);
  }

  render(engine: PixiBattleEngineState, images: Record<BattleImageKey, HTMLImageElement>, touchStick: TouchStickState) {
    const width = Math.max(1, this.app.canvas.clientWidth);
    const height = Math.max(1, this.app.canvas.clientHeight);
    const resolution = Math.max(1, window.devicePixelRatio || 1);
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
      sprite = new Sprite(texture);
      sprite.anchor.set(0.5);
      pool.set(id, sprite);
      layer.addChild(sprite);
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
      if (!liveIds.has(id)) sprite.visible = false;
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
