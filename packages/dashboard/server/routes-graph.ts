import { Router } from "express";
import {
  getComplexTrend,
  getRegionTrend,
  getGraphStats,
  searchTransactions,
  getDrilldownRegions,
  getDrilldownComplexes,
  getDrilldownAreas,
  getGraphTopology,
  getComplexDetail,
  getDataContext,
  searchComplexNames,
  GraphFilter,
  getAllDbRegions,
  getComplexesByRegion,
  getDailyCollectionStats,
  getRegionCollectionStatsByDate,
  getMonthlyCollectionStats,
  getRegionCollectionStatsByMonth,
  readPresetsCore,
  savePresetCore,
  deletePresetCore,
  getCheckRunsByEmail,
  appendCheckRunDb,
  deleteCheckRunDb,
  getNotificationsByEmail,
  appendNotificationDb,
  getSystemConfigDb,
  saveSystemConfigDb,
  getRulesByEmail,
  upsertRuleDb,
  deleteRuleDb
} from "@myhome/shared";
import { readPresets, savePreset, deletePreset } from "./graphPresets.js";
import { readInsights, saveInsight, deleteInsight } from "./graphInsights.js";
import { findComplexesNearStation, batchGeocodeComplexes } from "./geocoding.js";
import { generateTextWithGemini } from "./llmClient.js";

