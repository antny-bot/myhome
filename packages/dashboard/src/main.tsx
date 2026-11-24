import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";
import { registerSW } from "virtual:pwa-register";
import { applySavedDisplayPreferences } from "./lib/displayPreferences";
import { LocaleProvider } from "./LocaleProvider";
import { ToastProvider } from "./components/ui/Toast";

// PWA Service Worker 등록 (단독 실행 및 백그라운드 캐싱/자동 업데이트 지원)
if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  registerSW({
    immediate: true,
    onNeedRefresh() {
      console.log("[PWA] New version available");
    },
    onOfflineReady() {
      console.log("[PWA] App is ready for standalone and offline use");
    },
  });
}

// 초기 화면 표시(폰트, 크기, 주조색) 환경 설정 적용
applySavedDisplayPreferences();

// 초기 테마 설정 적용 (다크 모드 여부 감지)
const savedTheme = localStorage.getItem('theme') || 'system';
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
const isDark = savedTheme === 'dark' || (savedTheme === 'system' && prefersDark);
document.documentElement.classList.toggle('dark', isDark);
if (isDark) {
  document.documentElement.classList.remove('light');
} else {
  document.documentElement.classList.add('light');
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <LocaleProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </LocaleProvider>
  </React.StrictMode>
);
