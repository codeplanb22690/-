export type CatalogMonsterId =
  | "lost-dango"
  | "patrol-robot"
  | "repair-robot"
  | "alert-robot"
  | "sleepy-ghost"
  | "cloud-spirit"
  | "giant-dango-king"
  | "rogue-robot-mk01"
  | "nightmare-cat"
  | "forgotten-shadow"
  | "starrail-conductor"
  | "dawn-core";

export type CatalogRelicId =
  | "xingliHairpin"
  | "cafeCard"
  | "dreamAlbum"
  | "moonBookmarkRelic"
  | "luckyCharm"
  | "strawberryShake";

export type CatalogWeaponId = "mangoCake" | "strawberryMilkshake" | "starlightPaperPlane" | "luckyClover" | "moonBookmark" | "starPulse";

export type CatalogEntryKind = "monster" | "boss" | "weapon" | "relic";

export type MonsterCatalogEntry = {
  id: CatalogMonsterId;
  code: string;
  kind: "monster" | "boss";
  name: string;
  artDescription: string;
  gameplayNote: string;
  collisionRadius: number;
  drawSize: number;
  unlockHint: string;
};

export type RelicCatalogEntry = {
  id: CatalogRelicId;
  code: string;
  kind: "relic";
  name: string;
  effect: string;
  artDescription: string;
};

export type WeaponCatalogEntry = {
  id: CatalogWeaponId;
  code: string;
  kind: "weapon";
  name: string;
  evolution?: string;
  evolutionRecipe?: string;
  artDescription: string;
  gameplayNote: string;
};

export const MONSTER_CATALOG: MonsterCatalogEntry[] = [
  {
    id: "lost-dango",
    code: "M001",
    kind: "monster",
    name: "迷路团子",
    artDescription: "粉白色圆形团子，头顶问号，呆萌表情，短小四肢。",
    gameplayNote: "0-3分钟出没，最早靠近星黎的梦境生物。",
    collisionRadius: 25,
    drawSize: 50,
    unlockHint: "0-3分钟遭遇后解锁。",
  },
  {
    id: "patrol-robot",
    code: "M002",
    kind: "monster",
    name: "巡逻机器人",
    artDescription: "蓝白机器人，头顶警示灯，履带结构。",
    gameplayNote: "0-3分钟出没，移动更快，适合测试走位。",
    collisionRadius: 27,
    drawSize: 56,
    unlockHint: "0-3分钟遭遇后解锁。",
  },
  {
    id: "repair-robot",
    code: "M003",
    kind: "monster",
    name: "维修机器人",
    artDescription: "黄色工业机器人，工具箱背包，机械手臂。",
    gameplayNote: "3分钟后加入战斗，血量较高。",
    collisionRadius: 28,
    drawSize: 56,
    unlockHint: "3分钟后遭遇后解锁。",
  },
  {
    id: "alert-robot",
    code: "M004",
    kind: "monster",
    name: "警戒机器人",
    artDescription: "红色独眼，悬浮推进器，科技风。",
    gameplayNote: "6分钟后出现，高血量机器人敌人。",
    collisionRadius: 27,
    drawSize: 58,
    unlockHint: "6分钟后遭遇后解锁。",
  },
  {
    id: "sleepy-ghost",
    code: "M005",
    kind: "monster",
    name: "失眠小幽灵",
    artDescription: "白色半透明幽灵，黑眼圈，抱着枕头。",
    gameplayNote: "3分钟后加入战斗，速度较快。",
    collisionRadius: 25,
    drawSize: 54,
    unlockHint: "3分钟后遭遇后解锁。",
  },
  {
    id: "cloud-spirit",
    code: "M006",
    kind: "monster",
    name: "乌云精灵",
    artDescription: "灰色云朵，环绕闪电，愤怒表情。",
    gameplayNote: "6分钟后出现，追击压力明显提升。",
    collisionRadius: 29,
    drawSize: 58,
    unlockHint: "6分钟后遭遇后解锁。",
  },
  {
    id: "giant-dango-king",
    code: "B001",
    kind: "boss",
    name: "巨型团子王",
    artDescription: "皇冠与甜点权杖，第一地图最终BOSS。",
    gameplayNote: "14分钟登场，击败后直接胜利。",
    collisionRadius: 90,
    drawSize: 190,
    unlockHint: "14分钟遭遇后解锁。",
  },
  {
    id: "rogue-robot-mk01",
    code: "B002",
    kind: "boss",
    name: "失控机器人MK-01",
    artDescription: "导弹仓与激光炮，研究所主题BOSS。",
    gameplayNote: "后续地图BOSS，当前图鉴先记录设定。",
    collisionRadius: 94,
    drawSize: 190,
    unlockHint: "后续地图实装后解锁。",
  },
  {
    id: "nightmare-cat",
    code: "B003",
    kind: "boss",
    name: "梦魇猫咪",
    artDescription: "紫色瞳孔与月亮纹路，月夜主题BOSS。",
    gameplayNote: "后续地图BOSS，当前图鉴先记录设定。",
    collisionRadius: 82,
    drawSize: 176,
    unlockHint: "后续地图实装后解锁。",
  },
  {
    id: "forgotten-shadow",
    code: "B004",
    kind: "boss",
    name: "遗忘之影",
    artDescription: "星光构成人形黑影，最终BOSS。",
    gameplayNote: "最终地图BOSS，当前图鉴先记录设定。",
    collisionRadius: 86,
    drawSize: 184,
    unlockHint: "最终地图实装后解锁。",
  },
  {
    id: "starrail-conductor",
    code: "B005",
    kind: "boss",
    name: "星轨列车长",
    artDescription: "光轨车长帽、分段车厢装甲与蓝白霓虹信号灯，云端电车站主题BOSS。",
    gameplayNote: "14分钟登场，代表高速路线压缩和轨道冲锋压力。",
    collisionRadius: 92,
    drawSize: 188,
    unlockHint: "云端电车站Boss阶段遭遇后解锁。",
  },
  {
    id: "dawn-core",
    code: "B006",
    kind: "boss",
    name: "黎明核心",
    artDescription: "高空星环核心、数据流护盾与透明能量穹顶，终局挑战BOSS。",
    gameplayNote: "14分钟登场，代表多机制混合的终局压力。",
    collisionRadius: 96,
    drawSize: 198,
    unlockHint: "黎明星环塔Boss阶段遭遇后解锁。",
  },
];

