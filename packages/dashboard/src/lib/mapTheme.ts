/**
 * myhome 지도 컬러 테마 및 마커 디자인 시스템 표준 유틸리티
 */

export interface PriceTheme {
  tier: "p15" | "p10" | "p5" | "p0" | "none";
  bgClass: string;
  dotClass: string;
  textClass: string;
  hexColor: string;
  label: string;
}

/**
 * 가격(억)에 따른 통일 시맨틱 컬러 테마 반환
 * 종합 현황 피벗 히트맵 컬러 스펙트럼 (파랑 #6366f1 ➜ 보라 #8b5cf6 ➜ 로즈 #f43f5e ➜ 빨강 #ef4444)
 */
export function getPriceTheme(priceEok?: number | null): PriceTheme {
  if (priceEok === undefined || priceEok === null || isNaN(priceEok) || priceEok <= 0) {
    return {
      tier: "none",
      bgClass: "bg-slate-500 border-slate-400 shadow-slate-500/20",
      dotClass: "bg-slate-500",
      textClass: "text-white",
      hexColor: "#64748b",
      label: "가격 미등록",
    };
  }

  if (priceEok >= 15) {
    return {
      tier: "p15",
      bgClass: "bg-red-500 border-red-400 shadow-red-500/30",
      dotClass: "bg-red-500",
      textClass: "text-white",
      hexColor: "#ef4444",
      label: "15억↑",
    };
  }
  if (priceEok >= 10) {
    return {
      tier: "p10",
      bgClass: "bg-rose-500 border-rose-400 shadow-rose-500/25",
      dotClass: "bg-rose-500",
      textClass: "text-white",
      hexColor: "#f43f5e",
      label: "10억~15억",
    };
  }
  if (priceEok >= 5) {
    return {
      tier: "p5",
      bgClass: "bg-violet-500 border-violet-400 shadow-violet-500/20",
      dotClass: "bg-violet-500",
      textClass: "text-white",
      hexColor: "#8b5cf6",
      label: "5억~10억",
    };
  }
  return {
    tier: "p0",
    bgClass: "bg-indigo-500 border-indigo-400 shadow-indigo-500/20",
    dotClass: "bg-indigo-500",
    textClass: "text-white",
    hexColor: "#6366f1",
    label: "5억↓",
  };
}

/**
 * 범례(Legend) 표시용 가격 티어 목록 (종합 현황 히트맵 컬러 스펙트럼)
 */
export const MAP_PRICE_TIERS = [
  { label: "15억↑", hexColor: "#ef4444", dotClass: "bg-red-500" },
  { label: "10억~15억", hexColor: "#f43f5e", dotClass: "bg-rose-500" },
  { label: "5억~10억", hexColor: "#8b5cf6", dotClass: "bg-violet-500" },
  { label: "5억↓", hexColor: "#6366f1", dotClass: "bg-indigo-500" },
];

/**
 * 반경 원 표준 스타일
 */
export const MAP_CIRCLE_STYLES = {
  radius500: {
    strokeWeight: 1.5,
    strokeColor: "#6366f1",
    strokeOpacity: 0.7,
    strokeStyle: "dashed" as const,
    fillColor: "#8b5cf6",
    fillOpacity: 0.08,
  },
  radius1000: {
    strokeWeight: 1.5,
    strokeColor: "#64748b",
    strokeOpacity: 0.6,
    strokeStyle: "dashed" as const,
    fillColor: "#94a3b8",
    fillOpacity: 0.05,
  },
};

export interface ComplexMarkerOptions {
  name: string;
  priceEok?: number | null;
  priceText?: string;
  subText?: string;
  badgeText?: string;
  isSelected?: boolean;
  isDotOnly?: boolean;
  hasLeaderLine?: boolean;
}

/**
 * 단지 마커 HTML 문자열 생성 (풀 카드 및 미니 도트 핀)
 */
export function createComplexMarkerHtml(options: ComplexMarkerOptions): string {
  const {
    name,
    priceEok,
    priceText = priceEok !== undefined && priceEok !== null ? `${priceEok.toFixed(1)}억` : "-",
    subText,
    badgeText,
    isSelected = false,
    isDotOnly = false,
    hasLeaderLine = false,
  } = options;

  const theme = getPriceTheme(priceEok);

  if (isDotOnly) {
    const dotColor = isSelected ? "bg-amber-400 border-amber-300 ring-2 ring-amber-400" : `${theme.dotClass} border-white`;
    return `
      <div class="relative flex items-center justify-center p-1 group cursor-pointer">
        <div class="w-3 h-3 rounded-full ${dotColor} border-2 shadow-md hover:scale-125 transition-transform opacity-90 hover:opacity-100"></div>
        <div class="absolute bottom-full mb-1.5 hidden group-hover:flex flex-col items-center z-[60] whitespace-nowrap pointer-events-none">
          <div class="px-2.5 py-1 bg-slate-900/95 backdrop-blur-sm text-white text-[10px] font-bold rounded-lg shadow-xl border border-slate-700">
            ${name} ${priceText ? `(${priceText})` : ""} ${subText ? `· ${subText}` : ""}
          </div>
          <div class="w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-t-4 border-t-slate-900/95"></div>
        </div>
      </div>
    `;
  }

  // 풀 카드 마커
  let cardClass = `${theme.bgClass} ${theme.textClass} shadow-md hover:scale-105 transition-transform`;
  let arrowColor = theme.hexColor;

  if (isSelected) {
    cardClass = "bg-amber-500 border-amber-300 text-slate-950 shadow-xl ring-[3px] ring-white dark:ring-slate-900 scale-108 z-50 font-black";
    arrowColor = "#f59e0b";
  } else if (hasLeaderLine) {
    cardClass += " shadow-lg ring-1 ring-white/30";
  }

  return `
    <div class="flex flex-col items-center cursor-pointer select-none">
      <div class="px-2.5 py-1.5 rounded-xl border text-center flex flex-col items-center shadow-lg ${cardClass}">
        <span class="text-[10px] font-medium leading-tight max-w-[115px] truncate opacity-95">${name}</span>
        <div class="flex items-baseline gap-1 mt-0.5">
          <span class="text-xs font-black tracking-tight">${priceText}</span>
          ${subText ? `<span class="text-[9px] font-normal opacity-85">(${subText})</span>` : ""}
        </div>
        ${badgeText ? `<span class="text-[8px] font-bold px-1 py-0.2 bg-black/20 text-white/90 rounded mt-0.5">${badgeText}</span>` : ""}
      </div>
      <div class="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px]" style="border-top-color: ${arrowColor}"></div>
    </div>
  `;
}

/**
 * 지하철역 마커 HTML 문자열 생성
 */
export function createStationMarkerHtml(stationName: string): string {
  return `
    <div class="flex flex-col items-center select-none cursor-pointer">
      <div class="bg-slate-900 dark:bg-slate-800 border-2 border-indigo-400 text-white font-black text-xs px-3 py-1.5 rounded-full shadow-xl flex items-center gap-1.5 ring-2 ring-indigo-500/20">
        <span class="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
        <span class="truncate max-w-[120px]">${stationName}</span>
      </div>
      <div class="w-0.5 h-3 bg-indigo-500 shadow-md"></div>
    </div>
  `;
}
