import { Router } from "express";
import {
  getGraphStats,
  getComplexTrend,
  getRegionTrend,
  searchTransactions,
  getDrilldownRegions,
  getDrilldownComplexes,
  getDrilldownAreas,
  getGraphTopology,
  getComplexDetail,
  getDataContext,
  getDailyCollectionStats,
  getMonthlyCollectionStats,
  getRegionCollectionStatsByMonth,
  getRegionCollectionStatsByDate,
  getComplexGeo,
  updateComplexCoords,
  type GraphFilter
} from "@myhome/shared";
import {
  geocodeAddress,
  findSubwayStationsNearCoords,
  getComplexInfraRating
} from "../../geocoding.js";
import { withCache, stableStringify, TTL } from "../../cache.js";
import { asyncHandler } from "../../middlewares/asyncHandler.js";

const router = Router();

/** GET /api/graph/stats — 전체 노드 수 통계 */
router.get("/stats", asyncHandler(async (_req, res) => {
  const stats = await withCache("stats", TTL.STATIC, () => getGraphStats());
  res.json(stats);
}));

/** GET /api/graph/complex/:name/trend */
router.get("/complex/:name/trend", asyncHandler(async (req, res) => {
  const complexName = decodeURIComponent(req.params.name as string);
  const lawdCode = req.query.lawdCode as string | undefined;
  const cacheKey = `trend:complex:${complexName}:${lawdCode ?? ""}`;
  const result = await withCache(cacheKey, TTL.TREND, async () => {
    const trend = await getComplexTrend(complexName, lawdCode);
    return { complexName, lawdCode, trend };
  });
  res.json(result);
}));

/** GET /api/graph/region/:lawdCode/trend */
router.get("/region/:lawdCode/trend", asyncHandler(async (req, res) => {
  const { lawdCode } = req.params;
  const cacheKey = `trend:region:${lawdCode}`;
  const result = await withCache(cacheKey, TTL.TREND, async () => {
    const trend = await getRegionTrend(lawdCode as string);
    return { lawdCode, trend };
  });
  res.json(result);
}));

/** GET /api/graph/search — 필터 조건 검색 */
router.get("/search", asyncHandler(async (req, res) => {
  let lawdCodes: string[] | undefined = undefined;
  if (req.query.lawdCodes) {
    if (Array.isArray(req.query.lawdCodes)) {
      lawdCodes = req.query.lawdCodes as string[];
    } else if (typeof req.query.lawdCodes === "string") {
      lawdCodes = (req.query.lawdCodes as string).split(",").map((s) => s.trim()).filter(Boolean);
    }
  }

  const filter: GraphFilter = {
    lawdCode: req.query.lawdCode as string | undefined,
    lawdCodes,
    complexName: req.query.complexName as string | undefined,
    startDate: req.query.startDate as string | undefined,
    endDate: req.query.endDate as string | undefined,
    minArea: req.query.minArea ? Number(req.query.minArea) : undefined,
    maxArea: req.query.maxArea ? Number(req.query.maxArea) : undefined,
    minHouseholds: req.query.minHouseholds ? Number(req.query.minHouseholds) : undefined,
    minTotalParking: req.query.minTotalParking ? Number(req.query.minTotalParking) : undefined,
    minParkingPerHousehold: req.query.minParkingPerHousehold ? Number(req.query.minParkingPerHousehold) : undefined,
    minBuildYear: req.query.minBuildYear ? Number(req.query.minBuildYear) : undefined,
    maxBuildYear: req.query.maxBuildYear ? Number(req.query.maxBuildYear) : undefined,
  };

  const cacheKey = `search:${stableStringify(filter)}`;
  const results = await withCache(cacheKey, TTL.SEARCH, () => searchTransactions(filter));
  res.json(results);
}));

/** GET /api/graph/drilldown/regions — 드릴다운: 시/도 레벨 */
router.get("/drilldown/regions", asyncHandler(async (req, res) => {
  const complexName = req.query.complexName as string | undefined;
  const cacheKey = `drilldown:regions:${complexName ?? ""}`;
  const data = await withCache(cacheKey, TTL.SEARCH, () => getDrilldownRegions(complexName));
  res.json(data);
}));

/** GET /api/graph/drilldown/complexes — 드릴다운: 아파트 단지별 */
router.get("/drilldown/complexes", asyncHandler(async (req, res) => {
  const lawdCode = req.query.lawdCode as string;
  const complexName = req.query.complexName as string | undefined;
  if (!lawdCode) {
    res.status(400).json({ error: "lawdCode 파라미터가 누락되었습니다." });
    return;
  }
  const cacheKey = `drilldown:complexes:${lawdCode}:${complexName ?? ""}`;
  const data = await withCache(cacheKey, TTL.SEARCH, () => getDrilldownComplexes(lawdCode, complexName));
  res.json(data);
}));

