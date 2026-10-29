import { useEffect, useMemo, useState } from "react";
import {
  clearDatabase,
  deleteDbComplex,
  deleteDbRegion,
  executeAdminDbQuery,
  loadAdminDbTables,
  searchComplexNames,
} from "../../../api.js";
import type { RegionSearchResult } from "../../../types.js";
import type { QueryResult, SchemaInfo } from "./types.js";
import { useAdminGeocoding } from "./useAdminGeocoding.js";

export function useDatabaseAdmin() {
  const [activeTab, setActiveTab] = useState<"sql" | "geocode" | "manage">(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab");
    if (tabParam === "sql" || tabParam === "geocode" || tabParam === "manage") {
      return tabParam;
    }
    return "sql";
  });

  const handleTabChange = (tab: "sql" | "geocode" | "manage") => {
    setActiveTab(tab);
    const params = new URLSearchParams(window.location.search);
    params.set("tab", tab);
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(window.history.state, "", newUrl);
  };

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam === "sql" || tabParam === "geocode" || tabParam === "manage") {
        setActiveTab(tabParam);
      } else {
        setActiveTab("sql");
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // 1. SQL 콘솔 & 스키마 상태
  const [tables, setTables] = useState<string[]>([]);
  const [schemas, setSchemas] = useState<Record<string, SchemaInfo[]>>({});
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [loadingSchema, setLoadingSchema] = useState(false);

  const [sql, setSql] = useState<string>("SELECT * FROM transactions LIMIT 20;");
  const [executing, setExecuting] = useState(false);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [queryError, setQueryError] = useState<string>("");
  const [resultFilter, setResultFilter] = useState<string>("");
  const [isWrapText, setIsWrapText] = useState<boolean>(false);
  const [selectedRowDetail, setSelectedRowDetail] = useState<Record<string, any> | null>(null);

  async function loadSchemaData() {
    setLoadingSchema(true);
    try {
      const data = await loadAdminDbTables();
      setTables(data.tables);
      setSchemas(data.schemas);
      if (data.tables.length > 0 && !selectedTable) {
        setSelectedTable(data.tables[0]);
      }
    } catch (err) {
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
    const isWrite = /\b(INSERT|UPDATE|DELETE|REPLACE|ALTER|CREATE)\b/i.test(sql);
    let confirmWrite = false;
    if (isWrite) {
      if (!window.confirm("데이터를 변경하는 쓰기 쿼리입니다. 정말 실행하시겠습니까?")) {
        return;
      }
      confirmWrite = true;
    }
    setExecuting(true);
    setQueryError("");
    setQueryResult(null);
    try {
      const res = await executeAdminDbQuery(sql, confirmWrite);
      setQueryResult(res);
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

  async function handleQueryTableDirect(tableName: string) {
    const newSql = `SELECT * FROM ${tableName} LIMIT 20;`;
    setSql(newSql);
    setSelectedTable(tableName);
    setExecuting(true);
    setQueryError("");
    setQueryResult(null);
    try {
      const res = await executeAdminDbQuery(newSql);
      setQueryResult(res);
    } catch (err: any) {
      setQueryError(err.message || "쿼리 실행 중 알 수 없는 에러가 발생했습니다.");
    } finally {
      setExecuting(false);
    }
  }

  // 2. Geocoding 상태 및 배치 (서브 훅)
  const geocodingState = useAdminGeocoding();

  // 3. DB 관리 도구 상태
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

  useEffect(() => {
    const q = complexQuery.trim();
    if (q.length <= 1) {
      if (q.length === 0) setApartments([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchingComplexes(true);
      try {
        const found = await searchComplexNames(q);
        setApartments(found.map((c: any) => c.name));
      } catch (err) {
        console.error("Failed to search complexes:", err);
        setApartments([]);
      } finally {
        setSearchingComplexes(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [complexQuery]);

  const handleDeleteRegion = async () => {
    if (!deleteRegion) {
      alert("삭제할 지역을 검색하여 선택해 주세요.");
      return;
    }
    const regionName = deleteRegion.displayName;
    const confirmMsg = `정말 '${regionName}' (${deleteRegion.lawdCode}) 지역의 모든 실거래 및 수집 설정을 완전히 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`;
    if (!confirm(confirmMsg)) return;

    try {
      await deleteDbRegion(deleteRegion.lawdCode);
      alert(`'${regionName}' 지역 데이터가 성공적으로 삭제되었습니다.`);
      setDeleteRegion(null);
      setDeleteRegionName("");
      void loadSchemaData();
    } catch (err: any) {
      alert(`삭제 실패: ${err.message || "오류가 발생했습니다."}`);
    }
  };

  const handleDeleteComplex = async (complexName: string) => {
    if (!complexName.trim()) {
      alert("삭제할 단지명을 입력하거나 선택해 주세요.");
      return;
    }
    const confirmMsg = `정말 '${complexName}' 단지의 모든 실거래 데이터를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`;
    if (!confirm(confirmMsg)) return;

    try {
      await deleteDbComplex(complexName);
      alert(`'${complexName}' 단지 데이터가 성공적으로 삭제되었습니다.`);
      setComplexQuery("");
      setShowComplexDropdown(false);
      void loadSchemaData();
    } catch (err: any) {
      alert(`삭제 실패: ${err.message || "오류가 발생했습니다."}`);
    }
  };

  const handleClearAllDatabase = async () => {
    const input = prompt(
      "경고: 데이터베이스 내 모든 실거래, 단지, 통계 데이터가 영구적으로 삭제됩니다!\n진행하시려면 '초기화'를 입력해 주세요."
    );
    if (input !== "초기화") {
      alert("입력값이 일치하지 않아 데이터베이스 초기화가 취소되었습니다.");
      return;
    }

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
  };

  return {
    activeTab,
    handleTabChange,
    // SQL
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
    // Geocode (forwarded from useAdminGeocoding)
    ...geocodingState,
    // Manage
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
  };
}
