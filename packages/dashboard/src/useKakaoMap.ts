/// <reference types="vite/client" />
import { useEffect, useState } from "react";

declare global {
  interface Window {
    // biome-ignore lint/suspicious/noExplicitAny: Kakao Maps API uses global namespaces
    kakao: any;
  }
}

// 싱글톤 API 키 로드 프로미스 & 캐시
let cachedApiKey: string | null = null;
let apiKeyPromise: Promise<string> | null = null;

function getApiKey(): Promise<string> {
  if (cachedApiKey !== null) {
    return Promise.resolve(cachedApiKey);
  }
  if (apiKeyPromise !== null) {
    return apiKeyPromise;
  }

  apiKeyPromise = fetch("/api/config")
    .then((res) => {
      if (res.ok) return res.json();
      throw new Error("Failed to fetch config from server");
    })
    .then((data) => {
      const key = data.kakaoJavascriptKey || import.meta.env.VITE_KAKAO_MAP_API_KEY || "";
      cachedApiKey = key;
      return key;
    })
    .catch((err) => {
      console.warn("[useKakaoMap] 백엔드 설정 가져오기 실패, 로컬 환경변수 사용 시도:", err);
      const key = import.meta.env.VITE_KAKAO_MAP_API_KEY || "";
      cachedApiKey = key;
      return key;
    });

  return apiKeyPromise;
}

// 스크립트 로드 싱글톤 프로미스
let scriptLoadPromise: Promise<void> | null = null;

function loadKakaoScript(apiKey: string): Promise<void> {
  if (scriptLoadPromise !== null) {
    return scriptLoadPromise;
  }

  scriptLoadPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&libraries=services&autoload=false`;
    script.async = true;

    script.onload = () => {
      window.kakao.maps.load(() => {
        resolve();
      });
    };

    script.onerror = (err) => {
      scriptLoadPromise = null; // 실패 시 재시도 가능하도록 초기화
      reject(err);
    };

    document.head.appendChild(script);
  });

  return scriptLoadPromise;
}

export function useKakaoMap() {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    // 이미 전역 인스턴스가 존재하고 로드 완료된 상태인 경우
    if (window.kakao && window.kakao.maps && window.kakao.maps.LatLng) {
      setLoaded(true);
      return;
    }

    let isMounted = true;

    async function init() {
      try {
        const apiKey = await getApiKey();
        if (!isMounted) return;

        if (!apiKey) {
          console.error("[useKakaoMap] 카카오 지도 API 키가 설정되지 않았습니다.");
          setError(true);
          return;
        }

        await loadKakaoScript(apiKey);
        if (isMounted) {
          setLoaded(true);
        }
      } catch (err) {
        console.error("[useKakaoMap] 카카오 지도 SDK 로드 중 에러가 발생했습니다:", err);
        if (isMounted) {
          setError(true);
        }
      }
    }

    void init();

    return () => {
      isMounted = false;
    };
  }, []);

  return { loaded, error };
}
