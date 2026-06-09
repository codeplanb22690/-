import {
  Album,
  Badge,
  Bookmark,
  Bot,
  CakeSlice,
  Cat,
  CloudLightning,
  Clover,
  Crown,
  CupSoda,
  Ghost,
  Gift,
  Hexagon,
  Orbit,
  Plane,
  ShieldQuestion,
  Sparkles,
  Star,
  Zap,
  type LucideIcon,
} from "lucide-react";

import type { CodexEntry } from "@/features/catalog/codexEntries";

const ICONS_BY_ENTRY_ID: Record<string, LucideIcon> = {
  "lost-dango": ShieldQuestion,
  "patrol-robot": Bot,
  "repair-robot": Bot,
  "alert-robot": Zap,
  "sleepy-ghost": Ghost,
  "cloud-spirit": CloudLightning,
  "giant-dango-king": Crown,
  "rogue-robot-mk01": Bot,
  "nightmare-cat": Cat,
  "forgotten-shadow": Sparkles,
  "starrail-conductor": Orbit,
  "dawn-core": Hexagon,
  mangoCake: CakeSlice,
  strawberryMilkshake: CupSoda,
  starlightPaperPlane: Plane,
  luckyClover: Clover,
  moonBookmark: Bookmark,
  starPulse: Orbit,
  xingliHairpin: Star,
  cafeCard: Badge,
  dreamAlbum: Album,
  moonBookmarkRelic: Bookmark,
  luckyCharm: Gift,
  strawberryShake: CupSoda,
};

const FALLBACK_ICONS: Record<CodexEntry["category"], LucideIcon> = {
  monster: Bot,
  boss: Crown,
  weapon: Sparkles,
  relic: Gift,
};

type CodexIconProps = {
  entry: CodexEntry;
  size?: number;
};

export function CodexIcon({ entry, size = 28 }: CodexIconProps) {
  const Icon = ICONS_BY_ENTRY_ID[entry.id] ?? FALLBACK_ICONS[entry.category];
  return <Icon aria-hidden="true" size={size} strokeWidth={2.35} />;
}
