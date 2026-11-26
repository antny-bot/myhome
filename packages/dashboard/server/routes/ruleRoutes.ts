import express from "express";
import { z } from "zod";
import { validateBody } from "../validation.js";
import { sendNotifications, sendAuctionNotifications } from "../notifications.js";
import { runRuleCheck } from "../ruleEngine.js";
import { checkAuctionRule } from "../auctionEngine.js";
import { appendCheckRun, deleteCheckRun, deleteRule, readStateForUser, updateRulePatch, upsertRule } from "../storage.js";
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
  enabled: z.boolean(),
  kind: z.enum(["transaction", "auction", "both"]).optional(),
  maxFailedCount: z.number().int().min(0).optional()
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

      const kind = rule.kind || "transaction";
      if (kind === "auction") {
        const checkRes = checkAuctionRule(rule as any, email);
        const matchedAuctions = checkRes?.matchedAuctions ?? [];
        const newKeys = checkRes?.newDedupeKeys ?? [];
        const notifications =
          checkRes && matchedAuctions.length > 0
            ? await sendAuctionNotifications(rule, checkRes.message, newKeys, email)
            : [];
        const checkRun = {
          id: `chk_auc_${Date.now()}_${rule.id}`,
          ruleId: rule.id,
          ruleName: rule.name,
          matched: matchedAuctions.length > 0,
          summary:
            matchedAuctions.length > 0
              ? `경매 물건 ${matchedAuctions.length}건 매칭됨`
              : "조건에 맞는 신규 경매 물건이 없습니다.",
          matches: matchedAuctions as any,
          sourceLimitNotice: "",
          createdAt: new Date().toISOString(),
        };
        await appendCheckRun(checkRun, newKeys, email);
        res.json({ checkRun, newMatches: matchedAuctions, notifications });
        return;
      }

      const outcome = await runRuleCheck(rule);
      const notifications = await sendNotifications(rule, outcome.newMatches, email);

      if (kind === "both") {
        const checkRes = checkAuctionRule(rule as any, email);
        if (checkRes && checkRes.matchedAuctions.length > 0) {
          const aucNotifs = await sendAuctionNotifications(rule, checkRes.message, checkRes.newDedupeKeys, email);
          notifications.push(...aucNotifs);
          await appendCheckRun(
            {
              id: `chk_auc_${Date.now()}_${rule.id}`,
              ruleId: rule.id,
              ruleName: rule.name,
              matched: true,
              summary: `경매 물건 ${checkRes.matchedAuctions.length}건 매칭됨`,
              matches: checkRes.matchedAuctions as any,
              sourceLimitNotice: "",
              createdAt: new Date().toISOString(),
            },
            checkRes.newDedupeKeys,
            email
          );
        }
      }

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
