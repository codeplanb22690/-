import { Clover, Crosshair, Feather, Gauge, Heart, Magnet, Swords, Timer } from "lucide-react";

import xingliPortraitUrl from "@/assets/characters/xingli-left-cutout.png";
import { PixelMangoCakeIcon } from "@/features/character-select/PixelMangoCakeIcon";

import type { ComponentType, SVGProps } from "react";

type Stat = {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  kind:
    | "health"
    | "luck"
    | "speed"
    | "attack"
    | "attackSpeed"
    | "cooldown"
    | "range"
    | "pickupRange"
    | "weapon";
  label: string;
  value: string;
};

export type Character = {
  id: string;
  name: string;
  portraitUrl: string;
  stats: Stat[];
};

export const characters: Character[] = [
  {
    id: "xingli",
    name: "星黎",
    portraitUrl: xingliPortraitUrl,
    stats: [
      { icon: Heart, kind: "health", label: "血量", value: "100" },
      { icon: Clover, kind: "luck", label: "幸运", value: "20%" },
      { icon: Feather, kind: "speed", label: "速度", value: "100%" },
      { icon: Swords, kind: "attack", label: "攻击", value: "100%" },
      { icon: Gauge, kind: "attackSpeed", label: "攻速", value: "100%" },
      { icon: Timer, kind: "cooldown", label: "冷却", value: "100%" },
      { icon: Crosshair, kind: "range", label: "子弹大小", value: "100%" },
      { icon: Magnet, kind: "pickupRange", label: "拾取", value: "120" },
      { icon: PixelMangoCakeIcon, kind: "weapon", label: "初始武器", value: "芒果蛋糕" },
    ],
  },
];
