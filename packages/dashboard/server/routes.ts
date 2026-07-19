import express from "express";
import { z } from "zod";
import { isTelegramConfigured, sendNotifications } from "./notifications.js";
import { getSourceLimitNotice, runRuleCheck } from "./ruleEngine.js";
import { deleteCheckRun, deleteRule, readState, readStateForUser, updateRulePatch, upsertRule, getSystemConfig, saveSystemConfig } from "./storage.js";
import { getApartmentList, getApartmentPrices } from "./mcpClient.js";
import { isKakaoConfigured, searchAddresses } from "./addressSearch.js";
import { getMonthsInRange, normalizeTransaction } from "./transactions.js";
import type { ComparisonCriteria, RuleInput, SystemConfig } from "./types.js";
import { upsertTransaction, makeGraphDedupeKey, getCachedApartments, saveCachedApartments, searchDbRegions, getLocalTransactionsCount, getLocalApartmentPrices, getUserSettings, saveUserSettings } from "@myhome/shared";
import { adminRequired } from "./authRoutes.js";

const comparisonValues: ComparisonCriteria[] = ["none", "parking", "large_complex", "transit", "newer", "livability"];

const ruleSchema = z.object({
  name: z.string().min(1),
  regionName: z.string().min(1),
  regionCode: z.string().optional(),
  apartmentKeywords: z.array(z.string()).optional(),
  minPriceEok: z.number().positive().optional(),
  maxPriceEok: z.number().positive().optional(),
  minArea: z.number().positive().optional(),
  maxArea: z.number().positive().optional(),
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
      kakaoJavascriptKey: process.env.KAKAO_JAVASCRIPT_KEY || "",
      kakaoNativeAppConfigured: Boolean(process.env.KAKAO_NATIVE_APP_KEY),
      dataSourceNotice: getSourceLimitNotice()
    });
  });

  router.get("/system-config", adminRequired, async (_req, res, next) => {
    try {
      const config = await getSystemConfig();
      res.json({
        telegramBotToken: config.telegramBotToken ? "●●●●●●●●" : (process.env.TELEGRAM_BOT_TOKEN ? "●●●●●●●●" : ""),
        telegramChatId: config.telegramChatId ? "●●●●●●●●" : (process.env.TELEGRAM_CHAT_ID ? "●●●●●●●●" : ""),
        kakaoRestApiKey: config.kakaoRestApiKey ? "●●●●●●●●" : (process.env.KAKAO_REST_API_KEY ? "●●●●●●●●" : ""),
        jusoConfmKey: config.jusoConfmKey ? "●●●●●●●●" : (process.env.JUSO_CONFM_KEY ? "●●●●●●●●" : ""),
        dataGoKrApiKey: config.dataGoKrApiKey ? "●●●●●●●●" : (process.env.DATA_GO_KR_API_KEY ? "●●●●●●●●" : ""),
        kakaoJavascriptKey: config.kakaoJavascriptKey ? "●●●●●●●●" : (process.env.KAKAO_JAVASCRIPT_KEY ? "●●●●●●●●" : ""),
        kakaoNativeAppKey: config.kakaoNativeAppKey ? "●●●●●●●●" : (process.env.KAKAO_NATIVE_APP_KEY ? "●●●●●●●●" : ""),
        googleClientId: config.googleClientId || (process.env.GOOGLE_CLIENT_ID || ""),
        googleClientSecret: config.googleClientSecret ? "●●●●●●●●" : (process.env.GOOGLE_CLIENT_SECRET ? "●●●●●●●●" : ""),
        googleRedirectUri: config.googleRedirectUri || (process.env.GOOGLE_REDIRECT_URI || ""),
        allowedEmails: config.allowedEmails || (process.env.ALLOWED_EMAILS || ""),
        adminEmails: config.adminEmails || (process.env.ADMIN_EMAILS || "")
      });
    } catch (err) {
      next(err);
    }
  });

  router.post("/system-config", adminRequired, async (req, res, next) => {
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
      if (body.googleClientId !== undefined) {
        update.googleClientId = body.googleClientId;
      }
      if (body.googleClientSecret !== undefined && body.googleClientSecret !== "●●●●●●●●") {
        update.googleClientSecret = body.googleClientSecret;
      }
      if (body.googleRedirectUri !== undefined) {
        update.googleRedirectUri = body.googleRedirectUri;
      }
      if (body.allowedEmails !== undefined) {
        update.allowedEmails = body.allowedEmails;
      }
      if (body.adminEmails !== undefined) {
        update.adminEmails = body.adminEmails;
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
        // 외부 주소 API 미설정 시 로컬 DB의 regions 테이블에서 검색
        const results = searchDbRegions(query);
        res.json(results);
      }
    } catch (error) {
      next(error);
    }
  });

  router.get("/apartments/list", async (req, res, next) => {
    try {
      const lawdCode = String(req.query.lawd_cd || "");
      const forceRefresh = req.query.refresh === "true";
      if (!lawdCode) {
        res.json({ apartments: [], cachedAt: null });
        return;
      }

      // 1. 강제 갱신이 아닌 경우 캐시 조회
      if (!forceRefresh) {
        const cached = getCachedApartments(lawdCode);
        if (cached.cachedAt && cached.apartments.length > 0) {
          res.json(cached);
          return;
        }
      }

      // 2. 캐시가 없거나 강제 갱신인 경우 국토부 API 호출
      const list = await getApartmentList(lawdCode);
      
      // 3. DB 캐시 저장
      saveCachedApartments(lawdCode, list);

      // 4. 저장한 결과(최신 갱신시각 포함)를 반환
      const fresh = getCachedApartments(lawdCode);
      res.json(fresh);
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
          const resolved = searchDbRegions(lawdCode);
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
      const now = new Date();
      const currentYm = now.getFullYear() * 100 + (now.getMonth() + 1); // YYYYMM
      let isCacheHitOnly = true;

      // 1. 캐시 히트와 API 호출 대상을 분류
      const cacheHitMonths: string[] = [];
      const apiFetchMonths: string[] = [];

      for (const month of months) {
        const targetYm = parseInt(month);
        const diffMonths = (Math.floor(currentYm / 100) - Math.floor(targetYm / 100)) * 12 
                         + (currentYm % 100 - targetYm % 100);
        const localCount = getLocalTransactionsCount(lawdCode, month);

        if (diffMonths > 3 && localCount > 0) {
          cacheHitMonths.push(month);
        } else {
          apiFetchMonths.push(month);
        }
      }

      // 2. 캐시 히트 데이터 즉시 로드
      for (const month of cacheHitMonths) {
        const localRecords = getLocalApartmentPrices(lawdCode, month);
        records.push(...localRecords);
        console.log(`[Cache Hit] ${lawdCode}/${month} - 로컬 DB 적재 데이터 서빙 (건수: ${localRecords.length})`);
      }

      // 3. 캐시 미스 데이터 병렬 처리 (동시성 제한: 5)
      if (apiFetchMonths.length > 0) {
        isCacheHitOnly = false;
        const concurrencyLimit = 5;
        for (let i = 0; i < apiFetchMonths.length; i += concurrencyLimit) {
          const chunk = apiFetchMonths.slice(i, i + concurrencyLimit);
          const chunkResults = await Promise.all(
            chunk.map(async (month) => {
              try {
                const prices = await getApartmentPrices(lawdCode, month);
                return { month, transactions: prices.transactions, success: true };
              } catch (err: any) {
                console.error(`❌ [API Error] ${lawdCode}/${month} 호출 실패:`, err.message);
                return { month, transactions: [], success: false };
              }
            })
          );

          for (const resObj of chunkResults) {
            if (!resObj.success) continue;
            const apiRecords = [];
            for (const item of resObj.transactions) {
              const normalized = normalizeTransaction(item, resObj.month);
              if (normalized) {
                records.push(normalized);
                apiRecords.push(normalized);
              }
            }
            console.log(`[Cache Miss/Refresh] ${lawdCode}/${resObj.month} - 국토부 API 호출 (반환: ${apiRecords.length}건)`);
          }
        }
      }

      res.json(records);

      // 그래프 DB 적재 — 캐시 히트만으로 충족된 경우는 중복 적재 스킵
      if (process.env.GRAPH_DB_ENABLED === "true" && records.length > 0 && !isCacheHitOnly) {
        const regionInfo = { lawdCode, displayName: regionDisplayName };
        for (const rec of records) {
          const graphKey = makeGraphDedupeKey(lawdCode, rec.apartmentName, rec.dealDate, rec.areaM2, rec.floor);
          // 원본 데이터에서 주소 정보 추출 (국토부 API 직접 호출 or apiClient 정규화 결과)
          const rawObj = ((rec as any).raw && typeof (rec as any).raw === 'object') ? (rec as any).raw as Record<string, unknown> : {};
          const addrInfo = {
            dongName: (rawObj.dongName ?? rawObj.umdNm ?? undefined) as string | undefined,
            jibun: (rawObj.jibun ?? undefined) as string | undefined,
            roadName: (rawObj.roadName ?? rawObj.roadNm ?? undefined) as string | undefined,
          };
          upsertTransaction(regionInfo, rec.apartmentName, {
            dedupeKey: graphKey,
            dealDate:  rec.dealDate,
            priceEok:  rec.priceEok,
            areaM2:    rec.areaM2,
            floor:     rec.floor,
          }, addrInfo).catch((err: any) =>
            console.error(`[graphDb] 탐색 upsert 실패 (${rec.apartmentName}):`, err)
          );
        }
      }
    } catch (error) {
      next(error);
    }
  });

  router.get("/rules", async (req, res, next) => {
    try {
      const email = req.user?.email || "bootstrap-admin@myhome.local";
      const state = await readStateForUser(email);
      res.json(state.rules);
    } catch (error) {
      next(error);
    }
  });

  router.post("/rules", async (req, res, next) => {
    try {
      const email = req.user?.email || "bootstrap-admin@myhome.local";
      const input = ruleSchema.parse(req.body) satisfies RuleInput;
      const rule = await upsertRule(input, undefined, email);
      res.status(201).json(rule);
    } catch (error) {
      next(error);
    }
  });

  router.patch("/rules/:id", async (req, res, next) => {
    try {
      const email = req.user?.email || "bootstrap-admin@myhome.local";
      const parsedBody = ruleSchema.partial().parse(req.body);
      const rule = await updateRulePatch(req.params.id, parsedBody, email);
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
      const email = req.user?.email || "bootstrap-admin@myhome.local";
      const deleted = await deleteRule(req.params.id, email);
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
      const email = req.user?.email || "bootstrap-admin@myhome.local";
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
      const email = req.user?.email || "bootstrap-admin@myhome.local";
      const state = await readStateForUser(email);
      res.json(state.checkRuns);
    } catch (error) {
      next(error);
    }
  });

  router.delete("/check-runs/:id", async (req, res, next) => {
    try {
      const email = req.user?.email || "bootstrap-admin@myhome.local";
      const deleted = await deleteCheckRun(req.params.id, email);
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
      const email = req.user?.email || "bootstrap-admin@myhome.local";
      const state = await readStateForUser(email);
      res.json(state.notifications);
    } catch (error) {
      next(error);
    }
  });

  router.get("/user-config", async (req, res, next) => {
    try {
      const email = req.user?.email || "bootstrap-admin@myhome.local";
      const settings = getUserSettings(email);
      res.json({
        telegramBotToken: settings?.telegramBotToken ? "●●●●●●●●" : "",
        telegramChatId: settings?.telegramChatId ? "●●●●●●●●" : "",
        kakaoRestApiKey: settings?.kakaoRestApiKey ? "●●●●●●●●" : "",
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/user-config", async (req, res, next) => {
    try {
      const email = req.user?.email || "bootstrap-admin@myhome.local";
      const body = req.body;
      const update: { telegramBotToken?: string | null; telegramChatId?: string | null; kakaoRestApiKey?: string | null } = {};

      if (body.telegramBotToken !== undefined && body.telegramBotToken !== "●●●●●●●●") {
        update.telegramBotToken = body.telegramBotToken;
      }
      if (body.telegramChatId !== undefined && body.telegramChatId !== "●●●●●●●●") {
        update.telegramChatId = body.telegramChatId;
      }
      if (body.kakaoRestApiKey !== undefined && body.kakaoRestApiKey !== "●●●●●●●●") {
        update.kakaoRestApiKey = body.kakaoRestApiKey;
      }

      saveUserSettings(email, update);
      res.json({ ok: true });
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
