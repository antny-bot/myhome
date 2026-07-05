import express from "express";
import { z } from "zod";
import { isTelegramConfigured, sendNotifications } from "./notifications.js";
import { getSourceLimitNotice, runRuleCheck } from "./ruleEngine.js";
import { deleteCheckRun, deleteRule, readState, updateRulePatch, upsertRule, getSystemConfig, saveSystemConfig } from "./storage.js";
import { getApartmentList, getApartmentPrices, searchRegionCandidates } from "./mcpClient.js";
import { isKakaoConfigured, searchAddresses } from "./addressSearch.js";
import { getMonthsInRange, normalizeTransaction } from "./transactions.js";
import type { ComparisonCriteria, RuleInput, SystemConfig } from "./types.js";
import { upsertTransaction, makeGraphDedupeKey } from "@myhome/shared";

const comparisonValues: ComparisonCriteria[] = ["none", "parking", "large_complex", "transit", "newer", "livability"];

const ruleSchema = z.object({
  name: z.string().min(1),
  regionName: z.string().min(1),
  apartmentKeywords: z.array(z.string()).optional(),
  minPriceEok: z.number().positive().optional(),
  maxPriceEok: z.number().positive().optional(),
  comparisonCriteria: z.enum(comparisonValues),
  intervalMinutes: z.number().int().min(10),
  channels: z.array(z.enum(["telegram", "kakao"])).min(1),
  enabled: z.boolean()
});

function cleanRegionDisplayName(displayName: string): string {
  const match = displayName.match(/\(([^)]+)\)/);
  let address = match ? match[1].trim() : displayName.trim();

  const parts = address.split(/\s+/);
  if (parts.length >= 2) {
    if (parts[0].startsWith("세종")) {
      return "세종특별자치시";
    }
    if (parts.length >= 3 && (parts[2].endsWith("구") || parts[2].endsWith("군"))) {
      return `${parts[0]} ${parts[1]} ${parts[2]}`;
    }
    return `${parts[0]} ${parts[1]}`;
  }
  return address;
}

