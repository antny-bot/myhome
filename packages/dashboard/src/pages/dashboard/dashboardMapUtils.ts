import { classNames } from "../../lib/format.js";
import type { RegionSummary } from "./RegionCollectModal.js";

interface CreateMarkerOptions {
  region: RegionSummary;
  isDotOnly: boolean;
  hasLeaderLine: boolean;
  isAdmin: boolean;
  onRegionClick: (lawdCode: string, regionName: string) => void;
  onCollectClick: (lawdCode: string, regionName: string, existingRegion: RegionSummary) => void;
}

export function createRegionMarkerElement({
  region,
  isDotOnly,
  hasLeaderLine,
  isAdmin,
  onRegionClick,
  onCollectClick,
}: CreateMarkerOptions) {
  const content = document.createElement("div");
  content.style.pointerEvents = "auto";
  const overlayZIndex = isDotOnly ? 5 : hasLeaderLine ? 30 : 20;
  content.style.zIndex = String(overlayZIndex);

  const shortName = region.displayName.split(" ").pop() || region.displayName;

  if (isDotOnly) {
    content.className =
      "select-none pointer-events-auto transition-transform hover:scale-125 duration-150 cursor-pointer group";
    content.innerHTML = `
      <div class="relative flex items-center justify-center p-1">
        <div class="w-3.5 h-3.5 rounded-full bg-indigo-600 border-2 border-white shadow-md opacity-80 hover:opacity-100"></div>
        <div class="absolute bottom-full mb-1 hidden group-hover:flex flex-col items-center z-[60] whitespace-nowrap">
          <div class="px-2.5 py-1 bg-slate-900 text-white text-[11px] font-bold rounded-lg shadow-xl border border-slate-700">
            ${shortName} (${region.transactionCount.toLocaleString()}건)
          </div>
          <div class="w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-t-4 border-t-slate-900"></div>
        </div>
      </div>
    `;
    content.onclick = (e) => {
      e.stopPropagation();
      onRegionClick(region.lawdCode, region.displayName);
    };
  } else {
    content.className = classNames(
      "rounded-2xl border border-normal bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg shadow-md px-3.5 py-2 text-center min-w-[125px] select-none transition-all hover:scale-105 hover:border-primary active:scale-95 duration-200 cursor-pointer",
      hasLeaderLine ? "shadow-lg border-indigo-400" : ""
    );

    content.onclick = (e) => {
      e.stopPropagation();
      onRegionClick(region.lawdCode, region.displayName);
    };

    const titleEl = document.createElement("div");
    titleEl.className =
      "text-xs font-black text-strong whitespace-nowrap overflow-hidden text-ellipsis flex items-center justify-center gap-1.5";
    const countText = `${region.transactionCount.toLocaleString()}건`;

    if (isAdmin) {
      titleEl.innerHTML = `<span>${shortName}</span><span class="text-primary font-extrabold text-[10.5px]">${countText}</span>`;
      const collectIconContainer = document.createElement("span");
      collectIconContainer.className =
        "inline-flex items-center justify-center p-0.5 rounded hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer shrink-0 ml-1";
      collectIconContainer.style.pointerEvents = "auto";
      collectIconContainer.title = "집계 관리 및 수집 기간 연장";
      collectIconContainer.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-database text-neutral hover:text-primary"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/></svg>`;
      collectIconContainer.onclick = (e) => {
        e.stopPropagation();
        onCollectClick(region.lawdCode, region.displayName, region);
      };
      titleEl.appendChild(collectIconContainer);
    } else {
      titleEl.innerHTML = `<span>${shortName}</span><span class="text-primary font-extrabold text-[10.5px]">${countText}</span>`;
    }

    const periodEl = document.createElement("div");
    periodEl.className = "text-[9px] text-assistive font-mono mt-1 whitespace-nowrap";
    if (region.minDealDate && region.maxDealDate) {
      const formatMonth = (d: string) => d.substring(2, 7).replace("-", ".");
      periodEl.innerText = `${formatMonth(region.minDealDate)} ~ ${formatMonth(region.maxDealDate)}`;
    } else {
      periodEl.innerText = "-";
    }

    content.appendChild(titleEl);
    content.appendChild(periodEl);
  }

  return { content, overlayZIndex };
}
