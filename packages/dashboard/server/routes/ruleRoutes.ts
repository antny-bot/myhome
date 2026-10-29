import express from "express";
import { z } from "zod";
import { validateBody } from "../validation.js";
import { sendNotifications } from "../notifications.js";
import { runRuleCheck } from "../ruleEngine.js";
import { deleteCheckRun, deleteRule, readStateForUser, updateRulePatch, upsertRule } from "../storage.js";
import type { ComparisonCriteria, RuleInput } from "../types.js";
import { getAuthenticatedEmail } from "../utils/authUtils.js";

const comparisonValues = ["none", "parking", "large_complex", "transit", "newer", "livability"] as const;

export const ruleSchema = z.object({
  name: z.string().min(1),
  regionName: z.string().min(1),
  regionCode: z.string().optional(),
  apartmentKeywords: z.array(z.string()).optional(),
  minPriceEok: z.number().positive().optional(),
  maxPriceEok: z.number().positive().optional(),
  minArea: z.number().positive().optional(),
  maxArea: z.number().positive().optional(),
  comparisonCriteria: z.enum(comparisonValues),
  intervalMinutes: z.number().int().min(10).optional(),
  alertTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  channels: z.array(z.enum(["telegram", "kakao"])).min(1),
  enabled: z.boolean()
});

export const ruleUpdateSchema = ruleSchema.partial();

export function createRuleRouter() {
  const router = express.Router();

  router.get("/rules", async (req, res, next) => {
    try {
      const email = getAuthenticatedEmail(req, res);
      if (!email) return;
      const state = await readStateForUser(email);
      res.json(state.rules);
    } catch (error) {
      next(error);
    }
  });

  router.post("/rules", validateBody(ruleSchema), async (req, res, next) => {
    try {
      const email = getAuthenticatedEmail(req, res);
      if (!email) return;
      const input = ruleSchema.parse(req.body) satisfies RuleInput;
      const rule = await upsertRule(input, undefined, email);
      res.status(201).json(rule);
    } catch (error) {
      next(error);
    }
  });

  router.patch("/rules/:id", validateBody(ruleUpdateSchema), async (req, res, next) => {
    try {
      const email = getAuthenticatedEmail(req, res);
      if (!email) return;
      const parsedBody = ruleUpdateSchema.parse(req.body);
      const rule = await updateRulePatch(req.params.id as string, parsedBody, email);
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
      const email = getAuthenticatedEmail(req, res);
      if (!email) return;
      const deleted = await deleteRule(req.params.id as string, email);
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
      const email = getAuthenticatedEmail(req, res);
      if (!email) return;
      const state = await readStateForUser(email);
      const rule = state.rules.find((item) => item.id === req.params.id);
      if (!rule) {
        res.status(404).json({ error: "Rule not found" });
        return;
      }
      const outcome = await runRuleCheck(rule);
      const notifications = await sendNotifications(rule, outcome.newMatches, email);
      res.json({ ...outcome, notifications });
    } catch (error) {
      next(error);
    }
  });

  router.get("/check-runs", async (req, res, next) => {
    try {
      const email = getAuthenticatedEmail(req, res);
      if (!email) return;
      const state = await readStateForUser(email);
      res.json(state.checkRuns);
    } catch (error) {
      next(error);
    }
  });

  router.delete("/check-runs/:id", async (req, res, next) => {
    try {
      const email = getAuthenticatedEmail(req, res);
      if (!email) return;
      const deleted = await deleteCheckRun(req.params.id as string, email);
      if (!deleted) {
        res.status(404).json({ error: "Check run not found" });
        return;
      }
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  router.get("/notifications", async (req, res, next) => {
    try {
      const email = getAuthenticatedEmail(req, res);
      if (!email) return;
      const state = await readStateForUser(email);
      res.json(state.notifications);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
