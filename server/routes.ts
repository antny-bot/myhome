import express from "express";
import { z } from "zod";
import { isTelegramConfigured, sendNotifications } from "./notifications.js";
import { getSourceLimitNotice, runRuleCheck } from "./ruleEngine.js";
import { deleteRule, readState, updateRulePatch, upsertRule } from "./storage.js";
import { getRegionCode } from "./mcpClient.js";
import type { ComparisonCriteria, RuleInput } from "./types.js";

const comparisonValues: ComparisonCriteria[] = ["none", "parking", "large_complex", "transit", "newer", "livability"];

const ruleSchema = z.object({
  name: z.string().min(1),
  regionName: z.string().min(1),
  apartmentKeywords: z.array(z.string()).optional(),
  dealMonth: z.string().regex(/^\d{6}$/).optional(),
  startMonth: z.string().regex(/^\d{6}$/).optional(),
  endMonth: z.string().regex(/^\d{6}$/).optional(),
  minPriceEok: z.number().positive().optional(),
  maxPriceEok: z.number().positive().optional(),
  comparisonCriteria: z.enum(comparisonValues),
  intervalMinutes: z.number().int().min(10),
  channels: z.array(z.enum(["telegram", "kakao"])).min(1),
  enabled: z.boolean()
});

export function createRouter() {
  const router = express.Router();

  router.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  router.get("/config", (_req, res) => {
    res.json({
      telegramConfigured: isTelegramConfigured(),
      kakaoStatus: "phase-2",
      dataSourceNotice: getSourceLimitNotice()
    });
  });

  router.get("/regions/search", async (req, res, next) => {
    try {
      const query = String(req.query.query || "");
      if (!query) {
        res.json([]);
        return;
      }
      const result = await getRegionCode(query);
      res.json([result]); // 간단하게 검색 결과 하나만 반환 (MCP 한계상)
    } catch (error) {
      next(error);
    }
  });

  router.get("/apartments/list", async (req, res, next) => {
    try {
      const lawdCode = String(req.query.lawd_cd || "");
      const dealMonth = String(req.query.deal_ymd || "");
      if (!lawdCode || !dealMonth) {
        res.json([]);
        return;
      }
      const list = await getApartmentList(lawdCode, dealMonth);
      res.json(list);
    } catch (error) {
      next(error);
    }
  });

  router.get("/rules", async (_req, res, next) => {
    try {
      const state = await readState();
      res.json(state.rules);
    } catch (error) {
      next(error);
    }
  });

  router.post("/rules", async (req, res, next) => {
    try {
      const input = ruleSchema.parse(req.body) satisfies RuleInput;
      const rule = await upsertRule(input);
      res.status(201).json(rule);
    } catch (error) {
      next(error);
    }
  });

  router.patch("/rules/:id", async (req, res, next) => {
    try {
      const rule = await updateRulePatch(req.params.id, req.body);
      if (!rule) {
        res.status(404).json({ error: "Rule not found" });
        return;
      }
      res.json(rule);
    } catch (error) {
      next(error);
    }
  });

  router.delete("/rules/:id", async (req, res, next) => {
    try {
      const deleted = await deleteRule(req.params.id);
      if (!deleted) {
        res.status(404).json({ error: "Rule not found" });
        return;
      }
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  router.post("/rules/:id/run", async (req, res, next) => {
    try {
      const state = await readState();
      const rule = state.rules.find((item) => item.id === req.params.id);
      if (!rule) {
        res.status(404).json({ error: "Rule not found" });
        return;
      }
      const outcome = await runRuleCheck(rule);
      const notifications = await sendNotifications(rule, outcome.newMatches);
      res.json({ ...outcome, notifications });
    } catch (error) {
      next(error);
    }
  });

  router.get("/check-runs", async (_req, res, next) => {
    try {
      const state = await readState();
      res.json(state.checkRuns);
    } catch (error) {
      next(error);
    }
  });

  router.get("/notifications", async (_req, res, next) => {
    try {
      const state = await readState();
      res.json(state.notifications);
    } catch (error) {
      next(error);
    }
  });

  router.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid request", details: error.issues });
      return;
    }
    res.status(500).json({ error: error instanceof Error ? error.message : "Unexpected server error" });
  });

  return router;
}
