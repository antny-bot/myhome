import React, { useMemo } from "react";
import { AlertCircle, CheckCircle2, Database, Play, RefreshCw, Search, WrapText, X } from "lucide-react";
import { SectionCard } from "../../../components/SectionCard.js";
import { classNames } from "../../../lib/format.js";
import { useLocale } from "../../../lib/i18n.js";
import { useBreakpoint } from "../../../useBreakpoint.js";
import { RowDetailModal } from "./RowDetailModal.js";
import type { QueryResult, SchemaInfo } from "./types.js";

interface DbSqlConsoleTabProps {
  tables: string[];
  schemas: Record<string, SchemaInfo[]>;
  selectedTable: string;
  setSelectedTable: (table: string) => void;
  loadingSchema: boolean;
  loadSchemaData: () => Promise<void>;
  sql: string;
  setSql: (sql: string) => void;
  executing: boolean;
  queryResult: QueryResult | null;
  queryError: string;
  resultFilter: string;
  setResultFilter: (val: string) => void;
  isWrapText: boolean;
  setIsWrapText: React.Dispatch<React.SetStateAction<boolean>>;
  selectedRowDetail: Record<string, any> | null;
  setSelectedRowDetail: (row: Record<string, any> | null) => void;
  handleExecute: () => Promise<void>;
  handleQueryTableDirect: (tableName: string) => Promise<void>;
  injectTemplate: (query: string) => void;
}

