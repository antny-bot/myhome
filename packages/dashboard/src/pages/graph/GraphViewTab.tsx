import React, { useState, useEffect, useRef } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { GraphFilter, GraphTopologyData } from "@myhome/shared";
import { loadGraphTopology } from "../../api";
import { Network, Home, Info, HelpCircle } from "lucide-react";

interface GraphViewTabProps {
  filter: GraphFilter;
}

export default function GraphViewTab({ filter }: GraphViewTabProps) {
  const [graphData, setGraphData] = useState<GraphTopologyData>({ nodes: [], links: [] });
  const [loading, setLoading] = useState(false);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const graphRef = useRef<any>(null);

  const fetchTopology = async () => {
    setLoading(true);
    try {
      const data = await loadGraphTopology(filter);
      setGraphData(data);
      // 리핏
      setTimeout(() => {
        if (graphRef.current) {
          graphRef.current.zoomToFit(400, 50);
        }
      }, 500);
    } catch (err) {
      console.error("Failed to load topology", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTopology();
  }, [filter]);

  // 노드별 색상 맵
  const getNodeColor = (node: any) => {
    switch (node.type) {
      case "Region":
        return "#3b82f6"; // 파랑
      case "Complex":
        return "#10b981"; // 초록
      case "Transaction":
        return "#f59e0b"; // 주황
      default:
        return "#94a3b8";
    }
  };

  // 노드 렌더러 커스터마이징 (라벨이 보이도록 캔버스 드로잉)
  const drawNode = (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const label = node.label;
    const fontSize = 11 / globalScale;
    ctx.font = `${fontSize}px Inter, sans-serif`;

    // 노드 원 그리기
    const radius = node.type === "Region" ? 8 : node.type === "Complex" ? 6 : 4;
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
    ctx.fillStyle = getNodeColor(node);
    ctx.fill();

    // 테두리
    ctx.lineWidth = 1 / globalScale;
    ctx.strokeStyle = "#ffffff";
    ctx.stroke();

    // 텍스트 라벨
    if (globalScale > 1.2) {
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#f8fafc";
      
      // 노드 아래에 텍스트가 걸쳐지도록 y 오프셋
      ctx.fillText(label, node.x, node.y + radius + fontSize + 1);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 text-slate-100">
      {/* 그래프 캔버스 (좌측 3열 차지) */}
      <div className="lg:col-span-3 bg-slate-950 border border-slate-900 rounded-xl relative overflow-hidden shadow-2xl h-[550px]">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
          </div>
        )}

        {graphData.nodes.length === 0 && !loading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
            <Network size={48} className="mb-3 opacity-30 animate-pulse" />
            <p className="text-sm">렌더링할 노드가 없습니다.</p>
            <p className="text-xs mt-1 text-slate-600">더 많은 데이터를 불러올 수 있도록 검색 필터를 넓혀보세요.</p>
          </div>
        ) : (
          <ForceGraph2D
            ref={graphRef}
            graphData={graphData}
            nodeCanvasObject={drawNode}
            nodePointerAreaPaint={(node: any, color, ctx) => {
              const radius = node.type === "Region" ? 10 : node.type === "Complex" ? 8 : 6;
              ctx.beginPath();
              ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
              ctx.fillStyle = color;
              ctx.fill();
            }}
            linkColor={() => "#1e293b"}
            linkWidth={() => 1.5}
            onNodeClick={(node) => setSelectedNode(node)}
            width={750}
            height={550}
          />
        )}

        {/* 도움말 오버레이 */}
        <div className="absolute top-4 left-4 bg-slate-900/90 border border-slate-800 rounded-lg p-3 text-xs text-slate-400 space-y-1.5 pointer-events-none backdrop-blur-sm">
          <div className="flex items-center gap-1 font-semibold text-white">
            <HelpCircle size={14} className="text-emerald-400" />
            <span>그래프 범례</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span>
            <span>Region (지역)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
            <span>Complex (단지)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
            <span>Transaction (실거래)</span>
          </div>
          <p className="text-[10px] text-slate-500 border-t border-slate-850 pt-1 mt-1">
            ※ 마우스 드래그로 팬, 휠로 줌이 가능합니다.<br />
            ※ 줌 확대 시 상세 텍스트 라벨이 나타납니다.
          </p>
        </div>
      </div>

      {/* 우측 노드 속성 설명 패널 */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl h-[550px] flex flex-col justify-between">
        <div>
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-1.5 border-b border-slate-800 pb-2">
            <Info size={16} className="text-emerald-400" />
            <span>선택된 노드 속성</span>
          </h3>

          {!selectedNode ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500 text-center">
              <Network size={36} className="mb-2 opacity-20" />
              <p className="text-xs">노드를 클릭하면 상세 정보가 이곳에 표시됩니다.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1">
                <span className="px-2 py-0.5 bg-slate-800 rounded text-[10px] font-semibold text-emerald-400">
                  {selectedNode.type}
                </span>
                <h4 className="text-md font-bold text-white">{selectedNode.label}</h4>
              </div>

              <div className="space-y-2.5 text-sm border-t border-slate-800 pt-3">
                {selectedNode.type === "Region" && (
                  <div>
                    <span className="text-xs text-slate-500 block">지역 코드</span>
                    <span className="font-semibold text-slate-200">{selectedNode.id}</span>
                  </div>
                )}

                {selectedNode.type === "Complex" && (
                  <>
                    <div>
                      <span className="text-xs text-slate-500 block">식별 정보</span>
                      <span className="font-semibold text-slate-200">{selectedNode.id.split("|")[0]}</span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 block">단지명</span>
                      <span className="font-semibold text-slate-200">{selectedNode.label}</span>
                    </div>
                  </>
                )}

                {selectedNode.type === "Transaction" && (
                  <>
                    <div>
                      <span className="text-xs text-slate-500 block">거래 식별자</span>
                      <span className="text-xs font-mono text-slate-400 break-all">{selectedNode.id}</span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 block">거래 금액</span>
                      <span className="font-semibold text-emerald-400">{selectedNode.val}억 원</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="bg-slate-950/40 border border-slate-850 p-3 rounded-lg text-xs text-slate-500 space-y-1">
          <p className="font-semibold text-slate-400">네트워크 노드-링크</p>
          <p className="leading-relaxed">
            국토부 아파트 거래 모델의 Region, Complex, Transaction은 각각 부모-자식 노드로 관계되어 데이터의 계층적 연동 상태를 입체적으로 보여줍니다.
          </p>
        </div>
      </div>
    </div>
  );
}
