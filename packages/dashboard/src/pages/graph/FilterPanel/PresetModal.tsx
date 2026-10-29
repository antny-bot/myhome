import { createPortal } from "react-dom";
import { Save } from "lucide-react";
import { useLocale } from "../../../lib/i18n.js";

interface PresetModalProps {
  isOpen: boolean;
  onClose: () => void;
  presetName: string;
  onPresetNameChange: (val: string) => void;
  onSave: () => void;
  errorMessage?: string;
}

export function PresetModal({
  isOpen,
  onClose,
  presetName,
  onPresetNameChange,
  onSave,
  errorMessage,
}: PresetModalProps) {
  const { t } = useLocale();

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto">
      <div className="bg-elevated border border-normal w-full max-w-md p-5 rounded-xl shadow-lg relative z-[51] mx-4 animate-in fade-in zoom-in-95 duration-150 text-strong">
        <h3 className="text-base font-bold text-strong mb-1 flex items-center gap-1.5">
          <Save size={16} className="text-primary shrink-0" />
          <span>{t.presetModalTitle}</span>
        </h3>
        <p className="text-xs text-neutral mb-3">{t.presetModalDesc}</p>

        <div className="flex flex-col gap-1.5 mb-4">
          <label className="text-xs text-neutral font-semibold">{t.presetNameLabel}</label>
          <input
            type="text"
            value={presetName}
            onChange={(e) => onPresetNameChange(e.target.value)}
            placeholder={t.presetNamePlaceholder}
            className="w-full bg-alternative border border-normal rounded-lg px-3 py-1.5 text-xs text-strong focus:outline-none focus:ring-1 focus:ring-primary"
            autoFocus
          />
          {errorMessage && (
            <p className="text-xs text-warn mt-1">
              {(t as Record<string, string>)[errorMessage] || errorMessage}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 bg-alternative hover:bg-alternative/80 text-neutral text-xs font-semibold rounded-lg transition"
          >
            {t.buttonCancel}
          </button>
          <button
            onClick={onSave}
            className="px-3.5 py-1.5 bg-primary hover:bg-primary/90 text-white text-xs font-semibold rounded-lg transition"
          >
            {t.buttonSave}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
