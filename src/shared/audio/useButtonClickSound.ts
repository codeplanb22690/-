import { useEffect } from "react";

import { playAudioEvent } from "@/shared/audio/sfx";

export function useButtonClickSound() {
  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!(event.target instanceof Element)) return;

      const button = event.target.closest("button");
      if (!button || button.disabled) return;

      playAudioEvent("uiClick");
    }

    document.addEventListener("pointerdown", handlePointerDown, { capture: true });
    return () => document.removeEventListener("pointerdown", handlePointerDown, { capture: true });
  }, []);
}