export function DbSqlConsoleTab(props: DbSqlConsoleTabProps) {
  const {
    tables,
    schemas,
    selectedTable,
    setSelectedTable,
    loadingSchema,
    loadSchemaData,
    sql,
    setSql,
    executing,
    queryResult,
    queryError,
    resultFilter,
    setResultFilter,
    isWrapText,
    setIsWrapText,
    selectedRowDetail,
    setSelectedRowDetail,
    handleExecute,
    handleQueryTableDirect,
    injectTemplate,
  } = props;

  const { t } = useLocale();
  const { isMobile } = useBreakpoint();

  const resultHeaders =
    queryResult?.rows && queryResult.rows.length > 0 ? Object.keys(queryResult.rows[0]) : [];

  const filteredRows = useMemo(() => {
    if (!queryResult?.rows) return [];
    if (!resultFilter.trim()) return queryResult.rows;
    const q = resultFilter.trim().toLowerCase();
    return queryResult.rows.filter((row) =>
      Object.values(row).some((val) => val !== null && val !== undefined && String(val).toLowerCase().includes(q))
    );
  }, [queryResult?.rows, resultFilter]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 items-start">
        {/* 좌측: 스키마 트리 */}
        <div className="min-w-0">
          <SectionCard
            title={t.tablesList}
            right={
              <button
                type="button"
                onClick={() => void loadSchemaData()}
                disabled={loadingSchema}
                className="p-1 rounded hover:bg-alternative text-neutral hover:text-strong transition-colors"
                title="테이블 및 스키마 새로고침"
              >
                <RefreshCw className={classNames("h-3.5 w-3.5", loadingSchema ? "animate-spin" : "")} />
              </button>
            }
          >
            {loadingSchema && tables.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-neutral">
                <RefreshCw className="h-5 w-5 animate-spin" />
              </div>
            ) : tables.length === 0 ? (
              <p className="text-xs text-neutral py-4 text-center">테이블이 존재하지 않습니다.</p>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-1.5 max-h-[160px] overflow-y-auto p-1 border border-normal rounded-lg bg-alternative/20">
                  {tables.map((tbl) => (
                    <button
                      key={tbl}
                      type="button"
                      onClick={() => setSelectedTable(tbl)}
                      className={classNames(
                        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all border",
                        selectedTable === tbl
                          ? "bg-primary text-white border-primary shadow-sm"
                          : "bg-elevated border-normal text-strong hover:bg-alternative"
                      )}
                    >
                      <Database className="h-3 w-3" />
                      <span>{tbl}</span>
                    </button>
                  ))}
                </div>

                {selectedTable && schemas[selectedTable] && (
                  <div className="border-t border-normal/50 pt-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-bold text-assistive tracking-wide uppercase">
                        {t.schemaInfo}: {selectedTable}
                      </p>
                      <button
                        type="button"
                        onClick={() => void handleQueryTableDirect(selectedTable)}
                        className="text-[10px] text-primary font-bold hover:underline flex items-center gap-0.5"
                      >
                        <Play className="h-2.5 w-2.5" /> 20건 조회
                      </button>
                    </div>
                    <div className="overflow-x-auto max-h-[190px] overflow-y-auto border border-normal rounded-lg bg-alternative/10">
                      <table className="w-full text-[11px] leading-normal border-collapse">
                        <thead className="sticky top-0 z-10">
                          <tr className="border-b border-normal text-left text-neutral">
                            <th className="sticky top-0 z-10 px-2.5 py-1.5 font-bold bg-alternative border-b border-normal">
                              컬럼명
                            </th>
                            <th className="sticky top-0 z-10 px-2.5 py-1.5 font-bold bg-alternative border-b border-normal">
                              타입
                            </th>
                            <th className="sticky top-0 z-10 px-2.5 py-1.5 font-bold text-center bg-alternative border-b border-normal">
                              PK
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {schemas[selectedTable].map((col) => (
                            <tr
                              key={col.cid}
                              className="border-b border-normal/30 last:border-b-0 hover:bg-alternative/30"
                            >
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
        </div>

        {/* 우측: SQL 콘솔 */}
        <div className="min-w-0">
          <SectionCard
            title="SQL 콘솔"
            right={
              <div className="flex flex-wrap gap-1 sm:gap-1.5 justify-end items-center">
                <button
                  type="button"
                  onClick={() => injectTemplate("SELECT * FROM transactions LIMIT 20;")}
                  className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg bg-alternative hover:bg-primary/10 hover:text-primary text-[9px] sm:text-[10px] font-bold text-strong transition-all border border-normal"
                >
                  {isMobile ? "실거래" : "최근 실거래"}
                </button>
                <button
                  type="button"
                  onClick={() => injectTemplate("SELECT * FROM regions LIMIT 20;")}
                  className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg bg-alternative hover:bg-primary/10 hover:text-primary text-[9px] sm:text-[10px] font-bold text-strong transition-all border border-normal"
                >
                  {isMobile ? "지역" : "등록 지역"}
                </button>
                <button
                  type="button"
                  onClick={() => injectTemplate("SELECT * FROM complexes LIMIT 20;")}
                  className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg bg-alternative hover:bg-primary/10 hover:text-primary text-[9px] sm:text-[10px] font-bold text-strong transition-all border border-normal"
                >
                  {isMobile ? "단지" : "등록 단지"}
                </button>
              </div>
            }
          >
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
        </div>
      </div>

      {/* 하단 2층: 에러 또는 실행 결과 */}
      {(queryError || queryResult) && (
        <SectionCard title={t.queryResult} className="min-w-0 overflow-hidden">
          {queryError && (
            <div className="flex gap-2 rounded-xl border border-red-200/50 bg-red-500/10 p-4 text-sm text-red-600">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <div className="min-w-0">
                <p className="font-bold">SQL 에러</p>
                <p className="mt-1 font-mono text-xs whitespace-pre-wrap break-all">{queryError}</p>
              </div>
            </div>
          )}

          {queryResult && (
            <div className="space-y-3 min-w-0">
              {queryResult.type === "write" && (
                <div className="flex gap-2 rounded-xl border border-emerald-200/50 bg-emerald-500/10 p-4 text-sm text-emerald-600">
                  <CheckCircle2 className="h-5 w-5 shrink-0" />
                  <div>
                    <p className="font-bold">{t.querySuccess}</p>
                    <ul className="mt-1.5 space-y-1 text-xs">
                      <li>
                        • {t.affectedRows}: <b>{queryResult.changes ?? 0}</b>
                      </li>
                      {queryResult.lastInsertRowid !== undefined && (
                        <li>
                          • {t.lastInsertId}: <b>{queryResult.lastInsertRowid}</b>
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              )}

              {queryResult.type === "select" && (
                <div className="space-y-3 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-neutral">
                        조회 완료: <b className="text-strong">{queryResult.rows?.length ?? 0}</b>
                        {t.rowsCount}
                        {resultFilter && (
                          <span className="ml-1 text-primary">
                            (필터됨: <b>{filteredRows.length}</b>건)
                          </span>
                        )}
                      </span>
                      <span className="text-[10px] text-assistive hidden md:inline">• 행 클릭 시 상세 열람</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="relative flex-1 sm:w-56">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral" />
                        <input
                          type="text"
                          value={resultFilter}
                          onChange={(e) => setResultFilter(e.target.value)}
                          placeholder="결과 내 검색..."
                          className="w-full h-8 pl-8 pr-7 text-xs rounded-lg border border-normal bg-normal text-strong outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                        />
                        {resultFilter && (
                          <button
                            type="button"
                            onClick={() => setResultFilter("")}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral hover:text-strong"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsWrapText((prev) => !prev)}
                        className={classNames(
                          "h-8 px-2.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0",
                          isWrapText
                            ? "bg-primary/10 border-primary text-primary"
                            : "border-normal bg-alternative/60 text-neutral hover:text-strong"
                        )}
                      >
                        <WrapText className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">{isWrapText ? "줄바꿈 중" : "컴팩트"}</span>
                      </button>
                    </div>
                  </div>

                  {queryResult.rows && queryResult.rows.length > 0 ? (
                    filteredRows.length > 0 ? (
                      <div className="w-full max-w-full overflow-x-auto overflow-y-auto border border-normal rounded-xl max-h-[560px] bg-elevated shadow-inner">
                        <table className="w-full text-xs border-collapse">
                          <thead className="sticky top-0 z-20">
                            <tr className="border-b border-normal text-left text-neutral">
                              <th className="sticky top-0 z-30 px-2.5 py-2.5 font-bold w-12 text-center text-neutral/70 border-r border-b border-normal bg-alternative">
                                #
                              </th>
                              {resultHeaders.map((header) => (
                                <th
                                  key={header}
                                  className="sticky top-0 z-20 px-3 py-2.5 font-bold whitespace-nowrap text-strong text-[11px] border-r border-b border-normal last:border-r-0 bg-alternative"
                                >
                                  {header}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {filteredRows.map((row, index) => (
                              <tr
                                key={index}
                                onClick={() => setSelectedRowDetail(row)}
                                className="border-b border-normal/20 last:border-b-0 hover:bg-primary/5 cursor-pointer transition-colors group"
                              >
                                <td className="px-2 py-1.5 text-center text-[10px] text-neutral/60 font-mono bg-alternative/20 border-r border-normal/30 group-hover:bg-primary/10 group-hover:text-primary font-semibold">
                                  {index + 1}
                                </td>
                                {resultHeaders.map((header) => {
                                  const cellVal = row[header];
                                  const isNull = cellVal === null || cellVal === undefined;
                                  const cellStr = isNull ? "" : String(cellVal);

                                  return (
                                    <td
                                      key={header}
                                      className={classNames(
                                        "px-3 py-1.5 text-xs text-strong border-r border-normal/15 last:border-r-0 font-mono",
                                        isWrapText
                                          ? "break-all whitespace-normal min-w-[120px] max-w-[320px]"
                                          : "whitespace-nowrap max-w-[200px] truncate"
                                      )}
                                      title={cellStr}
                                    >
                                      {isNull ? (
                                        <span className="text-assistive/60 font-sans italic text-[11px]">NULL</span>
                                      ) : (
                                        cellStr
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-center py-10 text-xs text-neutral bg-alternative/20 rounded-xl border border-dashed border-normal">
                        검색어 <b>"{resultFilter}"</b>에 일치하는 행이 없습니다.
                      </p>
                    )
                  ) : (
                    <p className="text-center py-10 text-xs text-neutral bg-alternative/20 rounded-xl border border-dashed border-normal">
                      조회된 결과가 없습니다. (0건)
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </SectionCard>
      )}

      {selectedRowDetail && (
        <RowDetailModal selectedRowDetail={selectedRowDetail} onClose={() => setSelectedRowDetail(null)} />
      )}
    </div>
  );
}