export function createRouter() {
  const router = express.Router();

  router.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  router.get("/config", (_req, res) => {
    res.json({
      telegramConfigured: isTelegramConfigured(),
      kakaoStatus: "phase-2",
      kakaoSearchConfigured: isKakaoConfigured(),
      kakaoConfigured: Boolean(process.env.KAKAO_REST_API_KEY),
      jusoConfigured: Boolean(process.env.JUSO_CONFM_KEY),
      dataGoKrConfigured: Boolean(process.env.DATA_GO_KR_API_KEY),
      kakaoJavascriptConfigured: Boolean(process.env.KAKAO_JAVASCRIPT_KEY),
      kakaoNativeAppConfigured: Boolean(process.env.KAKAO_NATIVE_APP_KEY),
      dataSourceNotice: getSourceLimitNotice()
    });
  });

  router.get("/system-config", async (_req, res, next) => {
    try {
      const config = await getSystemConfig();
      res.json({
        telegramBotToken: config.telegramBotToken ? "●●●●●●●●" : (process.env.TELEGRAM_BOT_TOKEN ? "●●●●●●●●" : ""),
        telegramChatId: config.telegramChatId ? "●●●●●●●●" : (process.env.TELEGRAM_CHAT_ID ? "●●●●●●●●" : ""),
        kakaoRestApiKey: config.kakaoRestApiKey ? "●●●●●●●●" : (process.env.KAKAO_REST_API_KEY ? "●●●●●●●●" : ""),
        jusoConfmKey: config.jusoConfmKey ? "●●●●●●●●" : (process.env.JUSO_CONFM_KEY ? "●●●●●●●●" : ""),
        dataGoKrApiKey: config.dataGoKrApiKey ? "●●●●●●●●" : (process.env.DATA_GO_KR_API_KEY ? "●●●●●●●●" : ""),
        kakaoJavascriptKey: config.kakaoJavascriptKey ? "●●●●●●●●" : (process.env.KAKAO_JAVASCRIPT_KEY ? "●●●●●●●●" : ""),
        kakaoNativeAppKey: config.kakaoNativeAppKey ? "●●●●●●●●" : (process.env.KAKAO_NATIVE_APP_KEY ? "●●●●●●●●" : "")
      });
    } catch (err) {
      next(err);
    }
  });

  router.post("/system-config", async (req, res, next) => {
    try {
      const body = req.body;
      const update: SystemConfig = {};

      if (body.telegramBotToken !== undefined && body.telegramBotToken !== "●●●●●●●●") {
        update.telegramBotToken = body.telegramBotToken;
      }
      if (body.telegramChatId !== undefined && body.telegramChatId !== "●●●●●●●●") {
        update.telegramChatId = body.telegramChatId;
      }
      if (body.kakaoRestApiKey !== undefined && body.kakaoRestApiKey !== "●●●●●●●●") {
        update.kakaoRestApiKey = body.kakaoRestApiKey;
      }
      if (body.jusoConfmKey !== undefined && body.jusoConfmKey !== "●●●●●●●●") {
        update.jusoConfmKey = body.jusoConfmKey;
      }
      if (body.dataGoKrApiKey !== undefined && body.dataGoKrApiKey !== "●●●●●●●●") {
        update.dataGoKrApiKey = body.dataGoKrApiKey;
      }
      if (body.kakaoJavascriptKey !== undefined && body.kakaoJavascriptKey !== "●●●●●●●●") {
        update.kakaoJavascriptKey = body.kakaoJavascriptKey;
      }
      if (body.kakaoNativeAppKey !== undefined && body.kakaoNativeAppKey !== "●●●●●●●●") {
        update.kakaoNativeAppKey = body.kakaoNativeAppKey;
      }

      await saveSystemConfig(update);
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  router.get("/regions/search", async (req, res, next) => {
    try {
      const query = String(req.query.query || "");
      if (!query) {
        res.json([]);
        return;
      }

      if (isKakaoConfigured()) {
        const results = await searchAddresses(query);
        res.json(results);
      } else {
        // MCP 지역코드 조회의 동 단위 후보를 시/군/구 단위로 묶어 narrowing 후보로 반환한다.
        const results = await searchRegionCandidates(query);
        res.json(results);
      }
    } catch (error) {
      next(error);
    }
  });

  router.get("/apartments/list", async (req, res, next) => {
    try {
      const lawdCode = String(req.query.lawd_cd || "");
      if (!lawdCode) {
        res.json([]);
        return;
      }
      const list = await getApartmentList(lawdCode);
      res.json(list);
    } catch (error) {
      next(error);
    }
  });

  router.get("/transactions", async (req, res, next) => {
    try {
      const lawdCode = String(req.query.lawd_cd || "");
      const dealMonth = String(req.query.deal_ymd || "");
      const startMonth = String(req.query.start_ymd || "");
      const endMonth = String(req.query.end_ymd || "");
      let regionDisplayName = String(req.query.region_name || "").trim();
      if (!regionDisplayName || /^\d{5}$/.test(regionDisplayName)) {
        try {
          const resolved = await searchRegionCandidates(lawdCode);
          if (resolved.length > 0) {
            regionDisplayName = resolved[0].displayName;
          } else {
            regionDisplayName = lawdCode;
          }
        } catch {
          regionDisplayName = lawdCode;
        }
      }
      regionDisplayName = cleanRegionDisplayName(regionDisplayName);
      if (!lawdCode) {
        res.status(400).json({ error: "lawd_cd is required" });
        return;
      }

      const monthPattern = /^\d{6}$/;
      const months = startMonth && endMonth
        ? (monthPattern.test(startMonth) && monthPattern.test(endMonth) ? getMonthsInRange(startMonth, endMonth) : [])
        : (monthPattern.test(dealMonth) ? [dealMonth] : []);

      if (months.length === 0) {
        res.status(400).json({ error: "deal_ymd(YYYYMM) or start_ymd~end_ymd range is required" });
        return;
      }

      const records = [];
      for (const month of months) {
        const prices = await getApartmentPrices(lawdCode, month);
        for (const item of prices.transactions) {
          const normalized = normalizeTransaction(item, month);
          if (normalized) records.push(normalized);
        }
      }
      res.json(records);

      // 그래프 DB 적재 — 응답 후 백그라운드로 처리 (조회 속도에 영향 없음)
      if (process.env.GRAPH_DB_ENABLED === "true" && records.length > 0) {
        const regionInfo = { lawdCode, displayName: regionDisplayName };
        for (const rec of records) {
          const graphKey = makeGraphDedupeKey(lawdCode, rec.apartmentName, rec.dealDate, rec.areaM2, rec.floor);
          upsertTransaction(regionInfo, rec.apartmentName, {
            dedupeKey: graphKey,
            dealDate:  rec.dealDate,
            priceEok:  rec.priceEok,
            areaM2:    rec.areaM2,
            floor:     rec.floor,
          }).catch((err: any) =>
            console.error(`[graphDb] 탐색 upsert 실패 (${rec.apartmentName}):`, err)
          );
        }
      }
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
      const parsedBody = ruleSchema.partial().parse(req.body);
      const rule = await updateRulePatch(req.params.id, parsedBody);
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

  router.delete("/check-runs/:id", async (req, res, next) => {
    try {
      const deleted = await deleteCheckRun(req.params.id);
      if (!deleted) {
        res.status(404).json({ error: "Check run not found" });
        return;
      }
      res.status(204).end();
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
