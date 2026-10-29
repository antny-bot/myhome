import React from "react";
import { createPortal } from "react-dom";
import { X, HelpCircle } from "lucide-react";
import { useLocale } from "../../../lib/i18n.js";

interface InfraModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InfraModal({ isOpen, onClose }: InfraModalProps) {
  const { t } = useLocale();

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-elevated border border-normal rounded-2xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* 헤더 */}
        <div className="p-4 border-b border-normal flex items-center justify-between">
          <h3 className="font-bold text-strong text-sm flex items-center gap-2">
            <HelpCircle size={16} className="text-primary" />
            <span>{t.infraModalTitle}</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral hover:text-strong p-1 rounded-lg hover:bg-alternative transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* 본문 */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs text-neutral leading-relaxed">
          <p className="bg-alternative/60 p-3 rounded-xl border border-normal text-strong font-medium">
            {t.infraModalIntro}
          </p>

          <div className="space-y-2">
            <h4 className="font-bold text-strong text-xs text-primary">
              {t.infraModalFormulaTitle}
            </h4>
            <p>{t.infraModalFormulaDesc}</p>
            <div className="p-2.5 bg-normal rounded-lg font-mono text-[11px] text-strong">
              {t.infraModalFormulaMath}
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-strong text-xs text-primary">
              {t.infraModalRadiusTitle}
            </h4>
            <p>{t.infraModalRadiusDesc}</p>
            <ul className="list-disc list-inside space-y-1 pl-1 text-[11px]">
              <li>{t.infraModalSubwayDesc}</li>
              <li>{t.infraModalSchoolDesc}</li>
              <li>{t.infraModalHospitalDesc}</li>
              <li>{t.infraModalMartDesc}</li>
              <li>{t.infraModalPharmacyDesc}</li>
              <li>{t.infraModalConvDesc}</li>
              <li>{t.infraModalNaturalDesc}</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-strong text-xs text-primary">
              {t.infraModalWeightTitle}
            </h4>
            <p>{t.infraModalWeightDesc}</p>
            <p className="font-semibold text-strong">{t.infraModalWeightList}</p>
          </div>
        </div>

        {/* 푸터 */}
        <div className="p-4 border-t border-normal flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl text-xs transition"
          >
            {t.close || "닫기"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
