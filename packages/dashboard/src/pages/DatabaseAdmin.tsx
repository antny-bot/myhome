import React, { useEffect, useState } from "react";
import { loadAdminDbTables, executeAdminDbQuery } from "../api";
import { SectionCard } from "../components/SectionCard";
import { Play, Database, RefreshCw, AlertCircle, CheckCircle2, ChevronRight, FileText } from "lucide-react";
import { copy } from "../locales/ko";

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
  const [tables, setTables] = useState<string[]>([]);
  const [schemas, setSchemas] = useState<Record<string, SchemaInfo[]>>({});
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [loadingSchema, setLoadingSchema] = useState(false);

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
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-xs text-assistive">
          <span>관리자</span>
          <ChevronRight className="h-3 w-3" />
          <span className="font-semibold text-neutral">데이터베이스</span>
        </div>
        <h2 className="text-2xl font-black text-strong tracking-tight">{t.dbAdminTitle}</h2>
        <p className="text-sm text-neutral">{t.dbAdminSubtitle}</p>
      </header>

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

        {/* 우측: SQL 에디터 및 결과 화면 */}
        <div className="space-y-6">
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
