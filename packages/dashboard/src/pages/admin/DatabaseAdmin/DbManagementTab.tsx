import React from "react";
import { AlertCircle, Building2, MapPin, RefreshCw } from "lucide-react";
import { RegionSearchInput } from "../../../components/RegionSearchInput.js";
import { SectionCard } from "../../../components/SectionCard.js";
import { classNames } from "../../../lib/format.js";
import type { RegionSearchResult } from "../../../types.js";

interface DbManagementTabProps {
  deleteRegion: RegionSearchResult | null;
  setDeleteRegion: (val: RegionSearchResult | null) => void;
  deleteRegionName: string;
  setDeleteRegionName: (val: string) => void;
  complexQuery: string;
  setComplexQuery: (val: string) => void;
  showComplexDropdown: boolean;
  setShowComplexDropdown: (val: boolean) => void;
  activeAptIndex: number;
  setActiveAptIndex: React.Dispatch<React.SetStateAction<number>>;
  filteredApartments: string[];
  searchingComplexes: boolean;
  handleDeleteRegion: () => Promise<void>;
  handleDeleteComplex: (complexName: string) => Promise<void>;
  handleClearAllDatabase: () => Promise<void>;
}

export function DbManagementTab({
  deleteRegion,
  setDeleteRegion,
  deleteRegionName,
  setDeleteRegionName,
  complexQuery,
  setComplexQuery,
  showComplexDropdown,
  setShowComplexDropdown,
  activeAptIndex,
  setActiveAptIndex,
  filteredApartments,
  searchingComplexes,
  handleDeleteRegion,
  handleDeleteComplex,
  handleClearAllDatabase,
}: DbManagementTabProps) {
  return (
    <div className="max-w-2xl mx-auto">
      <SectionCard title="데이터 관리 도구">
        <div className="space-y-4">
          <p className="text-xs text-neutral">
            수집된 실거래 데이터베이스의 특정 지역이나 아파트 단지를 골라 지우거나, 전체 데이터를 안전하게 초기화할 수
            있습니다.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* 1. 지역별 삭제 */}
            <div className="space-y-1.5 p-3 rounded-lg border border-normal bg-alternative/30">
              <span className="text-xs font-bold text-strong flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-neutral shrink-0" />
                지역별 실거래 삭제
              </span>
              <div className="flex gap-2 items-center mt-1">
                <div className="flex-1">
                  <RegionSearchInput
                    value={deleteRegionName}
                    onChange={setDeleteRegionName}
                    onSelect={(item) => {
                      setDeleteRegion(item);
                      setDeleteRegionName(item.displayName);
                    }}
                    placeholder="지우고 싶은 지역 검색..."
                  />
                </div>
                <button
                  type="button"
                  disabled={!deleteRegion}
                  onClick={handleDeleteRegion}
                  className="rounded-lg bg-red-500 px-3.5 py-2 text-xs font-bold text-white hover:bg-red-600 disabled:opacity-50 transition-all shrink-0"
                >
                  삭제
                </button>
              </div>
              {deleteRegion && (
                <p className="text-[10px] text-neutral mt-1">
                  선택된 코드: <b className="font-semibold text-strong">{deleteRegion.lawdCode}</b>
                </p>
              )}
            </div>

            {/* 2. 아파트 단지별 삭제 */}
            <div className="space-y-1.5 p-3 rounded-lg border border-normal bg-alternative/30">
              <span className="text-xs font-bold text-strong flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-neutral shrink-0" />
                아파트 단지별 실거래 삭제
              </span>
              <div className="relative flex gap-2 items-center mt-1">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    className="w-full h-[38px] rounded-lg border border-normal bg-normal pl-3 pr-8 text-xs font-semibold text-strong outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                    value={complexQuery}
                    onChange={(e) => {
                      setComplexQuery(e.target.value);
                      setShowComplexDropdown(true);
                    }}
                    onFocus={() => setShowComplexDropdown(true)}
                    onBlur={() => {
                      setTimeout(() => {
                        setShowComplexDropdown(false);
                        setActiveAptIndex(-1);
                      }, 200);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (showComplexDropdown && activeAptIndex >= 0 && activeAptIndex < filteredApartments.length) {
                          const selected = filteredApartments[activeAptIndex];
                          setComplexQuery(selected);
                          setShowComplexDropdown(false);
                        }
                      } else if (showComplexDropdown && filteredApartments.length > 0) {
                        if (e.key === "ArrowDown") {
                          e.preventDefault();
                          setActiveAptIndex((prev) => (prev < filteredApartments.length - 1 ? prev + 1 : prev));
                        } else if (e.key === "ArrowUp") {
                          e.preventDefault();
                          setActiveAptIndex((prev) => (prev > 0 ? prev - 1 : -1));
                        } else if (e.key === "Escape") {
                          setShowComplexDropdown(false);
                          setActiveAptIndex(-1);
                        }
                      }
                    }}
                    placeholder="단지명을 입력해 검색..."
                    autoComplete="off"
                  />
                  {searchingComplexes && (
                    <RefreshCw className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-neutral" />
                  )}

                  {showComplexDropdown && filteredApartments.length > 0 && (
                    <ul className="absolute z-30 left-0 right-0 top-full mt-1 max-h-40 overflow-auto rounded-lg border border-normal bg-elevated py-1 shadow-lg">
                      {filteredApartments.map((apt, index) => (
                        <li key={`${apt}-${index}`}>
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setComplexQuery(apt);
                              setShowComplexDropdown(false);
                            }}
                            className={classNames(
                              "w-full text-left px-3 py-1.5 text-xs transition-colors",
                              index === activeAptIndex
                                ? "bg-primary/10 text-primary font-semibold"
                                : "hover:bg-alternative text-strong"
                            )}
                          >
                            {apt}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <button
                  type="button"
                  disabled={!complexQuery.trim()}
                  onClick={() => handleDeleteComplex(complexQuery)}
                  className="rounded-lg bg-red-500 px-3.5 py-2 text-xs font-bold text-white hover:bg-red-600 disabled:opacity-50 transition-all shrink-0"
                >
                  삭제
                </button>
              </div>
            </div>
          </div>

          {/* 3. 전체 초기화 */}
          <div className="mt-4 p-4 rounded-xl border border-red-500/20 bg-red-500/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="space-y-1">
              <span className="text-xs font-black text-red-600 flex items-center gap-1.5 uppercase tracking-wide">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                데이터베이스 전체 초기화 (위험)
              </span>
              <p className="text-[11px] text-neutral leading-normal">
                수집된 실거래 내역, 등록 단지 및 법정동 주소 정보가 영구적으로 삭제됩니다. 이 작업은 되돌릴 수
                없습니다.
              </p>
            </div>
            <button
              type="button"
              onClick={handleClearAllDatabase}
              className="rounded-lg bg-red-600 hover:bg-red-700 px-4 py-2 text-xs font-bold text-white transition-all shadow-sm shadow-red-500/20 flex items-center justify-center gap-1.5 shrink-0"
            >
              전체 초기화
            </button>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
