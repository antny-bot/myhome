import React, { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from "recharts";
import {
  loadDrilldownRegions,
  loadDrilldownComplexes,
  loadDrilldownAreas,
  loadGraphRegionTrend,
  loadGraphComplexTrend
} from "../../api";
import { ChevronRight, ArrowRight, Activity, DollarSign, RefreshCw, BarChart2 } from "lucide-react";

type DrilldownLevel = {
  name: string;
  code?: string;
  type: "root" | "region" | "complex" | "area";
};

export default function DrilldownTab() {
  const [levelPath, setLevelPath] = useState<DrilldownLevel[]>([
    { name: "전체", type: "root" }
  ]);
  const [items, setItems] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [trendLoading, setTrendLoading] = useState(false);

  const currentLevel = levelPath[levelPath.length - 1];

  // 하위 레벨 항목 로드
  const fetchLevelData = async () => {
    setLoading(true);
    try {
      if (currentLevel.type === "root") {
        const data = await loadDrilldownRegions();
        setItems(data);
      } else if (currentLevel.type === "region" && currentLevel.code) {
        const data = await loadDrilldownComplexes(currentLevel.code);
        setItems(data);
      } else if (currentLevel.type === "complex") {
        // 이전 Region 코드 찾기
        const region = levelPath.find((l) => l.type === "region");
        const data = await loadDrilldownAreas(currentLevel.name, region?.code);
        setItems(data);
      } else {
        setItems([]);
      }
    } catch (err) {
      console.error("Failed to load drilldown items", err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  // 시계열 트렌드 차트 로드
  const fetchTrendData = async () => {
    setTrendLoading(true);
    try {
      if (currentLevel.type === "root") {
        setTrendData([]); // 루트는 전체 트렌드 없음 (또는 빈 상태)
      } else if (currentLevel.type === "region" && currentLevel.code) {
        const res = await loadGraphRegionTrend(currentLevel.code);
        setTrendData(res.trend);
      } else if (currentLevel.type === "complex") {
        const region = levelPath.find((l) => l.type === "region");
        const res = await loadGraphComplexTrend(currentLevel.name, region?.code);
        setTrendData(res.trend);
      } else {
        setTrendData([]);
      }
    } catch (err) {
      console.error("Failed to load trend data", err);
      setTrendData([]);
    } finally {
      setTrendLoading(false);
    }
  };

  useEffect(() => {
    fetchLevelData();
    fetchTrendData();
  }, [levelPath]);

  const handleItemClick = (item: any) => {
    if (currentLevel.type === "root") {
      setLevelPath([...levelPath, { name: item.name, code: item.code, type: "region" }]);
    } else if (currentLevel.type === "region") {
      setLevelPath([...levelPath, { name: item.name, type: "complex" }]);
    } else if (currentLevel.type === "complex") {
      setLevelPath([...levelPath, { name: item.name, type: "area" }]);
    }
  };

  const handleBreadcrumbClick = (index: number) => {
    setLevelPath(levelPath.slice(0, index + 1));
  };

  return (
    <div className="space-y-6 text-slate-100">
      {/* 계층 브레드크럼 */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl flex items-center flex-wrap gap-2 text-sm">
        {levelPath.map((level, idx) => (
          <React.Fragment key={idx}>
            {idx > 0 && <ChevronRight className="text-slate-600" size={16} />}
            <button
              onClick={() => handleBreadcrumbClick(idx)}
              className={`font-semibold transition hover:underline ${
                idx === levelPath.length - 1 ? "text-emerald-400 cursor-default" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {level.name}
            </button>
          </React.Fragment>
        ))}
        {loading && <RefreshCw size={14} className="ml-2 animate-spin text-slate-500" />}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 하위 항목 카드 리스트 (좌측 2열 차지) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <BarChart2 size={16} className="text-emerald-400" />
              <span>하위 분석 단위 선택</span>
            </h3>
            <span className="text-xs text-slate-500">총 {items.length}개 항목</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20 bg-slate-900/50 border border-slate-850 rounded-xl">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-slate-900/50 border border-slate-850 rounded-xl text-slate-500">
              <p className="text-sm">하위 항목이 없거나 최종 단계에 도달했습니다.</p>
              {currentLevel.type === "area" && (
                <p className="text-xs mt-1 text-slate-600">위 브레드크럼에서 상위 항목을 선택해 분석을 변경해 보세요.</p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-1">
              {items.map((item) => (
                <div
                  key={item.code || item.name}
                  onClick={() => handleItemClick(item)}
                  className="bg-slate-900 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-850/30 p-4 rounded-xl cursor-pointer shadow-lg transition flex items-center justify-between group"
                >
                  <div className="space-y-1">
                    <p className="font-semibold text-white group-hover:text-emerald-400 transition">
                      {item.name}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Activity size={12} className="text-sky-400" />
                        {item.count}건
                      </span>
                      <span className="flex items-center gap-0.5">
                        <DollarSign size={12} className="text-emerald-400" />
                        평균 {item.avgPriceEok.toFixed(2)}억
                      </span>
                    </div>
                  </div>
                  <ArrowRight size={16} className="text-slate-600 group-hover:text-emerald-400 group-hover:translate-x-1 transition" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 선택한 대상의 트렌드 차트 (우측 1열 차지) */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-white">📈 현재 계층 거래 추세</h3>

          {trendLoading ? (
            <div className="flex items-center justify-center h-64 bg-slate-900 border border-slate-800 rounded-xl shadow-xl">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            </div>
          ) : trendData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 bg-slate-900 border border-slate-800 rounded-xl shadow-xl text-slate-500 text-center px-4">
              <Activity size={32} className="mb-2 opacity-20" />
              <p className="text-xs">현재 레벨 시계열 데이터가 없습니다.</p>
              <p className="text-[10px] mt-1 text-slate-600">
                시/도 지역명 혹은 아파트 단지를 선택하면 월별 시계열 평균 실거래가를 표시합니다.
              </p>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl space-y-4">
              <div className="border-b border-slate-800 pb-2">
                <span className="text-xs font-semibold text-slate-400">월별 평균 거래가 추이</span>
              </div>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 10, right: 0, left: -30, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="month" stroke="#64748b" fontSize={9} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: "8px", color: "#f8fafc", fontSize: "11px" }}
                    />
                    <Area type="monotone" dataKey="avgPriceEok" stroke="#10b981" fillOpacity={1} fill="url(#colorPrice)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="text-[10px] text-slate-500 text-center">
                ※ Neo4j 그래프 데이터 베이스 실시간 조회 통계
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
