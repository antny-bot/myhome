import React, { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar
} from "recharts";
import { loadComplexDetail, getApartments } from "../../api";
import { Home, Search, Calendar, DollarSign, Layers } from "lucide-react";

interface ComplexTabProps {
  initialComplexName?: string;
  lawdCode?: string;
}

export default function ComplexTab({ initialComplexName = "", lawdCode }: ComplexTabProps) {
  const [searchTerm, setSearchTerm] = useState(initialComplexName);
  const [complexName, setComplexName] = useState(initialComplexName);
  
  // 아파트 자동완성 관련 상태
  const [allApartments, setAllApartments] = useState<string[]>([]);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const [loading, setLoading] = useState(false);
  const [detailData, setDetailData] = useState<any>(null);
  const [error, setError] = useState("");

  // 아파트 목록 로드
  useEffect(() => {
    const loadApts = async () => {
      if (!lawdCode) {
        setAllApartments([]);
        return;
      }
      try {
        const list = await getApartments(lawdCode);
        setAllApartments(list);
      } catch (err) {
        console.error("Failed to fetch apartments list", err);
      }
    };
    loadApts();
  }, [lawdCode]);

  // 검색어 입력에 따른 실시간 필터링
  useEffect(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) {
      setFilteredSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const filtered = allApartments.filter((apt) =>
      apt.toLowerCase().includes(query)
    );
    setFilteredSuggestions(filtered);
    // 입력 중이고 결과가 있으면 노출
    setShowSuggestions(filtered.length > 0);
    setActiveIndex(-1);
  }, [searchTerm, allApartments]);

  const fetchDetail = async (name: string) => {
    if (!name.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await loadComplexDetail(name, lawdCode);
      setDetailData(res);
      setComplexName(name);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "단지 상세 데이터를 불러오지 못했습니다.");
      setDetailData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialComplexName) {
      setSearchTerm(initialComplexName);
      fetchDetail(initialComplexName);
    }
  }, [initialComplexName]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
    
    // 만약 검색 리스트가 딱 1개 매칭되어 있으면 엔터 시 자동 선택 및 실행
    if (filteredSuggestions.length === 1) {
      const target = filteredSuggestions[0];
      setSearchTerm(target);
      fetchDetail(target);
    } else {
      fetchDetail(searchTerm);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || filteredSuggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev < filteredSuggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Enter") {
      if (activeIndex >= 0 && activeIndex < filteredSuggestions.length) {
        e.preventDefault();
        const selected = filteredSuggestions[activeIndex];
        setSearchTerm(selected);
        setShowSuggestions(false);
        fetchDetail(selected);
      } else if (filteredSuggestions.length === 1) {
        e.preventDefault();
        const selected = filteredSuggestions[0];
        setSearchTerm(selected);
        setShowSuggestions(false);
        fetchDetail(selected);
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setActiveIndex(-1);
    }
  };

  const selectSuggestion = (name: string) => {
    setSearchTerm(name);
    setShowSuggestions(false);
    fetchDetail(name);
  };

  return (
    <div className="space-y-6 text-slate-100">
      {/* 검색 바 */}
      <form onSubmit={handleSearchSubmit} className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
        <h3 className="text-sm font-bold text-white mb-3">🏢 아파트 단지 분석</h3>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => filteredSuggestions.length > 0 && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => { setShowSuggestions(false); setActiveIndex(-1); }, 150)}
              placeholder="상세 분석할 아파트 단지명을 입력해 주세요 (예: 은마)"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              autoComplete="off"
            />
            <Search className="absolute left-3.5 top-2.5 text-slate-400" size={16} />
            {loading && (
              <div className="absolute right-3.5 top-2.5 flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-emerald-500 border-t-transparent"></div>
              </div>
            )}
            
            {showSuggestions && filteredSuggestions.length > 0 && (
              <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-slate-700 bg-slate-900 py-1 shadow-2xl">
                {filteredSuggestions.map((item, index) => (
                  <li key={item}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => selectSuggestion(item)}
                      className={`w-full text-left px-4 py-2 text-sm text-slate-200 transition-colors ${
                        index === activeIndex ? "bg-emerald-600 text-white font-semibold" : "hover:bg-slate-800"
                      }`}
                    >
                      {item}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white text-sm font-semibold rounded-lg shadow-lg transition"
          >
            {loading ? "조회 중..." : "조회"}
          </button>
        </div>
        {error && <p className="text-xs text-rose-400 mt-2">{error}</p>}
      </form>

      {!detailData && !loading && (
        <div className="flex flex-col items-center justify-center py-20 bg-slate-900/50 border border-slate-850 rounded-xl text-slate-500">
          <Home size={48} className="mb-3 opacity-30" />
          <p className="text-sm">분석할 아파트 단지를 검색해 주세요.</p>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-20 bg-slate-900/50 border border-slate-850 rounded-xl">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
        </div>
      )}

      {detailData && !loading && (
        <div className="space-y-6">
          <div className="border-l-4 border-emerald-500 pl-4 py-1">
            <h2 className="text-lg font-bold text-white">{complexName}</h2>
            <p className="text-xs text-slate-400 mt-0.5">단지 전용 분석 리포트</p>
          </div>

          {/* 1. 월별 거래 트렌드 시계열 */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
            <h3 className="text-sm font-bold text-white mb-4">📈 월별 평균 가격 추이 (평균 억)</h3>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={detailData.trend} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: "8px", color: "#f8fafc", fontSize: "12px" }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                  <Line type="monotone" dataKey="avgPriceEok" name="평균 거래가(억)" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 2. 평수별 통계 */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
              <h3 className="text-sm font-bold text-white mb-4">📐 평수별 평균 거래 금액</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={detailData.areaBreakdown} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="area" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: "8px", color: "#f8fafc", fontSize: "12px" }}
                    />
                    <Bar dataKey="avgPriceEok" name="평균가(억)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 3. 층별 분포 */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
              <h3 className="text-sm font-bold text-white mb-4">🏢 층별 거래 빈도 분포</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={detailData.floorDist} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="floor" stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={(v) => `${v}층`} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: "8px", color: "#f8fafc", fontSize: "12px" }}
                    />
                    <Bar dataKey="count" name="거래 건수" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* 4. 최근 실거래 목록 */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
            <h3 className="text-sm font-bold text-white mb-3">📋 최근 10건의 실거래 내역</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-slate-300">
                <thead className="text-xs uppercase bg-slate-800/60 text-slate-400">
                  <tr>
                    <th scope="col" className="px-4 py-3">거래일</th>
                    <th scope="col" className="px-4 py-3">거래가 (억)</th>
                    <th scope="col" className="px-4 py-3">전용면적 (㎡)</th>
                    <th scope="col" className="px-4 py-3">층</th>
                  </tr>
                </thead>
                <tbody>
                  {detailData.recentTx.map((tx: any) => (
                    <tr key={tx.dedupeKey} className="border-b border-slate-800 hover:bg-slate-850/50">
                      <td className="px-4 py-3.5 flex items-center gap-1.5 font-medium text-white">
                        <Calendar size={13} className="text-slate-500" />
                        {tx.dealDate}
                      </td>
                      <td className="px-4 py-3.5 text-emerald-400 font-bold">
                        <span className="flex items-center gap-0.5">
                          <DollarSign size={13} />
                          {tx.priceEok.toFixed(2)}억
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        {tx.areaM2 ? `${Math.round(tx.areaM2)} ㎡` : "-"}
                      </td>
                      <td className="px-4 py-3.5 flex items-center gap-1 text-slate-400">
                        <Layers size={13} />
                        {tx.floor ? `${tx.floor}층` : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
