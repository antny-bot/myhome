import React, { useState } from "react";
import { Download, CheckCircle2, Smartphone } from "lucide-react";
import { usePWA } from "../../hooks/usePWA";
import { useLocale } from "../../lib/i18n";
import { useToast } from "../ui/Toast";

interface PWAInstallButtonProps {
  className?: string;
  variant?: "button" | "badge" | "menuItem";
}

export function PWAInstallButton({ className = "", variant = "button" }: PWAInstallButtonProps) {
  const { isStandalone, isInstallable, isIOS, promptInstall } = usePWA();
  const { t } = useLocale();
  const toast = useToast();
  const [isInstalling, setIsInstalling] = useState(false);

  if (isStandalone) {
    if (variant === "badge" || variant === "menuItem") {
      return (
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ${className}`}>
          <CheckCircle2 size={12} />
          <span>{t.pwaRunningStandalone || "단독 앱 실행 중"}</span>
        </div>
      );
    }
    return null;
  }

  // 데스크톱 브라우저에서 설치 지원 안 되거나 모바일 사파리 외 미지원 브라우저면 렌더링 안 함
  if (!isInstallable && !isIOS) {
    return null;
  }

  const handleInstall = async () => {
    if (isIOS) {
      alert(t.pwaIosGuideDesc || "Safari 공유 버튼을 누른 후 '홈 화면에 추가'를 선택해 주세요.");
      return;
    }

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

  if (variant === "menuItem") {
    return (
      <button
        type="button"
        onClick={handleInstall}
        disabled={isInstalling}
        className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-primary hover:bg-primary/10 transition-colors text-app-body-sm font-medium ${className}`}
      >
        <Smartphone size={15} />
        <span>{t.pwaInstallApp || "앱 설치"}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleInstall}
      disabled={isInstalling}
      className={`inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-primary-hover active:scale-95 transition-all ${className}`}
      title={t.pwaInstallApp || "앱 설치"}
    >
      <Download size={13} />
      <span>{t.pwaInstallApp || "앱 설치"}</span>
    </button>
  );
}
