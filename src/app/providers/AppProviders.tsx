import type { PropsWithChildren } from "react";

import { useButtonClickSound } from "@/shared/audio/useButtonClickSound";

export function AppProviders({ children }: PropsWithChildren) {
  useButtonClickSound();

  return children;
}
