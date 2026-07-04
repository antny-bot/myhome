import React from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart
} from "recharts";
import { StatCard } from "../../components/StatCard";
import { TrendingUp, DollarSign, Home, Activity } from "lucide-react";

interface OverviewTabProps {
  data: any[]; // searchTransactions 결과
  onSelectComplex?: (complexName: string) => void;
}

export default function OverviewTab({ data, onSelectComplex }: OverviewTabProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-500">
        <Home size={48} className="mb-3 opacity-30" />
        <p className="text-sm">조회된 실거래 데이터가 없습니다.</p>
        <p className="text-xs mt-1 text-slate-600">필터 조건을 설정하고 분석 실행 버튼을 눌러주세요.</p>
      </div>
    );
  }

  // 1. 통계 데이터 가공
  const totalCount = data.length;
  const prices = data.map((d) => d.priceEok);
  const avgPrice = prices.reduce((sum, p) => sum + p, 0) / totalCount;
  const maxPrice = Math.max(...prices);
  const minPrice = Math.min(...prices);

  // 2. 월별 시계열 데이터 가공 (평균가 & 거래수)
  const monthlyDataMap = new Map<string, { count: number; sum: number }>();
  data.forEach((d) => {
    const month = d.dealDate.substring(0, 7);
    const current = monthlyDataMap.get(month) || { count: 0, sum: 0 };
    current.count += 1;
    current.sum += d.priceEok;
    monthlyDataMap.set(month, current);
  });

  const monthlyChartData = Array.from(monthlyDataMap.entries())
    .map(([month, val]) => ({
      name: month,
      거래량: val.count,
      평균가: Number((val.sum / val.count).toFixed(2)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // 3. 지역별 평균 가격 비교 (상위 10개)
  const regionDataMap = new Map<string, { count: number; sum: number }>();
  data.forEach((d) => {
    const region = d.regionName || "기타";
    const current = regionDataMap.get(region) || { count: 0, sum: 0 };
    current.count += 1;
    current.sum += d.priceEok;
    regionDataMap.set(region, current);
  });

  const regionChartData = Array.from(regionDataMap.entries())
    .map(([name, val]) => ({
      name,
      평균가: Number((val.sum / val.count).toFixed(2)),
      거래량: val.count,
    }))
    .sort((a, b) => b.평균가 - a.평균가)
    .slice(0, 10);

  // 4. 단지별 거래량 순위 (상위 10개)
  const complexDataMap = new Map<string, number>();
  data.forEach((d) => {
    complexDataMap.set(d.apartmentName, (complexDataMap.get(d.apartmentName) || 0) + 1);
  });

  const complexChartData = Array.from(complexDataMap.entries())
    .map(([name, count]) => ({ name, 거래수: count }))
    .sort((a, b) => b.거래수 - a.거래수)
    .slice(0, 10);

  return (
    <div className="space-y-6">
      {/* 4개의 KPI 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="총 거래량"
          value={`${totalCount} 건`}
          icon={Activity}
          tone="default"
        />
        <StatCard
          label="평균 거래가"
          value={`${avgPrice.toFixed(2)} 억`}
          icon={DollarSign}
          tone="good"
        />
        <StatCard
          label="최고가 거래"
          value={`${maxPrice.toFixed(1)} 억`}
          icon={TrendingUp}
          tone="warn"
        />
        <StatCard
          label="최저가 거래"
          value={`${minPrice.toFixed(1)} 억`}
          icon={Home}
          tone="default"
        />
      </div>

      {/* 시계열 메인 차트 */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
        <h3 className="text-sm font-bold text-white mb-4">📈 월별 실거래가 & 거래량 추이</h3>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={monthlyChartData} margin={{ top: 10, right: -5, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis yAxisId="left" stroke="#64748b" fontSize={11} tickLine={false} label={{ value: "거래수(건)", angle: -90, position: "insideLeft", fill: "#64748b", fontSize: 10, offset: 5 }} />
              <YAxis yAxisId="right" orientation="right" stroke="#10b981" fontSize={11} tickLine={false} label={{ value: "평균가(억)", angle: 90, position: "insideRight", fill: "#10b981", fontSize: 10, offset: 5 }} />
              <Tooltip
                contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: "8px", color: "#f8fafc", fontSize: "12px" }}
              />
              <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
              <Bar yAxisId="left" dataKey="거래량" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={24} />
              <Line yAxisId="right" type="monotone" dataKey="평균가" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 서브 차트 2개 나란히 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 지역별 평균가 비교 */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
          <h3 className="text-sm font-bold text-white mb-4">🏘️ 주요 지역별 평균 거래가 (상위 10개)</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={regionChartData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} tickFormatter={(v) => v.split(" ").slice(-1)[0]} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: "8px", color: "#f8fafc", fontSize: "12px" }}
                />
                <Bar dataKey="평균가" fill="#10b981" radius={[4, 4, 0, 0]} label={{ position: "top", fill: "#94a3b8", fontSize: 9 }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 거래 상위 10개 단지 */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
          <h3 className="text-sm font-bold text-white mb-4">🏢 거래가 활발한 아파트 단지 (상위 10개)</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={complexChartData} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis type="number" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={10} tickLine={false} width={80} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: "8px", color: "#f8fafc", fontSize: "12px" }}
                />
                <Bar
                  dataKey="거래수"
                  fill="#f59e0b"
                  radius={[0, 4, 4, 0]}
                  cursor="pointer"
                  onClick={(data) => {
                    if (data && data.name && onSelectComplex) {
                      onSelectComplex(data.name);
                    }
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
