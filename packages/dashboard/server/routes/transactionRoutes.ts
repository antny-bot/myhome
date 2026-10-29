import express from "express";
import { Config } from "../config.js";
import { validateBody, validateQuery, transactionQuerySchema, complexCoordsSchema, complexCoordsResetSchema, apartmentsListQuerySchema } from "../validation.js";
import { getApartmentList, getApartmentPrices } from "../mcpClient.js";
import { isKakaoConfigured, searchAddresses } from "../addressSearch.js";
import { getMonthsInRange, normalizeTransaction } from "../transactions.js";
import { 
  upsertTransactionBatch, 
  makeGraphDedupeKey, 
  getCachedApartments, 
  saveCachedApartments, 
  searchDbRegions, 
  getLocalTransactionsCount, 
  getLocalApartmentPrices, 
  resetGeocodeFailures, 
  updateComplexCoords, 
  resetComplexCoords, 
  mapLimit,
  type BatchUpsertItem 
} from "@myhome/shared";
import { graphCache } from "../cache.js";

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

export function createTransactionRouter() {
  const router = express.Router();

  router.post("/geocoding/reset-failures", async (_req, res, next) => {
    try {
      resetGeocodeFailures();
      res.json({ success: true, message: "Geocoding 실패 상태가 모두 초기화되었습니다." });
    } catch (err) {
      next(err);
    }
  });

  router.put("/complexes/coords", validateBody(complexCoordsSchema), async (req, res, next) => {
    try {
      const { complexId, lat, lng } = req.body;
      if (!complexId || lat === undefined || lng === undefined) {
        res.status(400).json({ error: "complexId, lat, lng are required" });
        return;
      }
      updateComplexCoords(complexId, Number(lat), Number(lng));
      res.json({ success: true, message: "좌표가 수동으로 수정되었습니다." });
    } catch (err) {
      next(err);
    }
  });

  router.post("/complexes/coords/reset", validateBody(complexCoordsResetSchema), async (req, res, next) => {
    try {
      const { complexId } = req.body;
      if (!complexId) {
        res.status(400).json({ error: "complexId is required" });
        return;
      }
      resetComplexCoords(complexId);
      res.json({ success: true, message: "좌표가 성공적으로 초기화되었습니다." });
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
        const results = searchDbRegions(query);
        res.json(results);
      }
    } catch (error) {
      next(error);
    }
  });

  router.get("/apartments/list", validateQuery(apartmentsListQuerySchema), async (req, res, next) => {
    try {
      const lawdCode = String(req.query.lawd_cd || "");
      const forceRefresh = req.query.refresh === "true";
      if (!lawdCode) {
        res.json({ apartments: [], cachedAt: null });
        return;
      }

      if (!forceRefresh) {
        const cached = getCachedApartments(lawdCode);
        if (cached.cachedAt && cached.apartments.length > 0) {
          res.json(cached);
          return;
        }
      }

      const list = await getApartmentList(lawdCode);
      saveCachedApartments(lawdCode, list);
      const fresh = getCachedApartments(lawdCode);
      res.json(fresh);
    } catch (error) {
      next(error);
    }
  });

  router.get("/transactions", validateQuery(transactionQuerySchema), async (req, res, next) => {
    try {
      const lawdCodeParam = String(req.query.lawd_cd || "");
      const lawdCodes = lawdCodeParam
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);
      const lawdCode = lawdCodes[0] || "";
      const dealMonth = String(req.query.deal_ymd || "");
      const startMonth = String(req.query.start_ymd || "");
      const endMonth = String(req.query.end_ymd || "");
      const forceRefresh = req.query.refresh === "true";
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

      const records: any[] = [];
      const now = new Date();
      const currentYm = now.getFullYear() * 100 + (now.getMonth() + 1);
      let isCacheHitOnly = true;
      const cacheHitMonths: { region: string; month: string }[] = [];
      const apiFetchMonths: { region: string; month: string }[] = [];

      for (const region of lawdCodes.length > 0 ? lawdCodes : [lawdCode]) {
        for (const month of months) {
          const targetYm = parseInt(month);
          const diffMonths = (Math.floor(currentYm / 100) - Math.floor(targetYm / 100)) * 12 + (currentYm % 100 - targetYm % 100);
          const localCount = getLocalTransactionsCount(region, month);
          if (!forceRefresh && diffMonths > 3 && localCount > 0) {
            cacheHitMonths.push({ region, month });
          } else {
            apiFetchMonths.push({ region, month });
          }
        }
      }

      for (const { region, month } of cacheHitMonths) {
        const localRecords = getLocalApartmentPrices(region, month);
        records.push(...localRecords);
      }

      if (apiFetchMonths.length > 0) {
        isCacheHitOnly = false;
        const concurrencyLimit = 5;
        for (let i = 0; i < apiFetchMonths.length; i += concurrencyLimit) {
          const chunk = apiFetchMonths.slice(i, i + concurrencyLimit);
          const chunkResults = await Promise.all(
            chunk.map(async ({ region, month }) => {
              try {
                const prices = await getApartmentPrices(region, month);
                return { region, month, transactions: prices.transactions, success: true };
              } catch (err: any) {
                console.error(`❌ [API Error] ${region}/${month} 호출 실패:`, err.message);
                return { region, month, transactions: [], success: false };
              }
            })
          );
          for (const resObj of chunkResults) {
            if (!resObj.success) continue;
            for (const item of resObj.transactions) {
              const normalized = normalizeTransaction(item, resObj.month);
              if (normalized) {
                records.push(normalized);
              }
            }
          }
        }
      }

      res.json(records);

      if (Config.GRAPH_DB_ENABLED === "true" && records.length > 0 && !isCacheHitOnly) {
        const regionInfo = { lawdCode: lawdCodes.length > 0 ? lawdCodes[0] : lawdCode, displayName: regionDisplayName };
        const batchItems: BatchUpsertItem[] = records.map(rec => {
          const rawObj = (rec as any).raw && typeof (rec as any).raw === "object" ? (rec as any).raw as Record<string, unknown> : {};
          return {
            complexName: rec.apartmentName,
            tx: {
              dedupeKey: makeGraphDedupeKey(lawdCode, rec.apartmentName, rec.dealDate, rec.areaM2, rec.floor),
              dealDate: rec.dealDate,
              priceEok: rec.priceEok,
              areaM2: rec.areaM2,
              floor: rec.floor,
            },
            addressInfo: {
              dongName: (rawObj.dongName ?? rawObj.umdNm ?? undefined) as string | undefined,
              jibun: (rawObj.jibun ?? undefined) as string | undefined,
              roadName: (rawObj.roadName ?? rawObj.roadNm ?? undefined) as string | undefined,
            },
          };
        });
        try {
          upsertTransactionBatch(regionInfo, batchItems);
          console.log(`[graphDb] 탐색 배치 upsert 완료 (${records.length}건) -> 캐시 초기화`);
          graphCache.clear();
        } catch (err) {
          console.error(`[graphDb] 탐색 배치 upsert 실패 (${records.length}건):`, err);
        }
      }
    } catch (error) {
      next(error);
    }
  });

  router.get("/transactions/batch", validateQuery(transactionQuerySchema), async (req, res, next) => {
    try {
      const { lawdCode, startMonth, endMonth } = req.query as Record<string, string>;
      
      if (!lawdCode || !startMonth || !endMonth) {
        return res.status(400).json({ error: 'lawd_cd, start_ymd, and end_ymd are required' });
      }
      
      const monthPattern = /^\d{6}$/;
      if (!monthPattern.test(startMonth) || !monthPattern.test(endMonth)) {
        return res.status(400).json({ error: 'start_ymd and end_ymd must be in YYYYMM format' });
      }

      const months = getMonthsInRange(startMonth, endMonth);
      const results = await mapLimit(months, 3, (m: string) => getApartmentPrices(lawdCode, m));
      const flattened = results.map((r) => r.transactions).flat();
      
      res.json({ ok: true, data: flattened });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
