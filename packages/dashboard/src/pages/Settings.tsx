import React, { useState, useEffect } from "react";
import { Database, Settings, ShieldAlert, CheckCircle, Save, ChevronRight } from "lucide-react";
import { useBreakpoint } from "../useBreakpoint";
import { SectionCard } from "../components/SectionCard";
import { classNames } from "../lib/format";
import type { DashboardState } from "../types";
import packageJson from "../../package.json";
import { loadSystemConfig, saveSystemConfig } from "../api";
import { copy } from "../locales/ko";

const locale = "ko";
const t = copy[locale];

export function SettingsPage({ state, onChanged }: { state: DashboardState | undefined; onChanged?: () => void }) {
  const { isMobile } = useBreakpoint();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // 설정 폼 필드
  const [telegramBotToken, setTelegramBotToken] = useState("");
  const [telegramChatId, setTelegramChatId] = useState("");
  const [kakaoRestApiKey, setKakaoRestApiKey] = useState("");
  const [kakaoJavascriptKey, setKakaoJavascriptKey] = useState("");
  const [kakaoNativeAppKey, setKakaoNativeAppKey] = useState("");
  const [jusoConfmKey, setJusoConfmKey] = useState("");
  const [dataGoKrApiKey, setDataGoKrApiKey] = useState("");

  // 설정값 불러오기
  const fetchConfig = async () => {
    setLoading(true);
    try {
      const data = await loadSystemConfig();
      setTelegramBotToken(data.telegramBotToken || "");
      setTelegramChatId(data.telegramChatId || "");
      setKakaoRestApiKey(data.kakaoRestApiKey || "");
      setKakaoJavascriptKey(data.kakaoJavascriptKey || "");
      setKakaoNativeAppKey(data.kakaoNativeAppKey || "");
      setJusoConfmKey(data.jusoConfmKey || "");
      setDataGoKrApiKey(data.dataGoKrApiKey || "");
    } catch (err: any) {
      console.error("Failed to load system config:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  // 설정값 저장하기
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg("");
    setErrorMsg("");
    try {
      await saveSystemConfig({
        telegramBotToken,
        telegramChatId,
        kakaoRestApiKey,
        kakaoJavascriptKey,
        kakaoNativeAppKey,
        jusoConfmKey,
        dataGoKrApiKey,
      });
      setSuccessMsg("시스템 설정이 성공적으로 저장 및 적용되었습니다.");
      setTimeout(() => setSuccessMsg(""), 3000);
      if (onChanged) onChanged();
    } catch (err: any) {
      setErrorMsg(err.message || "설정 저장 실패");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {!isMobile && (
        <header className="flex flex-col gap-1">
          <h2 className="text-2xl font-black text-strong tracking-tight mt-1 flex items-center gap-2">
            <Settings className="text-primary h-6 w-6" />
            {t.settingsTitle}
          </h2>
          <p className="text-sm text-neutral">{t.settingsSubtitle}</p>
        </header>
      )}

      {/* 1. 연동 상태 요약 카드 */}
      <SectionCard
        title={t.systemStatusTitle}
        right={<Database className="h-4 w-4 text-primary" />}
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-y-4 gap-x-4">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-neutral uppercase">데이터 소스</p>
            <p className="text-xs font-bold text-strong">PlayMCP</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-neutral uppercase">공공데이터 실거래 API</p>
            <p className={classNames("text-xs font-bold", state?.config.dataGoKrConfigured ? "text-emerald-500" : "text-warn")}>
              {state?.config.dataGoKrConfigured ? "활성 (data.go.kr)" : "미설정 (수집 제한)"}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-neutral uppercase">텔레그램 알림</p>
            <p className={classNames("text-xs font-bold", state?.config.telegramConfigured ? "text-emerald-500" : "text-warn")}>
              {state?.config.telegramConfigured ? "활성" : "점검 필요"}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-neutral uppercase">카카오 REST API</p>
            <p className={classNames("text-xs font-bold", state?.config.kakaoConfigured ? "text-emerald-500" : "text-neutral")}>
              {state?.config.kakaoConfigured ? "활성 (검색)" : "미설정"}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-neutral uppercase">카카오 JS API</p>
            <p className={classNames("text-xs font-bold", state?.config.kakaoJavascriptConfigured ? "text-emerald-500" : "text-neutral")}>
              {state?.config.kakaoJavascriptConfigured ? "활성 (지도)" : "미설정"}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-neutral uppercase">카카오 Native API</p>
            <p className={classNames("text-xs font-bold", state?.config.kakaoNativeAppConfigured ? "text-emerald-500" : "text-neutral")}>
              {state?.config.kakaoNativeAppConfigured ? "활성" : "미설정"}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-neutral uppercase">도로명주소 API</p>
            <p className={classNames("text-xs font-bold", state?.config.jusoConfigured ? "text-emerald-500" : "text-neutral")}>
              {state?.config.jusoConfigured ? "활성 (juso.go.kr)" : "미설정"}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-neutral uppercase">현재 버전</p>
            <p className="text-xs font-bold text-strong">v{packageJson.version}</p>
          </div>
        </div>
        <p className="text-[10px] text-assistive mt-4">
          * 주소 검색 시 <strong>카카오 Local(REST) API</strong>가 기본(우선) 사용되며, 미설정 시 <strong>행안부 도로명주소 API</strong>로 대체 자동 전환(Fallback)됩니다. 두 API가 모두 미설정된 경우 <strong>PlayMCP</strong> 내장 검색 모듈로 작동합니다.
        </p>
      </SectionCard>

      {/* 2. API 설정 에디터 폼 */}
      <SectionCard
        title="외부 API 연동 설정"
        right={<Settings className="h-4 w-4 text-primary animate-spin-slow" />}
      >
        {loading ? (
          <div className="flex justify-center py-6">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            {successMsg && (
              <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs px-4 py-3 rounded-lg max-w-2xl">
                <CheckCircle size={14} />
                <span>{successMsg}</span>
              </div>
            )}
            {errorMsg && (
              <div className="flex items-center gap-2 bg-warn/10 border border-warn/30 text-warn text-xs px-4 py-3 rounded-lg max-w-2xl">
                <ShieldAlert size={14} />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 1. 실거래 수집 설정 (공공데이터포털) */}
              <div className="space-y-4 p-4 rounded-xl border border-normal bg-normal/30 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-strong border-b border-normal pb-2 flex items-center gap-1.5">
                    🏢 공공데이터 실거래 수집 API
                  </h3>
                  <p className="text-[11px] text-neutral mt-1">국토교통부 아파트 실거래 데이터 수집 및 동기화에 필요한 최상위 수집 키입니다.</p>
                  
                  <div className="flex flex-col gap-1.5 mt-4">
                    <label className="text-xs font-semibold text-neutral">공공데이터 실거래 API 키 (data.go.kr Key)</label>
                    <input
                      type="password"
                      value={dataGoKrApiKey}
                      onChange={(e) => setDataGoKrApiKey(e.target.value)}
                      placeholder="공공데이터포털 실거래 API 인증키 입력"
                      className="w-full bg-normal border border-normal rounded-lg px-3 py-2 text-xs text-strong placeholder-assistive focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-assistive mt-4 border-t border-normal/50 pt-2">
                  * <a href="https://www.data.go.kr/" target="_blank" rel="noreferrer" className="text-primary hover:underline font-semibold">공공데이터포털</a> 회원가입 후 '국토교통부 아파트실거래가 정보 조회 서비스'를 신청하여 활용 가능한 일반 인증키(Encoding/Decoding)를 복사해 붙여넣습니다.
                </p>
              </div>

              {/* 2. 주소 및 지도 검색 설정 (카카오 & 도로명주소) */}
              <div className="space-y-4 p-4 rounded-xl border border-normal bg-normal/30 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-strong border-b border-normal pb-2 flex items-center gap-1.5">
                    🗺️ 지도 및 주소 검색 API
                  </h3>
                  <p className="text-[11px] text-neutral mt-1">지역/단지명 검색과 웹 지도 렌더링에 사용되는 다양한 플랫폼 API 키들입니다.</p>

                  <div className="flex flex-col gap-1.5 mt-4">
                    <label className="text-xs font-semibold text-neutral">카카오 REST API 키 (Kakao REST API Key)</label>
                    <input
                      type="password"
                      value={kakaoRestApiKey}
                      onChange={(e) => setKakaoRestApiKey(e.target.value)}
                      placeholder="카카오 REST API 키 입력 (주소 검색용)"
                      className="w-full bg-normal border border-normal rounded-lg px-3 py-2 text-xs text-strong placeholder-assistive focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5 mt-3">
                    <label className="text-xs font-semibold text-neutral">카카오 JavaScript 키 (Kakao JS Key)</label>
                    <input
                      type="password"
                      value={kakaoJavascriptKey}
                      onChange={(e) => setKakaoJavascriptKey(e.target.value)}
                      placeholder="카카오 JavaScript 키 입력 (지도 로드용)"
                      className="w-full bg-normal border border-normal rounded-lg px-3 py-2 text-xs text-strong placeholder-assistive focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5 mt-3">
                    <label className="text-xs font-semibold text-neutral">카카오 네이티브 앱 키 (Kakao Native Key)</label>
                    <input
                      type="password"
                      value={kakaoNativeAppKey}
                      onChange={(e) => setKakaoNativeAppKey(e.target.value)}
                      placeholder="카카오 네이티브 앱 키 입력 (앱 연동용)"
                      className="w-full bg-normal border border-normal rounded-lg px-3 py-2 text-xs text-strong placeholder-assistive focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5 mt-3">
                    <label className="text-xs font-semibold text-neutral">도로명주소 검색 API 키 (Juso Key - juso.go.kr)</label>
                    <input
                      type="password"
                      value={jusoConfmKey}
                      onChange={(e) => setJusoConfmKey(e.target.value)}
                      placeholder="행정안전부 도로명주소 승인 키 입력"
                      className="w-full bg-normal border border-normal rounded-lg px-3 py-2 text-xs text-strong placeholder-assistive focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-assistive mt-4 border-t border-normal/50 pt-2">
                  * 각 키는 <a href="https://developers.kakao.com/" target="_blank" rel="noreferrer" className="text-primary hover:underline font-semibold">카카오 디벨로퍼스</a>와 <a href="https://business.juso.go.kr/" target="_blank" rel="noreferrer" className="text-primary hover:underline font-semibold">행안부 도로명주소 개발자센터</a>에서 각각 애플리케이션 등록 후 발급받을 수 있습니다.
                </p>
              </div>

              {/* 3. 텔레그램 설정 */}
              <div className="space-y-4 p-4 rounded-xl border border-normal bg-normal/30 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-strong border-b border-normal pb-2 flex items-center gap-1.5">
                    📬 텔레그램 알림 채널
                  </h3>
                  <p className="text-[11px] text-neutral mt-1">아파트 실거래가 기준 조건 충족 시 실시간 텔레그램 메신저 알림을 전달하는 키입니다.</p>
                  
                  <div className="flex flex-col gap-1.5 mt-4">
                    <label className="text-xs font-semibold text-neutral">텔레그램 봇 토큰 (Bot Token)</label>
                    <input
                      type="password"
                      value={telegramBotToken}
                      onChange={(e) => setTelegramBotToken(e.target.value)}
                      placeholder="텔레그램 봇 API 토큰 입력"
                      className="w-full bg-normal border border-normal rounded-lg px-3 py-2 text-xs text-strong placeholder-assistive focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5 mt-3">
                    <label className="text-xs font-semibold text-neutral">텔레그램 대화방 ID (Chat ID)</label>
                    <input
                      type="text"
                      value={telegramChatId}
                      onChange={(e) => setTelegramChatId(e.target.value)}
                      placeholder="알림을 수신할 Chat ID 입력 (예: -100...)"
                      className="w-full bg-normal border border-normal rounded-lg px-3 py-2 text-xs text-strong placeholder-assistive focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-assistive mt-4 border-t border-normal/50 pt-2">
                  * <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-primary hover:underline font-semibold">@BotFather</a>를 통해 봇을 생성하고 토큰을 획득합니다. 대화방 ID는 수신 그룹/채널에 봇을 참여시킨 뒤 <a href="https://t.me/getidsbot" target="_blank" rel="noreferrer" className="text-primary hover:underline font-semibold">@getidsbot</a> 등을 호출해 확인합니다.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2 max-w-full">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-primary hover:bg-primary/80 text-white text-xs font-bold rounded-lg shadow-lg shadow-primary/20 transition disabled:opacity-50"
              >
                <Save size={14} />
                <span>{saving ? "저장 중..." : "설정 저장"}</span>
              </button>
            </div>
          </form>
        )}
      </SectionCard>
    </div>
  );
}
