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
  GraphFilter
} from "@myhome/shared";
import { readPresets, savePreset, deletePreset } from "./graphPresets.js";
import { readInsights, saveInsight, deleteInsight } from "./graphInsights.js";

export function createGraphRouter(): Router {
  const router = Router();

  /** GET /api/graph/stats — 전체 노드 수 통계 */
  router.get("/stats", async (_req, res) => {
    try {
      const stats = await getGraphStats();
      res.json(stats);
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
  router.get("/drilldown/regions", async (_req, res) => {
    try {
      const data = await getDrilldownRegions();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err?.message ?? "내부 오류" });
    }
  });

  /** GET /api/graph/drilldown/complexes — 드릴다운: 아파트 단지별 */
  router.get("/drilldown/complexes", async (req, res) => {
    try {
      const lawdCode = req.query.lawdCode as string;
      if (!lawdCode) {
        res.status(400).json({ error: "lawdCode 파라미터가 누락되었습니다." });
        return;
      }
      const data = await getDrilldownComplexes(lawdCode);
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
      const data = await getComplexDetail(complexName, lawdCode);
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

  // 조회 조건 프리셋 라우트
  router.get("/presets", async (_req, res) => {
    try {
      const presets = await readPresets();
      res.json(presets);
    } catch (err: any) {
      res.status(500).json({ error: err?.message ?? "내부 오류" });
    }
  });

  router.post("/presets", async (req, res) => {
    try {
      const { name, filter } = req.body;
      if (!name || !filter) {
        res.status(400).json({ error: "name 또는 filter가 누락되었습니다." });
        return;
      }
      const newPreset = await savePreset({ name, filter });
      res.status(201).json(newPreset);
    } catch (err: any) {
      res.status(500).json({ error: err?.message ?? "내부 오류" });
    }
  });

  router.delete("/presets/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await deletePreset(id);
      if (success) {
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "존재하지 않는 프리셋 ID입니다." });
      }
    } catch (err: any) {
      res.status(500).json({ error: err?.message ?? "내부 오류" });
    }
  });

  // LLM 인사이트 라우트
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

  return router;
}
