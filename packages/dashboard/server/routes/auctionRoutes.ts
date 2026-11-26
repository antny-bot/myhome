import express from "express";
import { z } from "zod";
import {
  getAuctions,
  getAuctionByDocId,
  getAuctionsByComplexName,
  getAuctionSummary,
  getUnmatchedAuctions,
  manualMatchAuction,
  getAuctionCollectRuns,
  getSystemConfigDb,
  saveSystemConfigDb,
  createLogger,
} from "@myhome/shared";
import { runAuctionCollector } from "@myhome/collector";
import { matchAuction, matchPendingAuctions } from "../auctionMatcher.js";
import { AuctionLock } from "../scheduler.js";
import { adminRequired } from "../authRoutes.js";

const log = createLogger("AuctionRoutes");

const matchBodySchema = z.object({
  complexId: z.string().min(1, "단지 ID는 필수입니다."),
});

const collectBodySchema = z.object({
  lawdCodes: z.array(z.string()).optional(),
});

const auctionConfigSchema = z.object({
  enabled: z.boolean().optional(),
  clearCooldown: z.boolean().optional(),
});

export function createAuctionRouter() {
  const router = express.Router();

  /**
   * 경매 목록 조회
   */
  router.get("/auctions", (req, res, next) => {
    try {
      const {
        lawdCode,
        complexId,
        complexName,
        startDate,
        endDate,
        statusCd,
        onlyActive,
        limit,
      } = req.query;

      const parsedLimit = limit ? Number(limit) : undefined;
      const safeLimit = parsedLimit && Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(Math.floor(parsedLimit), 1000) : undefined;

      const auctions = getAuctions({
        lawdCode: lawdCode ? String(lawdCode) : undefined,
        complexId: complexId ? String(complexId) : undefined,
        complexName: complexName ? String(complexName) : undefined,
        startDate: startDate ? String(startDate) : undefined,
        endDate: endDate ? String(endDate) : undefined,
        statusCd: statusCd ? String(statusCd) : undefined,
        onlyActive: onlyActive !== undefined ? onlyActive === "true" : true,
        limit: safeLimit,
      });

      res.json(auctions);
    } catch (err) {
      next(err);
    }
  });

  /**
   * 경매 요약 통계 (총 건수, 평균 매각가율 등)
   */
  router.get("/auctions/summary", (_req, res, next) => {
    try {
      const summary = getAuctionSummary();
      res.json(summary);
    } catch (err) {
      next(err);
    }
  });

  /**
   * 미매핑 경매 물건 목록 및 후보 (관리자용)
   */
  router.get("/auctions/unmatched", adminRequired, (req, res, next) => {
    try {
      const rawLimit = req.query.limit ? Number(req.query.limit) : 50;
      const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.floor(rawLimit), 500) : 50;
      const unmatched = getUnmatchedAuctions(limit);
      res.json(unmatched);
    } catch (err) {
      next(err);
    }
  });

  /**
   * 단건 경매 물건 상세 조회
   */
  router.get("/auctions/:docid", (req, res, next) => {
    try {
      const auction = getAuctionByDocId(req.params.docid);
      if (!auction) {
        res.status(404).json({ error: "경매 물건을 찾을 수 없습니다." });
        return;
      }
      res.json(auction);
    } catch (err) {
      next(err);
    }
  });

  /**
   * 단지 상세용 경매 목록 조회 (차트 기준선 및 탭 뷰)
   */
  router.get("/graph/complex/:name/auctions", (req, res, next) => {
    try {
      const complexName = decodeURIComponent(req.params.name);
      const auctions = getAuctionsByComplexName(complexName);
      res.json(auctions);
    } catch (err) {
      next(err);
    }
  });

  /**
   * 수동 단지 매칭 확정 (관리자용)
   */
  router.post("/auctions/:docid/match", adminRequired, (req, res, next) => {
    try {
      const parsed = matchBodySchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message || "잘못된 요청 형식입니다." });
        return;
      }

      manualMatchAuction(req.params.docid as string, parsed.data.complexId);
      log.info(`[AuctionRoutes] 경매 물건 ${req.params.docid} -> 단지 ${parsed.data.complexId} 수동 매칭 확정`);
      res.json({ success: true, docid: req.params.docid, complexId: parsed.data.complexId });
    } catch (err) {
      next(err);
    }
  });

  /**
   * 단건 매칭 재시도 트리거 (자동 매칭 파이프라인 재실행 - 관리자용)
   */
  router.post("/auctions/:docid/rematch", adminRequired, async (req, res, next) => {
    try {
      const result = await matchAuction(req.params.docid as string);
      res.json({ success: true, result });
    } catch (err) {
      next(err);
    }
  });

  /**
   * 관리자 수동 수집 실행
   */
  router.post("/auction/collect", adminRequired, async (req, res, next) => {
    try {
      if (AuctionLock.isLocked()) {
        res.status(409).json({ error: "경매 수집 작업이 이미 실행 중입니다." });
        return;
      }

      const parsed = collectBodySchema.safeParse(req.body);
      const lawdCodes = parsed.success ? parsed.data.lawdCodes : undefined;

      if (!AuctionLock.acquire()) {
        res.status(409).json({ error: "경매 수집 작업 락 획득에 실패했습니다." });
        return;
      }

      try {
        log.info("[AuctionRoutes] 수동 수집 트리거됨");
        const collectResult = await runAuctionCollector({ lawdCodes });
        const matchResult = await matchPendingAuctions(30);

        res.json({
          success: true,
          collect: collectResult,
          matching: matchResult,
        });
      } finally {
        AuctionLock.release();
      }
    } catch (err) {
      next(err);
    }
  });

  /**
   * 경매 수집 설정 변경 (활성화 토글 / 쿨다운 해제 - 관리자용)
   */
  router.post("/auction/config", adminRequired, (req, res, next) => {
    try {
      const parsed = auctionConfigSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "잘못된 설정 요청입니다." });
        return;
      }

      const updates: Record<string, string> = {};
      if (parsed.data.enabled !== undefined) {
        updates["auction.enabled"] = parsed.data.enabled ? "true" : "false";
      }
      if (parsed.data.clearCooldown) {
        updates["auction.blockedUntil"] = "";
      }

      if (Object.keys(updates).length > 0) {
        saveSystemConfigDb(updates);
      }

      const config = getSystemConfigDb();
      res.json({
        success: true,
        enabled: config["auction.enabled"] !== "false",
        blockedUntil: config["auction.blockedUntil"] || null,
        lastSuccessDate: config["auction.lastSuccessDate"] || null,
      });
    } catch (err) {
      next(err);
    }
  });

  /**
   * 최근 수집 실행 이력 조회 (관리자용)
   */
  router.get("/auction/collect-runs", adminRequired, (req, res, next) => {
    try {
      const rawLimit = req.query.limit ? Number(req.query.limit) : 20;
      const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.floor(rawLimit), 200) : 20;
      const runs = getAuctionCollectRuns(limit);
      const config = getSystemConfigDb();

      res.json({
        runs,
        isLocked: AuctionLock.isLocked(),
        enabled: config["auction.enabled"] !== "false",
        lastSuccessDate: config["auction.lastSuccessDate"] || null,
        blockedUntil: config["auction.blockedUntil"] || null,
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
