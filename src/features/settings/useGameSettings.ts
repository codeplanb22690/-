import { useEffect, useState } from "react";

import type { GameSettings } from "@/features/settings/settings.types";

const STORAGE_KEY = "xingcunzhe-settings";
export const SETTINGS_CHANGE_EVENT = "xingcunzhe-settings-change";
const DEFAULT_SETTINGS: GameSettings = {
  music: 48,
  sfx: 80,
};

function clampVolume(value: unknown, fallback: number): number {
  const numericValue = Number(value ?? fallback);
  if (!Number.isFinite(numericValue)) return fallback;
  return Math.max(0, Math.min(100, Math.round(numericValue)));
}

function readSettings(): GameSettings {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return DEFAULT_SETTINGS;

  try {
    const parsed = JSON.parse(raw) as Partial<GameSettings>;
    return {
      music: clampVolume(parsed.music, DEFAULT_SETTINGS.music),
      sfx: clampVolume(parsed.sfx, DEFAULT_SETTINGS.sfx),
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function useGameSettings() {
  const [settings, setSettings] = useState<GameSettings>(() => readSettings());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    window.dispatchEvent(new Event(SETTINGS_CHANGE_EVENT));
  }, [settings]);

  return {
    settings,
    setSettings,
  };
}
