/// <reference types="vite/client" />
import { useEffect, useState } from "react";

declare global {
  interface Window {
    // biome-ignore lint/suspicious/noExplicitAny: Kakao Maps API uses global namespaces
    kakao: any;
  }
}

let isScriptLoading = false;
const loadCallbacks = new Set<() => void>();

export function useKakaoMap() {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    // 이미 로드된 경우
    if (window.kakao && window.kakao.maps && window.kakao.maps.LatLng) {
      setLoaded(true);
      return;
    }

    const apiKey = import.meta.env.VITE_KAKAO_MAP_API_KEY;
    if (!apiKey) {
      console.error("[useKakaoMap] VITE_KAKAO_MAP_API_KEY가 환경변수에 정의되어 있지 않습니다.");
      setError(true);
      return;
    }

    const handleLoadSuccess = () => {
      window.kakao.maps.load(() => {
        setLoaded(true);
      });
    };

    // 로드 콜백 등록
    loadCallbacks.add(handleLoadSuccess);

    if (isScriptLoading) {
      return () => {
        loadCallbacks.delete(handleLoadSuccess);
      };
    }

    isScriptLoading = true;
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&libraries=services&autoload=false`;
    script.async = true;

    script.onload = () => {
      isScriptLoading = false;
      for (const cb of loadCallbacks) {
        cb();
      }
      loadCallbacks.clear();
    };

    script.onerror = () => {
      isScriptLoading = false;
      setError(true);
      loadCallbacks.clear();
      console.error("[useKakaoMap] 카카오 지도 SDK 스크립트 로드 중 에러가 발생했습니다.");
    };

    document.head.appendChild(script);

    return () => {
      loadCallbacks.delete(handleLoadSuccess);
    };
  }, []);

  return { loaded, error };
}