export const WEAPON_CATALOG: WeaponCatalogEntry[] = [
  {
    id: "mangoCake",
    code: "W001",
    kind: "weapon",
    name: "芒果蛋糕",
    evolution: "彩虹千层蛋糕",
    evolutionRecipe: "芒果蛋糕 Lv8 + 星黎发卡 Lv7",
    artDescription: "亮黄色甜点切片，飞行时旋转。",
    gameplayNote: "自动瞄准最近敌人发射甜点弹，升级后增加多发、穿透和爆炸。",
  },
  {
    id: "strawberryMilkshake",
    code: "W002",
    kind: "weapon",
    name: "草莓奶昔",
    evolution: "甜梦奶昔风暴",
    evolutionRecipe: "草莓奶昔 Lv8 + 草莓奶昔杯 Lv7",
    artDescription: "粉色奶昔杯与草莓装饰。",
    gameplayNote: "召唤奶昔杯环绕星黎，持续保护近身区域；超武器扩大环绕风暴。",
  },
  {
    id: "starlightPaperPlane",
    code: "W003",
    kind: "weapon",
    name: "星光纸飞机",
    evolution: "银河信使",
    evolutionRecipe: "星光纸飞机 Lv8 + 咖啡厅会员卡 Lv7",
    artDescription: "带星光尾迹的纸飞机。",
    gameplayNote: "自动瞄准最近敌人投出高速纸飞机，穿透成排敌群。",
  },
  {
    id: "luckyClover",
    code: "W004",
    kind: "weapon",
    name: "幸运四叶草",
    evolution: "命运之轮",
    evolutionRecipe: "幸运四叶草 Lv8 + 幸运挂件 Lv7",
    artDescription: "发光四叶草与命运轮盘。",
    gameplayNote: "向随机方向抛出四叶草，穿透路径上的敌人；超武器附带爆炸与金币收益。",
  },
  {
    id: "moonBookmark",
    code: "W005",
    kind: "weapon",
    name: "月光书签",
    evolution: "满月书签阵",
    evolutionRecipe: "月光书签 Lv8 + 月光书签遗物 Lv7",
    artDescription: "月蓝色书签，在敌群之间折跃弹射。",
    gameplayNote: "朝最近敌人发射书签，命中后会在敌人之间连续弹射；超武器增加弹射次数与清群效率。",
  },
  {
    id: "starPulse",
    code: "W006",
    kind: "weapon",
    name: "星轨脉冲",
    evolution: "星穹审判",
    evolutionRecipe: "星轨脉冲 Lv8 + 梦境相册 Lv7",
    artDescription: "星蓝色脉冲核心，释放环形星轨光柱。",
    gameplayNote: "锁定最近敌人脚下释放星轨脉冲，超武器会在敌群周围追加多道光柱。",
  },
];

export const RELIC_CATALOG: RelicCatalogEntry[] = [
  {
    id: "xingliHairpin",
    code: "R001",
    kind: "relic",
    name: "星黎发卡",
    effect: "每级幸运 +5%，后台提高升级选项数，最高 Lv7",
    artDescription: "星形发卡，带暖色星芒。",
  },
  {
    id: "cafeCard",
    code: "R002",
    kind: "relic",
    name: "咖啡厅会员卡",
    effect: "每级经验获取 +5%，最高 Lv7",
    artDescription: "星光咖啡厅会员卡。",
  },
  {
    id: "dreamAlbum",
    code: "R003",
    kind: "relic",
    name: "梦境相册",
    effect: "每级掉落率 +7%，最高 Lv7",
    artDescription: "梦境相册，边缘有星尘贴纸。",
  },
  {
    id: "moonBookmarkRelic",
    code: "R004",
    kind: "relic",
    name: "月光书签",
    effect: "每级发射冷却 -3.5%，最高 Lv7",
    artDescription: "月光书签，带银蓝色流苏。",
  },
  {
    id: "luckyCharm",
    code: "R005",
    kind: "relic",
    name: "幸运挂件",
    effect: "每级宝箱品质提高，最高 Lv7",
    artDescription: "小巧幸运挂件，像微型星铃。",
  },
  {
    id: "strawberryShake",
    code: "R006",
    kind: "relic",
    name: "草莓奶昔杯",
    effect: "每级最大生命值 +8，最高 Lv7",
    artDescription: "草莓奶昔杯，杯口有奶油。",
  },
];

export const MONSTER_CATALOG_BY_ID = Object.fromEntries(MONSTER_CATALOG.map((entry) => [entry.id, entry])) as Record<
  CatalogMonsterId,
  MonsterCatalogEntry
>;

export const RELIC_CATALOG_BY_ID = Object.fromEntries(RELIC_CATALOG.map((entry) => [entry.id, entry])) as Record<
  CatalogRelicId,
  RelicCatalogEntry
>;

export const WEAPON_CATALOG_BY_ID = Object.fromEntries(WEAPON_CATALOG.map((entry) => [entry.id, entry])) as Record<
  CatalogWeaponId,
  WeaponCatalogEntry
>;
