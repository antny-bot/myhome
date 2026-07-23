import React, { useState } from "react";
import { X, Send, Key, MessageSquare, HelpCircle, Copy, Check, ExternalLink } from "lucide-react";
import { copy } from "../locales/ko";
import { classNames } from "../lib/format";

interface TelegramGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  locale?: "ko" | "en";
}

export function TelegramGuideModal({ isOpen, onClose, locale = "ko" }: TelegramGuideModalProps) {
  const t = copy[locale] || copy["ko"];
  const [copiedText, setCopiedText] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => {
      setCopiedText(null);
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200">
      {/* Backdrop click to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative w-full max-w-lg bg-elevated border border-normal rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <header className="flex items-center justify-between border-b border-normal px-5 py-4 bg-alternative/30 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-primary/10 text-primary rounded-lg">
              <Send className="h-5 w-5 transform rotate-[15deg] -translate-y-0.5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-strong tracking-tight">{t.telegramGuideTitle}</h3>
              <p className="text-[10px] text-neutral mt-0.5">{t.telegramGuideSubtitle}</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1 rounded-lg hover:bg-alternative text-neutral hover:text-strong transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {/* Content - Scrollable */}
        <div className="p-5 overflow-y-auto space-y-6 scrollbar-thin">
          
          {/* Vertical Timeline Steps */}
          <div className="relative border-l-2 border-primary/20 ml-3.5 pl-6 space-y-6">
            
            {/* Step 1 */}
            <div className="relative">
              {/* Timeline Indicator */}
              <div className="absolute -left-[35px] top-0 w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white text-[11px] font-black shadow-md shadow-primary/20">
                1
              </div>
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-strong flex items-center gap-1.5">
                  <Key className="h-3.5 w-3.5 text-primary shrink-0" />
                  {t.telegramStep1}
                </h4>
                <p className="text-[11px] text-neutral leading-relaxed">
                  {t.telegramStep1Desc}
                </p>
                <div className="flex flex-col sm:flex-row gap-2 mt-2">
                  <a 
                    href="https://t.me/BotFather" 
                    target="_blank" 
                    rel="noreferrer" 
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-primary text-white text-[10px] font-bold rounded-lg hover:opacity-90 transition-opacity"
                  >
                    <span>{t.telegramOpenBotFather}</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  <button
                    onClick={() => handleCopy("/newbot", "newbot")}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 border border-normal bg-normal hover:bg-alternative text-strong text-[10px] font-bold rounded-lg transition-colors"
                  >
                    <code className="text-primary text-[10px] font-bold">/newbot</code>
                    {copiedText === "newbot" ? (
                      <Check className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <Copy className="h-3 w-3 text-neutral" />
                    )}
                    <span>{copiedText === "newbot" ? t.telegramCopied : t.telegramCopy}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative">
              {/* Timeline Indicator */}
              <div className="absolute -left-[35px] top-0 w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white text-[11px] font-black shadow-md shadow-primary/20">
                2
              </div>
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-strong flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5 text-primary shrink-0" />
                  {t.telegramStep2}
                </h4>
                <p className="text-[11px] text-neutral leading-relaxed">
                  {t.telegramStep2Desc}
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative">
              {/* Timeline Indicator */}
              <div className="absolute -left-[35px] top-0 w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white text-[11px] font-black shadow-md shadow-primary/20">
                3
              </div>
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-strong flex items-center gap-1.5">
                  <HelpCircle className="h-3.5 w-3.5 text-primary shrink-0" />
                  {t.telegramStep3}
                </h4>
                <p className="text-[11px] text-neutral leading-relaxed">
                  {t.telegramStep3Desc}
                </p>
                <div className="flex flex-col sm:flex-row gap-2 mt-2">
                  <a 
                    href="https://t.me/getidsbot" 
                    target="_blank" 
                    rel="noreferrer" 
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-primary text-white text-[10px] font-bold rounded-lg hover:opacity-90 transition-opacity"
                  >
                    <span>{t.telegramOpenGetIdsBot}</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  <button
                    onClick={() => handleCopy("/start", "start")}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 border border-normal bg-normal hover:bg-alternative text-strong text-[10px] font-bold rounded-lg transition-colors"
                  >
                    <code className="text-primary text-[10px] font-bold">/start</code>
                    {copiedText === "start" ? (
                      <Check className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <Copy className="h-3 w-3 text-neutral" />
                    )}
                    <span>{copiedText === "start" ? t.telegramCopied : t.telegramCopy}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div className="relative">
              {/* Timeline Indicator */}
              <div className="absolute -left-[35px] top-0 w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white text-[11px] font-black shadow-md shadow-primary/20">
                4
              </div>
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-strong flex items-center gap-1.5">
                  <Send className="h-3.5 w-3.5 text-primary shrink-0" />
                  {t.telegramStep4}
                </h4>
                <p className="text-[11px] text-neutral leading-relaxed">
                  {t.telegramStep4Desc}
                </p>
                <div className="mt-3 p-3 bg-primary/5 border border-primary/10 rounded-xl">
                  <p className="text-[10px] text-primary leading-normal flex items-start gap-1">
                    <span className="font-bold shrink-0">💡 {locale === "ko" ? "안내" : "Notice"}:</span>
                    <span>
                      {locale === "ko" 
                        ? "발급받은 봇 토큰과 대화방 ID는 [환경 설정] > [외부 API 연동 설정] 메뉴에서 개인별로 저장하여 적용하실 수 있습니다."
                        : "You can enter and save the obtained Bot Token and Chat ID under the [Settings] > [API Settings] menu."}
                    </span>
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-normal px-5 py-3 bg-alternative/30 flex justify-end shrink-0">
          <button 
            onClick={onClose} 
            className="px-4 py-2 bg-strong hover:opacity-90 text-normal text-xs font-bold rounded-lg transition-opacity"
          >
            {t.telegramClose}
          </button>
        </footer>
      </div>
    </div>
  );
}
