import { Check, X } from "lucide-react";
import { forwardRef } from "react";

import { useGameSettings } from "@/features/settings/useGameSettings";
import { playAudioEvent } from "@/shared/audio/sfx";

export const SettingsDialog = forwardRef<HTMLDialogElement>(function SettingsDialog(_, ref) {
  const { settings, setSettings } = useGameSettings();

  function previewSfxVolume() {
    playAudioEvent("uiConfirm", { cooldownMs: 0 });
  }

  return (
    <dialog
      ref={ref}
      className="settings-dialog"
      aria-labelledby="settings-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) event.currentTarget.close();
      }}
    >
      <form method="dialog" className="settings-dialog__panel">
        <header className="settings-dialog__header">
          <h2 id="settings-title">设置</h2>
          <button type="submit" className="settings-dialog__close" value="close" aria-label="关闭">
            <X aria-hidden="true" size={18} strokeWidth={2.4} />
          </button>
        </header>

        <div className="settings-dialog__body">
          <label className="setting-row">
            <span>音乐</span>
            <input
              type="range"
              min="0"
              max="100"
              aria-valuetext={`${settings.music}%`}
              value={settings.music}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  music: Number(event.target.value),
                }))
              }
            />
            <strong className="setting-row__value">{settings.music}%</strong>
          </label>

          <label className="setting-row">
            <span>音效</span>
            <input
              type="range"
              min="0"
              max="100"
              aria-valuetext={`${settings.sfx}%`}
              value={settings.sfx}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  sfx: Number(event.target.value),
                }))
              }
              onPointerUp={previewSfxVolume}
              onKeyUp={previewSfxVolume}
            />
            <strong className="setting-row__value">{settings.sfx}%</strong>
          </label>

        </div>

        <footer className="settings-dialog__footer">
          <button type="submit" className="btn-secondary" value="close">
            <Check aria-hidden="true" size={16} strokeWidth={2.6} />
            确定
          </button>
        </footer>
      </form>
    </dialog>
  );
});