export function createGraphRouter(): Router {
  const router = Router();

  /** GET /api/graph/db-regions — DB에 등록된 모든 지역 목록 */
  router.get("/db-regions", async (_req, res) => {
    try {
      const regions = await getAllDbRegions();
      res.json(regions);
    } catch (err: any) {
      res.status(500).json({ error: err?.message ?? "내부 오류" });
    }
  });

  /** GET /api/graph/region-complexes — 특정 지역에 등록된 아파트 단지 목록 */
  router.get("/region-complexes", async (req, res) => {
    try {
      const lawdCode = req.query.lawdCode as string | undefined;
      const complexes = await getComplexesByRegion(lawdCode);
      res.json(complexes);
    } catch (err: any) {
      res.status(500).json({ error: err?.message ?? "내부 오류" });
    }
  });

  /** GET /api/graph/stats — 전체 노드 수 통계 */
  router.get("/stats", async (_req, res) => {
    try {
      const stats = await getGraphStats();
      res.json(stats);
    } catch (err: any) {
      res.status(500).json({ error: err?.message ?? "내부 오류" });
    }
  });

  /** GET /api/graph/complexes/search — 단지명 글로벌 검색 */
  router.get("/complexes/search", async (req, res) => {
    try {
      const query = (req.query.q as string || "").trim();
      const lawdCode = req.query.lawdCode as string | undefined;
      if (!query && !lawdCode) {
        res.json([]);
        return;
      }
      const results = await searchComplexNames(query, lawdCode);
      res.json(results);
    } catch (err: any) {
      res.status(500).json({ error: err?.message ?? "내부 오류" });
    }
  });

  /** GET /api/graph/complex/:name/trend */
  router.get("/complex/:name/trend", async (req, res) => {
    try {
      const complexName = decodeURIComponent(req.params.name);
      const lawdCode = req.query.lawdCode as string | undefined;
      const trend = await getComplexTrend(complexName, lawdCode);
      res.json({ complexName, lawdCode, trend });
    } catch (err: any) {
      res.status(500).json({ error: err?.message ?? "내부 오류" });
    }
  });

  /** GET /api/graph/region/:lawdCode/trend */
  router.get("/region/:lawdCode/trend", async (req, res) => {
    try {
      const { lawdCode } = req.params;
      const trend = await getRegionTrend(lawdCode);
      res.json({ lawdCode, trend });
    } catch (err: any) {
      res.status(500).json({ error: err?.message ?? "내부 오류" });
    }
  });

  /** GET /api/graph/search — 필터 조건 검색 */
  router.get("/search", async (req, res) => {
    try {
      const filter: GraphFilter = {
        lawdCode: req.query.lawdCode as string | undefined,
        complexName: req.query.complexName as string | undefined,
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
        minArea: req.query.minArea ? Number(req.query.minArea) : undefined,
        maxArea: req.query.maxArea ? Number(req.query.maxArea) : undefined,
      };
      const results = await searchTransactions(filter);
      res.json(results);
    } catch (err: any) {
      res.status(500).json({ error: err?.message ?? "내부 오류" });
    }
  });

  /** GET /api/graph/drilldown/regions — 드릴다운: 시/도 레벨 */
  router.get("/drilldown/regions", async (req, res) => {
    try {
      const complexName = req.query.complexName as string | undefined;
      const data = await getDrilldownRegions(complexName);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err?.message ?? "내부 오류" });
    }
  });

  /** GET /api/graph/drilldown/complexes — 드릴다운: 아파트 단지별 */
  router.get("/drilldown/complexes", async (req, res) => {
    try {
      const lawdCode = req.query.lawdCode as string;
      const complexName = req.query.complexName as string | undefined;
      if (!lawdCode) {
        res.status(400).json({ error: "lawdCode 파라미터가 누락되었습니다." });
        return;
      }
      const data = await getDrilldownComplexes(lawdCode, complexName);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err?.message ?? "내부 오류" });
    }
  });

  /** GET /api/graph/drilldown/areas — 드릴다운: 평수별 */
  router.get("/drilldown/areas", async (req, res) => {
    try {
      const complexName = req.query.complex as string;
      const lawdCode = req.query.lawdCode as string | undefined;
      if (!complexName) {
        res.status(400).json({ error: "complex 파라미터가 누락되었습니다." });
        return;
      }
      const data = await getDrilldownAreas(complexName, lawdCode);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err?.message ?? "내부 오류" });
    }
  });

  /** GET /api/graph/topology — 노드-링크용 토폴로지 데이터 */
  router.get("/topology", async (req, res) => {
    try {
      const filter: GraphFilter = {
        lawdCode: req.query.lawdCode as string | undefined,
        complexName: req.query.complexName as string | undefined,
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
      };
      const data = await getGraphTopology(filter);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err?.message ?? "내부 오류" });
    }
  });

  /** GET /api/graph/complex/:name/detail — 단지별 입체 분석 */
  router.get("/complex/:name/detail", async (req, res) => {
    try {
      const complexName = decodeURIComponent(req.params.name);
      const lawdCode = req.query.lawdCode as string | undefined;
      const area = req.query.area ? Number(req.query.area) : undefined;
      const data = await getComplexDetail(complexName, lawdCode, area);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err?.message ?? "내부 오류" });
    }
  });

  /** GET /api/graph/context — LLM 프롬프트 요약 텍스트 생성 */
  router.get("/context", async (req, res) => {
    try {
      const filter: GraphFilter = {
        lawdCode: req.query.lawdCode as string | undefined,
        complexName: req.query.complexName as string | undefined,
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
        minArea: req.query.minArea ? Number(req.query.minArea) : undefined,
        maxArea: req.query.maxArea ? Number(req.query.maxArea) : undefined,
      };
      const contextText = await getDataContext(filter);
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.send(contextText);
    } catch (err: any) {
      res.status(500).json({ error: err?.message ?? "내부 오류" });
    }
  });

  /** GET /api/graph/collect-stats/daily — 일단위 수집 집계 */
  router.get("/collect-stats/daily", async (_req, res) => {
    try {
      const stats = await getDailyCollectionStats();
      res.json(stats);
    } catch (err: any) {
      res.status(500).json({ error: err?.message ?? "내부 오류" });
    }
  });

  /** GET /api/graph/collect-stats/monthly — 등록월 단위 수집 집계 */
  router.get("/collect-stats/monthly", async (_req, res) => {
    try {
      const stats = await getMonthlyCollectionStats();
      res.json(stats);
    } catch (err: any) {
      res.status(500).json({ error: err?.message ?? "내부 오류" });
    }
  });

  /** GET /api/graph/collect-stats/region — 특정 날짜 또는 월의 지역별 수집 집계 */
  router.get("/collect-stats/region", async (req, res) => {
    try {
      const date = req.query.date as string | undefined;
      const month = req.query.month as string | undefined;

      if (!date && !month) {
        res.status(400).json({ error: "date 또는 month 파라미터가 누락되었습니다." });
        return;
      }

      if (month) {
        const stats = await getRegionCollectionStatsByMonth(month);
        res.json(stats);
      } else if (date) {
        const stats = await getRegionCollectionStatsByDate(date);
        res.json(stats);
      }
    } catch (err: any) {
      res.status(500).json({ error: err?.message ?? "내부 오류" });
    }
  });

  // 조회 조건 프리셋 라우트 (기존 graph_presets 테이블 사용)
  router.get("/presets", async (req, res) => {
    try {
      const email = req.user?.email || "bootstrap-admin@myhome.local";
      const presets = await readPresets(email);
      res.json(presets);
    } catch (err: any) {
      res.status(500).json({ error: err?.message ?? "내부 오류" });
    }
  });

  router.post("/presets", async (req, res) => {
    try {
      const email = req.user?.email || "bootstrap-admin@myhome.local";
      const { name, filter } = req.body;
      if (!name || !filter) {
        res.status(400).json({ error: "name 또는 filter가 누락되었습니다." });
        return;
      }
      const newPreset = await savePreset({ name, filter }, email);
      res.status(201).json(newPreset);
    } catch (err: any) {
      res.status(500).json({ error: err?.message ?? "내부 오류" });
    }
  });

  router.delete("/presets/:id", async (req, res) => {
    try {
      const email = req.user?.email || "bootstrap-admin@myhome.local";
      const { id } = req.params;
      const success = await deletePreset(id, email);
      if (success) {
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "존재하지 않는 프리셋 ID입니다." });
      }
    } catch (err: any) {
      res.status(500).json({ error: err?.message ?? "내부 오류" });
    }
  });

  // 종합 현황용 프리셋 라우트 (지역만 저장, graph_presets_overview 테이블 사용)
  router.get("/presets/overview", async (req, res) => {
    try {
      const email = req.user?.email || "bootstrap-admin@myhome.local";
      const presets = await readPresetsCore(email, "overview");
      res.json(presets);
    } catch (err: any) {
      res.status(500).json({ error: err?.message ?? "내부 오류" });
    }
  });

  router.post("/presets/overview", async (req, res) => {
    try {
      const email = req.user?.email || "bootstrap-admin@myhome.local";
      const { name, filter } = req.body;
      if (!name || !filter) {
        res.status(400).json({ error: "name 또는 filter가 누락되었습니다." });
        return;
      }
      const newPreset = await savePresetCore({ name, filter }, email, "overview");
      res.status(201).json(newPreset);
    } catch (err: any) {
      res.status(500).json({ error: err?.message ?? "내부 오류" });
    }
  });

  router.delete("/presets/overview/:id", async (req, res) => {
    try {
      const email = req.user?.email || "bootstrap-admin@myhome.local";
      const { id } = req.params;
      const success = await deletePresetCore(id, email, "overview");
      if (success) {
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "존재하지 않는 프리셋 ID입니다." });
      }
    } catch (err: any) {
      res.status(500).json({ error: err?.message ?? "내부 오류" });
    }
  });

  // 단지 분석용 프리셋 라우트 (지역 + 단지명 + 평수 저장, graph_presets_analysis 테이블 사용)
  router.get("/presets/analysis", async (req, res) => {
    try {
      const email = req.user?.email || "bootstrap-admin@myhome.local";
      const presets = await readPresetsCore(email, "analysis");
      res.json(presets);
    } catch (err: any) {
      res.status(500).json({ error: err?.message ?? "내부 오류" });
    }
  });

  router.post("/presets/analysis", async (req, res) => {
    try {
      const email = req.user?.email || "bootstrap-admin@myhome.local";
      const { name, regionName, buildingName, areaM2 } = req.body;
      if (!name || !regionName || !buildingName) {
        res.status(400).json({ error: "name, regionName, buildingName이 필요합니다." });
        return;
      }
      const newPreset = await savePresetCore({ name, regionName, buildingName, areaM2 }, email, "analysis");
      res.status(201).json(newPreset);
    } catch (err: any) {
      res.status(500).json({ error: err?.message ?? "내부 오류" });
    }
  });

  router.delete("/presets/analysis/:id", async (req, res) => {
    try {
      const email = req.user?.email || "bootstrap-admin@myhome.local";
      const { id } = req.params;
      const success = await deletePresetCore(id, email, "analysis");
      if (success) {
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "존재하지 않는 프리셋 ID입니다." });
      }
    } catch (err: any) {
      res.status(500).json({ error: err?.message ?? "내부 오류" });
    }
  });

  // LLM 인사이트 라우트 (graphInsights.ts 파일 사용)
  router.get("/insights", async (_req, res) => {
    try {
      const insights = await readInsights();
      res.json(insights);
    } catch (err: any) {
      res.status(500).json({ error: err?.message ?? "내부 오류" });
    }
  });

  router.post("/insights", async (req, res) => {
    try {
      const { title, filter, promptTemplate, generatedPrompt, response, source } = req.body;
      if (!title || !generatedPrompt) {
        res.status(400).json({ error: "title 또는 generatedPrompt가 누락되었습니다." });
        return;
      }
      const newInsight = await saveInsight({
        title,
        filter,
        promptTemplate,
        generatedPrompt,
        response,
        source: source || "manual",
      });
      res.status(201).json(newInsight);
    } catch (err: any) {
      res.status(500).json({ error: err?.message ?? "내부 오류" });
    }
  });

  router.delete("/insights/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await deleteInsight(id);
      if (success) {
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "존재하지 않는 인사이트 ID입니다." });
      }
    } catch (err: any) {
      res.status(500).json({ error: err?.message ?? "내부 오류" });
    }
  });

  /** POST /api/graph/insights/generate — LLM을 통한 분석 리포트 생성 및 저장 */
  router.post("/insights/generate", async (req, res) => {
    try {
      const { lawdCode, complexName, regionName } = req.body;
      if (!lawdCode) {
        res.status(400).json({ error: "lawdCode 파라미터가 필요합니다." });
        return;
      }

      const filter: GraphFilter = {
        lawdCode,
        complexName: complexName || undefined,
        startDate: undefined,
        endDate: undefined,
      };

      // 1. 실거래 요약 텍스트 컨텍스트 생성
      const contextText = await getDataContext(filter);

      // 2. 프롬프트 조립
      const targetName = complexName ? `${complexName} (${regionName || lawdCode})` : (regionName || lawdCode);
      const prompt = `
아래는 ${targetName} 아파트 실거래 데이터 요약 정보입니다.
이 데이터를 심층 분석하여 최근 거래 동향, 가격 추이의 특징(상승/하락/보합세), 그리고 실주거 및 투자 관점에서의 의견을 정리한 종합 분석 리포트를 작성해 주세요.

[실거래 데이터 정보]
${contextText}

[작성 규칙]
1. 한글로 작성해 주세요.
2. 가독성을 위해 마크다운(Markdown) 형식(소제목, 글머리 기호, 굵은 글씨 등)을 풍부하게 활용하세요.
3. 데이터에 기반하여 핵심 트렌드(평균가 변화량, 최고가 대비 현 시세 비율, 거래 활성도 등)를 정확하게 해석해 주세요.
4. 분석 마지막 부분에는 이 지역/단지에 대한 종합 투자 및 거주 요약 의견을 2~3줄 요약 문단으로 명시해 주세요.
`;

      // 3. Gemini API 호출
      const generatedReport = await generateTextWithGemini(prompt);

      // 4. 리포트 저장
      const title = complexName ? `${complexName} 실거래 분석 리포트` : `${regionName || lawdCode} 지역 실거래 분석 리포트`;
      const newInsight = await saveInsight({
        title,
        filter: { lawdCode, complexName },
        promptTemplate: "default-apartment-analysis",
        generatedPrompt: prompt,
        response: generatedReport,
        source: "api",
      });

      res.status(201).json(newInsight);
    } catch (err: any) {
      console.error("AI Insight generation failed:", err);
      res.status(500).json({ error: err?.message ?? "인사이트 생성 도중 내부 서버 오류가 발생했습니다." });
    }
  });

  // ──────────────────────────────────────────────────
  // 역세권 / Geocoding API
  // ──────────────────────────────────────────────────

  /** GET /api/graph/nearby-station — 지하철역 반경 내 아파트 단지 검색 */
  router.get("/nearby-station", async (req, res) => {
    try {
      const station = (req.query.station as string || "").trim();
      const radius = req.query.radius ? Number(req.query.radius) : 500;
      if (!station) {
        res.status(400).json({ error: "station 파라미터가 누락되었습니다." });
        return;
      }
      if (radius < 100 || radius > 5000) {
        res.status(400).json({ error: "radius는 100~5000 사이여야 합니다." });
        return;
      }
      const result = await findComplexesNearStation(station, radius);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err?.message ?? "내부 오류" });
    }
  });

  /** POST /api/graph/geocode-batch — 좌표 미확보 단지 일괄 Geocoding */
  router.post("/geocode-batch", async (req, res) => {
    try {
      const lawdCode = req.body?.lawdCode as string | undefined;
      const result = await batchGeocodeComplexes(lawdCode);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err?.message ?? "내부 오류" });
    }
  });

  /** GET /api/graph/geocode-stats — Geocoding 현황 통계 */
  router.get("/geocode-stats", async (_req, res) => {
    try {
      const { getGeocodeStats } = await import("@myhome/shared");
      const stats = getGeocodeStats();
      res.json(stats);
    } catch (err: any) {
      res.status(500).json({ error: err?.message ?? "내부 오류" });
    }
  });

  return router;
}