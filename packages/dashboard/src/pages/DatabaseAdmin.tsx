import React, { useEffect, useMemo, useState } from "react";
import { useBreakpoint } from "../useBreakpoint";
import { loadAdminDbTables, executeAdminDbQuery, searchComplexNames, clearDatabase, deleteDbRegion, deleteDbComplex, loadGeocodeStats, triggerGeocodeBatch } from "../api";
import { SectionCard } from "../components/SectionCard";
import { Play, Database, RefreshCw, AlertCircle, CheckCircle2, ChevronRight, FileText, Settings, Building2, MapPin } from "lucide-react";
import { copy } from "../locales/ko";
import { RegionSearchInput } from "../components/RegionSearchInput";
import { classNames } from "../lib/format";
import type { RegionSearchResult } from "../types";

const locale = "ko";
const t = copy[locale];

type SchemaInfo = {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: any;
  pk: number;
};

type QueryResult = {
  type: "select" | "write";
  rows?: Record<string, any>[];
  changes?: number;
  lastInsertRowid?: number | string;
};

export function DatabaseAdminPage() {
  const { isMobile } = useBreakpoint();
  const [tables, setTables] = useState<string[]>([]);

  // Geocoding 통계 상태
  const [geocodeStats, setGeocodeStats] = useState<{
    total: number;
    geocoded: number;
    pending: number;
  } | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchResult, setBatchResult] = useState<{ total: number; success: number; failed: number } | null>(null);

  // Geocoding 통계 조회
  const fetchGeocodeStats = async () => {
    try {
      const stats = await loadGeocodeStats();
      setGeocodeStats(stats);
    } catch (err) {
      console.error("Failed to load geocode stats", err);
    }
  };

  useEffect(() => {
    fetchGeocodeStats();
  }, []);

  const geocodePercentage = useMemo(() => {
    if (!geocodeStats || geocodeStats.total === 0) return 0;
    return Math.round((geocodeStats.geocoded / geocodeStats.total) * 100);
  }, [geocodeStats]);

  // 일괄 Geocoding 실행
  const handleGeocodeBatch = async () => {
    setBatchLoading(true);
    setBatchResult(null);
    try {
      const res = await triggerGeocodeBatch();
      setBatchResult(res);
      await fetchGeocodeStats();
    } catch (err: any) {
      alert(err.message || "Geocoding 배치 실행에 실패했습니다.");
    } finally {
      setBatchLoading(false);
    }
  };
  const [schemas, setSchemas] = useState<Record<string, SchemaInfo[]>>({});
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [loadingSchema, setLoadingSchema] = useState(false);

  // DB 관리 도구 상태
  const [deleteRegion, setDeleteRegion] = useState<RegionSearchResult | null>(null);
  const [deleteRegionName, setDeleteRegionName] = useState("");

  const [complexQuery, setComplexQuery] = useState("");
  const [showComplexDropdown, setShowComplexDropdown] = useState(false);
  const [activeAptIndex, setActiveAptIndex] = useState(-1);
  const [apartments, setApartments] = useState<string[]>([]);
  const [searchingComplexes, setSearchingComplexes] = useState(false);

  const filteredApartments = useMemo(() => {
    const q = complexQuery.trim().toLowerCase();
    if (!q) return apartments;
    return apartments.filter((apt) => apt.toLowerCase().includes(q));
  }, [apartments, complexQuery]);

  // 단지명 디바운스 실시간 검색
  useEffect(() => {
    const q = complexQuery.trim();
    if (q.length === 1) {
      return;
    }

    const timer = setTimeout(async () => {
      setSearchingComplexes(true);
      try {
        const found = await searchComplexNames(q);
        setApartments(found.map((item) => item.name));
      } catch (err) {
        console.error("Failed to search complexes:", err);
        setApartments([]);
      } finally {
        setSearchingComplexes(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [complexQuery]);

  async function handleDeleteRegion() {
    if (!deleteRegion) return;
    if (!confirm(`정말로 '${deleteRegion.displayName}' 지역의 모든 실거래 및 단지 데이터를 지우시겠습니까?`)) return;

    try {
      await deleteDbRegion(deleteRegion.lawdCode);
      alert("해당 지역의 실거래 및 단지 정보가 성공적으로 삭제되었습니다.");
      setDeleteRegion(null);
      setDeleteRegionName("");
      void loadSchemaData();
    } catch (err: any) {
      alert(`삭제 실패: ${err.message || "오류가 발생했습니다."}`);
    }
  }

  async function handleDeleteComplex() {
    const name = complexQuery.trim();
    if (!name) return;
    if (!confirm(`정말로 '${name}' 아파트 단지의 모든 실거래 데이터를 지우시겠습니까?`)) return;

    try {
      await deleteDbComplex(name);
      alert("해당 아파트 단지의 실거래 정보가 성공적으로 삭제되었습니다.");
      setComplexQuery("");
      void loadSchemaData();
    } catch (err: any) {
      alert(`삭제 실패: ${err.message || "오류가 발생했습니다."}`);
    }
  }

  async function handleClearDb() {
    if (!confirm("⚠️ 정말로 데이터베이스의 모든 실거래, 단지, 지역 데이터를 지우고 전체 초기화하시겠습니까? 이 작업은 절대 되돌릴 수 없습니다.")) return;

    try {
      await clearDatabase();
      alert("데이터베이스 전체 초기화가 완료되었습니다.");
      setDeleteRegion(null);
      setDeleteRegionName("");
      setComplexQuery("");
      void loadSchemaData();
    } catch (err: any) {
      alert(`초기화 실패: ${err.message || "오류가 발생했습니다."}`);
    }
  }

  const [sql, setSql] = useState<string>("SELECT * FROM transactions LIMIT 20;");
  const [executing, setExecuting] = useState(false);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [queryError, setQueryError] = useState<string>("");

  async function loadSchemaData() {
    setLoadingSchema(true);
    try {
      const data = await loadAdminDbTables();
      setTables(data.tables);
      setSchemas(data.schemas);
      if (data.tables.length > 0 && !selectedTable) {
        setSelectedTable(data.tables[0]);
      }
    } catch (err: any) {
      console.error("Failed to load schema", err);
    } finally {
      setLoadingSchema(false);
    }
  }

  useEffect(() => {
    void loadSchemaData();
  }, []);

  async function handleExecute() {
    if (!sql.trim()) return;
    setExecuting(true);
    setQueryError("");
    setQueryResult(null);
    try {
      const res = await executeAdminDbQuery(sql);
      setQueryResult(res);
      // 쓰기 작업이 일어났을 가능성이 있으므로 스키마 데이터를 가볍게 새로고침합니다.
      void loadSchemaData();
    } catch (err: any) {
      setQueryError(err.message || "쿼리 실행 중 알 수 없는 에러가 발생했습니다.");
    } finally {
      setExecuting(false);
    }
  }

  function injectTemplate(query: string) {
    setSql(query);
  }

  // 결과 그리드의 헤더 추출
  const resultHeaders = queryResult?.rows && queryResult.rows.length > 0
    ? Object.keys(queryResult.rows[0])
    : [];

  return (
    <div className="space-y-6">
      {!isMobile && (
        <header className="flex flex-col gap-1">
          <h2 className="text-2xl font-black text-strong tracking-tight mt-1 flex items-center gap-2">
            <Database className="text-primary h-6 w-6" />
            {t.dbAdminTitle}
          </h2>
          <p className="text-sm text-neutral">{t.dbAdminSubtitle}</p>
        </header>
      )}

      {/* 2열 반응형 레이아웃 */}
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        
        {/* 좌측: 스키마 브라우저 */}
        <div className="space-y-6">
          <SectionCard
            title={t.tablesList}
            right={
              <button
                type="button"
                onClick={() => void loadSchemaData()}
                disabled={loadingSchema}
                className="p-1.5 text-neutral hover:text-strong hover:bg-alternative rounded-lg transition-colors"
                title="새로고침"
              >
                <RefreshCw className={`h-4 w-4 ${loadingSchema ? "animate-spin" : ""}`} />
              </button>
            }
          >
            {tables.length === 0 ? (
              <p className="text-sm text-neutral text-center py-4">테이블이 존재하지 않습니다.</p>
            ) : (
              <div className="space-y-4">
                {/* 테이블 선택 셀렉트 (모바일 대응) */}
                <div className="lg:hidden">
                  <select
                    value={selectedTable}
                    onChange={(e) => setSelectedTable(e.target.value)}
                    className="w-full h-10 rounded-lg border border-normal bg-normal px-3 text-sm font-semibold text-strong outline-none"
                  >
                    {tables.map((tName) => (
                      <option key={tName} value={tName}>
                        {tName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 테이블 리스트 (데스크톱 대응) */}
                <div className="hidden lg:block space-y-1">
                  {tables.map((tName) => (
                    <button
                      key={tName}
                      type="button"
                      onClick={() => setSelectedTable(tName)}
                      className={`w-full text-left flex items-center gap-2 px-3 py-2 text-sm font-bold rounded-lg transition-colors ${
                        selectedTable === tName
                          ? "bg-primary/10 text-primary"
                          : "text-neutral hover:bg-alternative hover:text-strong"
                      }`}
                    >
                      <Database className="h-4 w-4 shrink-0" />
                      <span>{tName}</span>
                    </button>
                  ))}
                </div>

                {/* 선택한 테이블 스키마 상세 정보 */}
                {selectedTable && schemas[selectedTable] && (
                  <div className="border-t border-normal/50 pt-3 space-y-2">
                    <p className="text-[11px] font-bold text-assistive tracking-wide uppercase">{t.schemaInfo}: {selectedTable}</p>
                    <div className="overflow-x-auto max-h-60 border border-normal rounded-lg">
                      <table className="w-full text-[11px] leading-normal">
                        <thead>
                          <tr className="bg-alternative/60 border-b border-normal text-left text-neutral">
                            <th className="px-2.5 py-1.5 font-bold">컬럼명</th>
                            <th className="px-2.5 py-1.5 font-bold">타입</th>
                            <th className="px-2.5 py-1.5 font-bold text-center">PK</th>
                          </tr>
                        </thead>
                        <tbody>
                          {schemas[selectedTable].map((col) => (
                            <tr key={col.cid} className="border-b border-normal/30 last:border-b-0 hover:bg-alternative/30">
                              <td className="px-2.5 py-1.5 font-semibold text-strong">{col.name}</td>
                              <td className="px-2.5 py-1.5 text-neutral">{col.type}</td>
                              <td className="px-2.5 py-1.5 text-center font-bold text-primary">{col.pk ? "✓" : ""}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </SectionCard>

          {/* SQL 템플릿 카드 */}
          <SectionCard title={t.sqlTemplate}>
            <div className="space-y-2 text-xs">
              <button
                type="button"
                onClick={() => injectTemplate("SELECT * FROM transactions LIMIT 20;")}
                className="w-full text-left flex items-center gap-2 p-2 rounded-lg bg-alternative hover:bg-alternative/80 text-strong font-semibold transition-colors"
              >
                <FileText className="h-3.5 w-3.5 text-neutral shrink-0" />
                <span>최근 실거래 조회</span>
              </button>
              <button
                type="button"
                onClick={() => injectTemplate("SELECT * FROM regions LIMIT 20;")}
                className="w-full text-left flex items-center gap-2 p-2 rounded-lg bg-alternative hover:bg-alternative/80 text-strong font-semibold transition-colors"
              >
                <FileText className="h-3.5 w-3.5 text-neutral shrink-0" />
                <span>등록된 지역 조회</span>
              </button>
              <button
                type="button"
                onClick={() => injectTemplate("SELECT * FROM complexes LIMIT 20;")}
                className="w-full text-left flex items-center gap-2 p-2 rounded-lg bg-alternative hover:bg-alternative/80 text-strong font-semibold transition-colors"
              >
                <FileText className="h-3.5 w-3.5 text-neutral shrink-0" />
                <span>등록된 단지 조회</span>
              </button>
            </div>
          </SectionCard>
        </div>

        {/* 우측: 데이터 관리 도구 및 SQL 에디터 */}
        <div className="space-y-6">
          {/* Geocoding 좌표 캐싱 관리 */}
          <SectionCard
            title="Geocoding 좌표 캐싱 관리"
            right={<Settings size={15} className="text-neutral" />}
          >
            <div className="space-y-4">
              <p className="text-xs text-neutral">
                지하철역 주변 역세권 분석 속도 및 데이터 정확도 향상을 위해 로컬 DB에 등록된 아파트 단지 주소를 위도·경도 좌표로 일괄 변환(Geocoding) 및 캐싱합니다.
              </p>
              <div className="flex justify-between items-center text-xs font-bold border-t border-normal/50 pt-3">
                <span className="text-neutral">좌표 데이터 현황</span>
                <span className="text-strong">
                  {geocodeStats?.geocoded || 0} / {geocodeStats?.total || 0} 단지 ({geocodePercentage}%)
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-alternative overflow-hidden border border-normal">
                <div
                  className="h-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${geocodePercentage}%` }}
                />
              </div>

              {geocodeStats && geocodeStats.pending > 0 ? (
                <div className="space-y-3">
                  <p className="text-[11px] text-neutral leading-relaxed">
                    현재 DB에 등록된 아파트 중 <strong>{geocodeStats.pending}개</strong> 단지의 위도·경도 좌표가 없습니다.
                    국토부 지번 주소 기반으로 카카오 Geocoding 일괄 수집을 실행할 수 있습니다.
                  </p>
                  <button
                    onClick={handleGeocodeBatch}
                    disabled={batchLoading}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-500 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                  >
                    {batchLoading ? (
                      <RefreshCw size={15} className="animate-spin" />
                    ) : (
                      <Play size={15} />
                    )}
                    <span>{batchLoading ? "좌표 수집 중..." : "좌표 미확보 단지 일괄 수집"}</span>
                  </button>
                </div>
              ) : (
                <p className="text-[11px] text-emerald-500 font-semibold flex items-center gap-1.5 py-2">
                  ✓ 모든 아파트 단지의 위도·경도 좌표가 확보되었습니다.
                </p>
              )}

              {batchResult && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-600 font-bold space-y-1">
                  <p>✓ Geocoding 수집 배치 완료</p>
                  <p>- 대상: {batchResult.total}건 / 성공: {batchResult.success}건 / 실패: {batchResult.failed}건</p>
                </div>
              )}
            </div>
          </SectionCard>

          <SectionCard title="데이터 관리 도구">
            <div className="space-y-4">
              <p className="text-xs text-neutral">
                수집된 실거래 데이터베이스의 특정 지역이나 아파트 단지를 골라 지우거나, 전체 데이터를 안전하게 초기화할 수 있습니다.
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
                      {searchingComplexes && <RefreshCw className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-neutral" />}

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
                                  index === activeAptIndex ? "bg-primary/10 text-primary font-semibold" : "hover:bg-alternative text-strong"
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
                      onClick={handleDeleteComplex}
                      className="rounded-lg bg-red-500 px-3.5 py-2 text-xs font-bold text-white hover:bg-red-600 disabled:opacity-50 transition-all shrink-0"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </div>

              {/* 3. 전체 초기화 */}
              <div className="flex items-center justify-between border-t border-normal/50 pt-3">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" /> 데이터베이스 전체 초기화
                  </span>
                  <p className="text-[10px] text-neutral">수집된 실거래 거래 목록 및 법정동 정보를 전부 삭제하고 디스크 용량을 최적화합니다.</p>
                </div>
                <button
                  type="button"
                  onClick={handleClearDb}
                  className="rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 transition-all shadow-sm shadow-red-500/10 flex items-center gap-1.5 shrink-0"
                >
                  전체 초기화
                </button>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="SQL 콘솔">
            <div className="space-y-4">
              <div className="relative rounded-xl border border-normal bg-alternative/40 focus-within:border-primary overflow-hidden">
                <textarea
                  value={sql}
                  onChange={(e) => setSql(e.target.value)}
                  placeholder={t.sqlPlaceholder}
                  rows={6}
                  className="w-full p-4 text-sm font-mono text-strong bg-transparent outline-none resize-y"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => void handleExecute()}
                  disabled={executing || !sql.trim()}
                  className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-sm shadow-blue-500/20 transition-all hover:opacity-90 disabled:opacity-50"
                >
                  {executing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                  {t.execute}
                </button>
              </div>
            </div>
          </SectionCard>

          {/* 에러 또는 결과 표출 */}
          {(queryError || queryResult) && (
            <SectionCard title={t.queryResult}>
              {queryError && (
                <div className="flex gap-2 rounded-xl border border-red-200/50 bg-red-500/10 p-4 text-sm text-red-600">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <div>
                    <p className="font-bold">SQL 에러</p>
                    <p className="mt-1 font-mono text-xs whitespace-pre-wrap">{queryError}</p>
                  </div>
                </div>
              )}

              {queryResult && (
                <div className="space-y-3">
                  {/* 쓰기(DML/DDL) 처리 성공 요약 */}
                  {queryResult.type === "write" && (
                    <div className="flex gap-2 rounded-xl border border-emerald-200/50 bg-emerald-500/10 p-4 text-sm text-emerald-600">
                      <CheckCircle2 className="h-5 w-5 shrink-0" />
                      <div>
                        <p className="font-bold">{t.querySuccess}</p>
                        <ul className="mt-1.5 space-y-1 text-xs">
                          <li>• {t.affectedRows}: <b>{queryResult.changes ?? 0}</b></li>
                          {queryResult.lastInsertRowid !== undefined && (
                            <li>• {t.lastInsertId}: <b>{queryResult.lastInsertRowid}</b></li>
                          )}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* SELECT 조회 성공 테이블 데이터 표출 */}
                  {queryResult.type === "select" && (
                    <div className="space-y-2">
                      <p className="text-xs text-neutral">
                        조회 완료: <b>{queryResult.rows?.length ?? 0}</b>{t.rowsCount}
                      </p>

                      {queryResult.rows && queryResult.rows.length > 0 ? (
                        <div className="overflow-x-auto border border-normal rounded-xl max-h-[500px]">
                          <table className="min-w-full text-xs">
                            <thead>
                              <tr className="bg-alternative border-b border-normal text-left text-neutral">
                                {resultHeaders.map((header) => (
                                  <th key={header} className="px-4 py-3 font-bold whitespace-nowrap">
                                    {header}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {queryResult.rows.map((row, index) => (
                                <tr key={index} className="border-b border-normal/30 last:border-b-0 hover:bg-alternative/40">
                                  {resultHeaders.map((header) => (
                                    <td key={header} className="px-4 py-2.5 font-medium text-strong whitespace-nowrap">
                                      {row[header] !== null && row[header] !== undefined
                                        ? String(row[header])
                                        : <span className="text-assistive font-normal">NULL</span>}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-center py-10 text-sm text-neutral bg-alternative/30 rounded-xl border border-dashed border-normal">
                          조회 결과(Rows)가 존재하지 않습니다.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </SectionCard>
          )}

        </div>
      </div>
    </div>
  );
}