/** GET /api/graph/drilldown/areas — 드릴다운: 평수별 */
router.get("/drilldown/areas", asyncHandler(async (req, res) => {
  const complexName = req.query.complex as string;
  const lawdCode = req.query.lawdCode as string | undefined;
  if (!complexName) {
    res.status(400).json({ error: "complex 파라미터가 누락되었습니다." });
    return;
  }
  const cacheKey = `drilldown:areas:${complexName}:${lawdCode ?? ""}`;
  const data = await withCache(cacheKey, TTL.SEARCH, () => getDrilldownAreas(complexName, lawdCode));
  res.json(data);
}));

/** GET /api/graph/topology — 토폴로지 데이터 */
router.get("/topology", asyncHandler(async (req, res) => {
  const filter: GraphFilter = {
    lawdCode: req.query.lawdCode as string | undefined,
    complexName: req.query.complexName as string | undefined,
    startDate: req.query.startDate as string | undefined,
    endDate: req.query.endDate as string | undefined,
  };
  const data = await getGraphTopology(filter);
  res.json(data);
}));

/** GET /api/graph/complex/:name/detail — 단지별 입체 상세 분석 */
router.get("/complex/:name/detail", asyncHandler(async (req, res) => {
  const complexName = decodeURIComponent(req.params.name as string);
  const lawdCode = req.query.lawdCode as string | undefined;
  const area = req.query.area ? Number(req.query.area) : undefined;
  const startDate = req.query.startDate as string | undefined;
  const endDate = req.query.endDate as string | undefined;

  const cacheKey = `detail:${complexName}:${lawdCode ?? ""}:${area ?? ""}:${startDate ?? ""}:${endDate ?? ""}`;

  const resultPayload = await withCache(cacheKey, TTL.SEARCH, async () => {
    const data = await getComplexDetail(complexName, lawdCode, area, startDate, endDate);

    // 단지 지리정보 조회 및 지하철역 연동
    let complexInfo = getComplexGeo(complexName, lawdCode);
    let subways: any[] = [];
    let infraRating: any = null;

    if (complexInfo) {
      // 위경도 좌표가 없으면 Lazy Geocoding 수행
      if (complexInfo.lat === null || complexInfo.lng === null) {
        let query = "";
        if (complexInfo.dongName && complexInfo.jibun) {
          query = `${complexInfo.regionName} ${complexInfo.dongName} ${complexInfo.jibun}`;
        } else if (complexInfo.dongName) {
          query = `${complexInfo.regionName} ${complexInfo.dongName}`;
        } else {
          const cleanName = complexInfo.name.replace(/\(.*?\)/g, "").trim();
          query = `${complexInfo.regionName} ${cleanName}`;
        }

        const result = await geocodeAddress(query);
        if (result) {
          updateComplexCoords(complexInfo.id, result.lat, result.lng);
          complexInfo.lat = result.lat;
          complexInfo.lng = result.lng;
          console.log(`[Lazy Geocoding] 단지 좌표 확보: ${complexInfo.name} -> (${result.lat}, ${result.lng})`);
        }
      }

      // 건축물대장 메타데이터(세대수 등)가 없으면 Lazy 건축HUB 동기화 수행
      if (complexInfo.totalHouseholds == null) {
        try {
          const { syncComplexBuildingMeta } = await import("@myhome/shared");
          const synced = await syncComplexBuildingMeta(complexInfo.id);
          if (synced) {
            const reloaded = getComplexGeo(complexName, lawdCode);
            if (reloaded) complexInfo = reloaded;
          }
        } catch (err: any) {
          console.warn(`[Lazy BuildingSync] 실패: ${complexInfo.name}:`, err.message);
        }
      }

      // 좌표가 있는 경우 주변 지하철역 검색 (반경 1km)
      if (complexInfo.lat !== null && complexInfo.lng !== null) {
        subways = await findSubwayStationsNearCoords(complexInfo.lat, complexInfo.lng, 1000);
      }
    }

    // 주변 입지 가중 평점 및 등급 산출
    infraRating = await getComplexInfraRating(
      complexInfo?.lat ?? null,
      complexInfo?.lng ?? null,
      complexName,
      complexInfo?.parkingPerHousehold ?? null
    );

    return {
      ...data,
      complexInfo,
      subways,
      infraRating
    };
  });

  res.json(resultPayload);
}));

/** GET /api/graph/context — 데이터 컨텍스트 생성 */
router.get("/context", asyncHandler(async (req, res) => {
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
}));

/** GET /api/graph/collect-stats/daily — 일단위 수집 집계 */
router.get("/collect-stats/daily", asyncHandler(async (req, res) => {
  const days = req.query.days ? Number(req.query.days) : undefined;
  const stats = await getDailyCollectionStats(days);
  res.json(stats);
}));

/** GET /api/graph/collect-stats/monthly — 등록월 단위 수집 집계 */
router.get("/collect-stats/monthly", asyncHandler(async (req, res) => {
  const days = req.query.days ? Number(req.query.days) : undefined;
  const stats = await getMonthlyCollectionStats(days);
  res.json(stats);
}));

/** GET /api/graph/collect-stats/region — 특정 날짜 또는 월의 지역별 수집 집계 */
router.get("/collect-stats/region", asyncHandler(async (req, res) => {
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
}));

export default router;
