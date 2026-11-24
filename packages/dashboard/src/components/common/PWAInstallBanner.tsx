import React, { useState } from "react";
import { Download, X, Share2, PlusSquare, Check } from "lucide-react";
import { usePWA } from "../../hooks/usePWA";
import { useLocale } from "../../lib/i18n";
import { useToast } from "../ui/Toast";

export function PWAInstallBanner() {
  const { isStandalone, isInstallable, isIOS, showBanner, promptInstall, dismissPrompt } = usePWA();
  const { t } = useLocale();
  const toast = useToast();
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  // 이미 독립 설치 모드(standalone)로 실행 중이거나 배너 표시 조건이 아니면 렌더링 안 함
  if (isStandalone || !showBanner) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }

    if (!isInstallable) return;

    try {
      setIsInstalling(true);
      const installed = await promptInstall();
      if (installed) {
        toast.success(t.pwaInstalledSuccess || "MyHome 앱이 성공적으로 설치되었습니다.");
      }
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <>
      <div className="fixed bottom-16 md:bottom-6 right-3 md:right-6 z-50 max-w-sm w-[calc(100vw-1.5rem)] md:w-96 rounded-2xl border border-primary/20 bg-elevated/95 p-4 shadow-xl backdrop-blur-md transition-all animate-fade-in-up">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center p-1.5 text-primary">
            <img src="/logo.svg" alt="MyHome" className="h-full w-full object-contain rounded-lg" />
          </div>

          <div className="flex-1 min-w-0 pr-1">
            <h4 className="text-app-body font-bold text-strong truncate">
              {t.pwaInstallBannerTitle || "홈 화면에 MyHome 설치"}
            </h4>
            <p className="mt-0.5 text-xs text-neutral leading-relaxed line-clamp-2">
              {t.pwaInstallBannerDesc || "단독 앱으로 빠르게 실행하고 실거래가 분석을 더 편리하게 이용하세요."}
            </p>

            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={handleInstallClick}
                disabled={isInstalling}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-primary-hover active:scale-95 transition-all"
              >
                <Download size={13} />
                <span>{t.pwaInstallApp || "앱 설치"}</span>
              </button>

              <button
                type="button"
                onClick={() => dismissPrompt(7)}
                className="rounded-xl px-2.5 py-1.5 text-xs font-medium text-neutral hover:bg-alternative hover:text-strong transition-colors"
              >
                {t.pwaInstallPromptDismiss || "나중에"}
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => dismissPrompt(7)}
            className="shrink-0 rounded-lg p-1 text-neutral hover:bg-alternative hover:text-strong transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* iOS 홈 화면 추가 가이드 모달 */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-elevated p-6 shadow-2xl border border-normal">
            <div className="flex items-center justify-between pb-3 border-b border-normal">
              <div className="flex items-center gap-2.5">
                <img src="/logo.svg" alt="MyHome" className="h-7 w-7 rounded-lg" />
                <h3 className="font-bold text-strong text-app-body">
                  {t.pwaIosGuideTitle || "iOS 홈 화면에 추가하기"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSModal(false)}
                className="rounded-full p-1 text-neutral hover:bg-alternative"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-3.5 text-xs text-neutral leading-relaxed">
              <div className="flex items-start gap-3 rounded-xl bg-alternative/60 p-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white">
                  1
                </span>
                <p className="flex-1">
                  Safari 브라우저 하단의{" "}
                  <strong className="text-strong inline-flex items-center gap-1 font-semibold">
                    <Share2 size={13} className="text-primary inline" /> 공유 버튼
                  </strong>
                  을 탭하세요.
                </p>
              </div>

              <div className="flex items-start gap-3 rounded-xl bg-alternative/60 p-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white">
                  2
                </span>
                <p className="flex-1">
                  메뉴를 아래로 스크롤하여{" "}
                  <strong className="text-strong inline-flex items-center gap-1 font-semibold">
                    <PlusSquare size={13} className="text-primary inline" /> 홈 화면에 추가
                  </strong>
                  를 선택하세요.
                </p>
              </div>

              <div className="flex items-start gap-3 rounded-xl bg-alternative/60 p-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white">
                  3
                </span>
                <p className="flex-1">
                  우측 상단의 <strong className="text-strong font-semibold">추가</strong>를 누르면 홈 화면에 단독 앱으로 설치됩니다.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowIOSModal(false);
                dismissPrompt(7);
              }}
              className="mt-5 w-full rounded-xl bg-primary py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-primary-hover active:scale-95 transition-all text-center"
            >
              확인
            </button>
          </div>
        </div>
      )}
    </>
  );
}
