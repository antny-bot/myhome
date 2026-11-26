import { getDb } from "./connection.js";
import type {
  AuctionRecord,
  AuctionMatch,
  AuctionWithMatch,
  AuctionSummary,
  AuctionCollectRun,
  AuctionUsageCode,
  AuctionRegionCode,
  AuctionCandidate,
} from "../types.js";

/**
 * 법원경매 관련 테이블 및 마이그레이션 초기화
 */
export function initAuctionSchema(): void {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS auctions (
      docid            TEXT PRIMARY KEY,
      bo_cd            TEXT NOT NULL,
      sa_no            TEXT NOT NULL,
      srn_sa_no        TEXT NOT NULL,
      maemul_ser       TEXT NOT NULL,
      mokmul_ser       TEXT NOT NULL,
      lawd_code        TEXT,
      court_name       TEXT,
      dept_name        TEXT,
      court_tel        TEXT,
      usage_l          TEXT,
      usage_m          TEXT,
      usage_s          TEXT,
      usage_name       TEXT,
      addr_sido        TEXT,
      addr_sigu        TEXT,
      addr_dong        TEXT,
      addr_lotno       TEXT,
      addr_road        TEXT,
      addr_buld_no     TEXT,
      addr_full        TEXT,
      buld_name        TEXT,
      dong_ho          TEXT,
      area_m2          REAL,
      area_key         INTEGER,
      appraisal_amt    INTEGER,
      min_price        INTEGER,
      min_price_rate   REAL,
      failed_count     INTEGER,
      sale_date        TEXT,
      sale_time        TEXT,
      sale_place       TEXT,
      status_cd        TEXT,
      progress_cd      TEXT,
      bid_type_cd      TEXT,
      raw_json         TEXT,
      lat              REAL,
      lng              REAL,
      geocoded_at      TEXT,
      candidates_json  TEXT,
      match_checked_at TEXT,
      first_seen_at    TEXT NOT NULL,
      last_seen_at     TEXT NOT NULL,
      closed_at        TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_auctions_lawd_sale ON auctions(lawd_code, sale_date);
    CREATE INDEX IF NOT EXISTS idx_auctions_sale_date ON auctions(sale_date);
    CREATE INDEX IF NOT EXISTS idx_auctions_status ON auctions(status_cd, sale_date);

    CREATE TABLE IF NOT EXISTS auction_matches (
      docid          TEXT NOT NULL,
      complex_id     TEXT NOT NULL,
      method         TEXT NOT NULL,
      confidence     REAL NOT NULL,
      distance_m     REAL,
      name_score     REAL,
      area_verified  INTEGER,
      candidates_json TEXT,
      decided_by     TEXT,
      created_at     TEXT NOT NULL,
      PRIMARY KEY (docid, complex_id)
    );
    CREATE INDEX IF NOT EXISTS idx_auction_matches_complex ON auction_matches(complex_id);

    CREATE TABLE IF NOT EXISTS auction_collect_runs (
      id TEXT PRIMARY KEY,
      lawd_code TEXT,
      started_at TEXT NOT NULL,
      ended_at TEXT,
      request_count INTEGER DEFAULT 0,
      http_status INTEGER,
      ipcheck INTEGER,
      total_cnt INTEGER,
      fetched INTEGER,
      matched INTEGER,
      unmatched INTEGER,
      blocked INTEGER DEFAULT 0,
      error TEXT
    );

    CREATE TABLE IF NOT EXISTS auction_usage_codes (
      usage_l TEXT,
      usage_m TEXT,
      usage_s TEXT,
      name TEXT,
      observed_at TEXT,
      PRIMARY KEY (usage_l, usage_m, usage_s)
    );

    CREATE TABLE IF NOT EXISTS auction_region_codes (
      lawd_code TEXT PRIMARY KEY,
      sido_cd TEXT NOT NULL,
      sgg_cd TEXT NOT NULL,
      display_name TEXT,
      verified_at TEXT
    );
  `);

  // auctions 테이블 컬럼 마이그레이션 (candidates_json, match_checked_at)
  try {
    const auctionCols = db.prepare("PRAGMA table_info(auctions)").all() as { name: string }[];
    const auctionColNames = new Set(auctionCols.map((c) => c.name));
    if (!auctionColNames.has("candidates_json")) {
      db.exec("ALTER TABLE auctions ADD COLUMN candidates_json TEXT");
    }
    if (!auctionColNames.has("match_checked_at")) {
      db.exec("ALTER TABLE auctions ADD COLUMN match_checked_at TEXT");
    }
  } catch {
    // ignore
  }

  // rules 테이블 컬럼 마이그레이션 (kind, max_failed_count)
  try {
    const rulesCols = db.prepare("PRAGMA table_info(rules)").all() as { name: string }[];
    const rulesColNames = new Set(rulesCols.map((c) => c.name));
    if (!rulesColNames.has("kind")) {
      db.exec("ALTER TABLE rules ADD COLUMN kind TEXT DEFAULT 'transaction'");
    }
    if (!rulesColNames.has("max_failed_count")) {
      db.exec("ALTER TABLE rules ADD COLUMN max_failed_count INTEGER");
    }
  } catch {
    // rules 테이블이 없는 초기 상태이거나 테스트 환경일 수 있음
  }
}

/**
 * 경매 물건 upsert
 */
export function upsertAuction(record: AuctionRecord): void {
  upsertAuctions([record]);
}

/**
 * 경매 물건 배치 upsert
 */
export function upsertAuctions(records: AuctionRecord[]): void {
  if (records.length === 0) return;
  const db = getDb();

  const stmt = db.prepare(`
    INSERT INTO auctions (
      docid, bo_cd, sa_no, srn_sa_no, maemul_ser, mokmul_ser,
      lawd_code, court_name, dept_name, court_tel,
      usage_l, usage_m, usage_s, usage_name,
      addr_sido, addr_sigu, addr_dong, addr_lotno, addr_road, addr_buld_no, addr_full,
      buld_name, dong_ho, area_m2, area_key,
      appraisal_amt, min_price, min_price_rate, failed_count,
      sale_date, sale_time, sale_place,
      status_cd, progress_cd, bid_type_cd, raw_json,
      lat, lng, geocoded_at,
      first_seen_at, last_seen_at, closed_at
    ) VALUES (
      @docid, @boCd, @saNo, @srnSaNo, @maemulSer, @mokmulSer,
      @lawdCode, @courtName, @deptName, @courtTel,
      @usageL, @usageM, @usageS, @usageName,
      @addrSido, @addrSigu, @addrDong, @addrLotno, @addrRoad, @addrBuldNo, @addrFull,
      @buldName, @dongHo, @areaM2, @areaKey,
      @appraisalAmt, @minPrice, @minPriceRate, @failedCount,
      @saleDate, @saleTime, @salePlace,
      @statusCd, @progressCd, @bidTypeCd, @rawJson,
      @lat, @lng, @geocodedAt,
      @firstSeenAt, @lastSeenAt, @closedAt
    )
    ON CONFLICT(docid) DO UPDATE SET
      bo_cd = excluded.bo_cd,
      sa_no = excluded.sa_no,
      srn_sa_no = excluded.srn_sa_no,
      maemul_ser = excluded.maemul_ser,
      mokmul_ser = excluded.mokmul_ser,
      lawd_code = COALESCE(excluded.lawd_code, auctions.lawd_code),
      court_name = excluded.court_name,
      dept_name = excluded.dept_name,
      court_tel = excluded.court_tel,
      usage_l = excluded.usage_l,
      usage_m = excluded.usage_m,
      usage_s = excluded.usage_s,
      usage_name = excluded.usage_name,
      addr_sido = excluded.addr_sido,
      addr_sigu = excluded.addr_sigu,
      addr_dong = excluded.addr_dong,
      addr_lotno = excluded.addr_lotno,
      addr_road = excluded.addr_road,
      addr_buld_no = excluded.addr_buld_no,
      addr_full = excluded.addr_full,
      buld_name = excluded.buld_name,
      dong_ho = excluded.dong_ho,
      area_m2 = excluded.area_m2,
      area_key = excluded.area_key,
      appraisal_amt = excluded.appraisal_amt,
      min_price = excluded.min_price,
      min_price_rate = excluded.min_price_rate,
      failed_count = excluded.failed_count,
      sale_date = excluded.sale_date,
      sale_time = excluded.sale_time,
      sale_place = excluded.sale_place,
      status_cd = excluded.status_cd,
      progress_cd = excluded.progress_cd,
      bid_type_cd = excluded.bid_type_cd,
      raw_json = excluded.raw_json,
      lat = COALESCE(excluded.lat, auctions.lat),
      lng = COALESCE(excluded.lng, auctions.lng),
      geocoded_at = COALESCE(excluded.geocoded_at, auctions.geocoded_at),
      last_seen_at = excluded.last_seen_at,
      closed_at = CASE
        WHEN excluded.closed_at IS NOT NULL THEN COALESCE(auctions.closed_at, excluded.closed_at)
        WHEN excluded.status_cd = '01' THEN NULL
        ELSE auctions.closed_at
      END
  `);

  db.exec("BEGIN TRANSACTION");
  try {
    for (const item of records) {
      stmt.run({
        docid: item.docid,
        boCd: item.boCd,
        saNo: item.saNo,
        srnSaNo: item.srnSaNo,
        maemulSer: item.maemulSer,
        mokmulSer: item.mokmulSer,
        lawdCode: item.lawdCode ?? null,
        courtName: item.courtName ?? null,
        deptName: item.deptName ?? null,
        courtTel: item.courtTel ?? null,
        usageL: item.usageL ?? null,
        usageM: item.usageM ?? null,
        usageS: item.usageS ?? null,
        usageName: item.usageName ?? null,
        addrSido: item.addrSido ?? null,
        addrSigu: item.addrSigu ?? null,
        addrDong: item.addrDong ?? null,
        addrLotno: item.addrLotno ?? null,
        addrRoad: item.addrRoad ?? null,
        addrBuldNo: item.addrBuldNo ?? null,
        addrFull: item.addrFull ?? null,
        buldName: item.buldName ?? null,
        dongHo: item.dongHo ?? null,
        areaM2: item.areaM2 ?? null,
        areaKey: item.areaKey ?? null,
        appraisalAmt: item.appraisalAmt ?? null,
        minPrice: item.minPrice ?? null,
        minPriceRate: item.minPriceRate ?? null,
        failedCount: item.failedCount ?? null,
        saleDate: item.saleDate ?? null,
        saleTime: item.saleTime ?? null,
        salePlace: item.salePlace ?? null,
        statusCd: item.statusCd ?? null,
        progressCd: item.progressCd ?? null,
        bidTypeCd: item.bidTypeCd ?? null,
        rawJson: item.rawJson ?? null,
        lat: item.lat ?? null,
        lng: item.lng ?? null,
        geocodedAt: item.geocodedAt ?? null,
        firstSeenAt: item.firstSeenAt,
        lastSeenAt: item.lastSeenAt,
        closedAt: item.closedAt ?? null,
      });
    }
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }

}

const COURT_AUCTION_SEARCH_URL =
  "https://www.courtauction.go.kr/pgj/index.on?w2xPath=/pgj/ui/pgj100/PGJ151F00.xml&pgjId=151F00";

/**
 * DB row -> AuctionRecord 매핑
 */
function mapRowToAuction(row: any): AuctionWithMatch {
  const appraisalAmt = row.appraisal_amt != null ? Number(row.appraisal_amt) : null;
  const minPrice = row.min_price != null ? Number(row.min_price) : null;
  const minPriceRate = row.min_price_rate != null ? Number(row.min_price_rate) : null;
  const failedCount = row.failed_count != null ? Number(row.failed_count) : null;
  const areaM2 = row.area_m2 != null ? Number(row.area_m2) : null;
  const areaKey = row.area_key != null ? Number(row.area_key) : null;

  return {
    docid: row.docid,
    boCd: row.bo_cd,
    saNo: row.sa_no,
    srnSaNo: row.srn_sa_no,
    maemulSer: row.maemul_ser,
    mokmulSer: row.mokmul_ser,
    lawdCode: row.lawd_code,
    courtName: row.court_name,
    deptName: row.dept_name,
    courtTel: row.court_tel,
    usageL: row.usage_l,
    usageM: row.usage_m,
    usageS: row.usage_s,
    usageName: row.usage_name,
    addrSido: row.addr_sido,
    addrSigu: row.addr_sigu,
    addrDong: row.addr_dong,
    addrLotno: row.addr_lotno,
    addrRoad: row.addr_road,
    addrBuldNo: row.addr_buld_no,
    addrFull: row.addr_full,
    buldName: row.buld_name,
    dongHo: row.dong_ho,
    areaM2,
    areaKey,
    appraisalAmt,
    minPrice,
    minPriceRate,
    failedCount,
    saleDate: row.sale_date,
    saleTime: row.sale_time,
    salePlace: row.sale_place,
    statusCd: row.status_cd,
    progressCd: row.progress_cd,
    bidTypeCd: row.bid_type_cd,
    rawJson: row.raw_json,
    lat: row.lat != null ? Number(row.lat) : null,
    lng: row.lng != null ? Number(row.lng) : null,
    geocodedAt: row.geocoded_at,
    candidatesJson: row.candidates_json ?? null,
    matchCheckedAt: row.match_checked_at ?? null,
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
    closedAt: row.closed_at,
    // Convenience & UI aliases
    caseNo: row.srn_sa_no || row.sa_no || null,
    itemNo: row.maemul_ser || null,
    appraisalPrice: appraisalAmt,
    bidCount: failedCount,
    address: row.addr_full || [row.addr_sido, row.addr_sigu, row.addr_dong, row.addr_lotno].filter(Boolean).join(" ") || null,
    contact: row.court_tel || null,
    linkUrl: COURT_AUCTION_SEARCH_URL,
    status: row.status_cd === "01" ? "진행" : row.status_cd,
    remarks: row.sale_place || null,
    complexId: row.match_complex_id ?? null,
    complexName: row.match_complex_name ?? null,
    matchMethod: row.match_method ?? null,
    matchConfidence: row.match_confidence != null ? Number(row.match_confidence) : null,
    matchDecidedBy: row.match_decided_by ?? null,
    latestPriceEok: row.latest_price_eok != null ? Number(row.latest_price_eok) : null,
  };
}

export interface GetAuctionsFilter {
  lawdCode?: string;
  complexId?: string;
  complexName?: string;
  startDate?: string;
  endDate?: string;
  statusCd?: string;
  onlyActive?: boolean;
  onlyMatched?: boolean;
  limit?: number;
}

/**
 * 경매 목록 조회 (단지 매칭 정보 JOIN)
 */
export function getAuctions(filter: GetAuctionsFilter = {}): AuctionWithMatch[] {
  const db = getDb();
  const whereClauses: string[] = [];
  const params: any = {};

  if (filter.onlyActive !== false) {
    whereClauses.push("(a.closed_at IS NULL AND a.status_cd = '01' AND (a.sale_date IS NULL OR a.sale_date >= date('now', '+9 hours')))");
  }

  if (filter.onlyMatched) {
    whereClauses.push("m.complex_id IS NOT NULL");
  }

  if (filter.lawdCode) {
    whereClauses.push("a.lawd_code = @lawdCode");
    params.lawdCode = filter.lawdCode;
  }

  if (filter.complexId) {
    whereClauses.push("m.complex_id = @complexId");
    params.complexId = filter.complexId;
  }

  if (filter.complexName) {
    whereClauses.push("(c.name = @complexName OR (m.complex_id IS NULL AND a.buld_name = @complexName))");
    params.complexName = filter.complexName;
  }

  if (filter.startDate) {
    whereClauses.push("a.sale_date >= @startDate");
    params.startDate = filter.startDate;
  }

  if (filter.endDate) {
    whereClauses.push("a.sale_date <= @endDate");
    params.endDate = filter.endDate;
  }

  if (filter.statusCd) {
    whereClauses.push("a.status_cd = @statusCd");
    params.statusCd = filter.statusCd;
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
  const safeLimit =
    filter.limit !== undefined && Number.isFinite(Number(filter.limit)) && Number(filter.limit) > 0
      ? Math.min(Math.floor(Number(filter.limit)), 1000)
      : undefined;
  const limitSql = safeLimit ? `LIMIT ${safeLimit}` : "";

  const query = `
    WITH matched_complexes AS (
      SELECT DISTINCT m.complex_id
      FROM auctions a
      JOIN auction_matches m ON a.docid = m.docid
      LEFT JOIN complexes c ON m.complex_id = c.id
      ${whereSql}
    ),
    latest_tx AS (
      SELECT complex_id, price_eok
      FROM (
        SELECT
          t.complex_id,
          t.price_eok,
          ROW_NUMBER() OVER (PARTITION BY t.complex_id ORDER BY t.deal_date DESC) AS rn
        FROM transactions t
        JOIN matched_complexes mc ON t.complex_id = mc.complex_id
        WHERE t.cancel_date IS NULL
      )
      WHERE rn = 1
    )
    SELECT
      a.*,
      m.complex_id AS match_complex_id,
      c.name AS match_complex_name,
      m.method AS match_method,
      m.confidence AS match_confidence,
      m.decided_by AS match_decided_by,
      lt.price_eok AS latest_price_eok
    FROM auctions a
    LEFT JOIN auction_matches m ON a.docid = m.docid
    LEFT JOIN complexes c ON m.complex_id = c.id
    LEFT JOIN latest_tx lt ON m.complex_id = lt.complex_id
    ${whereSql}
    ORDER BY a.sale_date ASC, a.min_price ASC
    ${limitSql}
  `;

  const rows = db.prepare(query).all(params);
  return rows.map(mapRowToAuction);
}

/**
 * 단건 경매 물건 조회
 */
export function getAuctionByDocId(docid: string): AuctionWithMatch | undefined {
  const db = getDb();
  const query = `
    SELECT
      a.*,
      m.complex_id AS match_complex_id,
      c.name AS match_complex_name,
      m.method AS match_method,
      m.confidence AS match_confidence,
      m.decided_by AS match_decided_by,
      (
        SELECT t.price_eok
        FROM transactions t
        WHERE t.complex_id = m.complex_id
          AND t.cancel_date IS NULL
        ORDER BY t.deal_date DESC
        LIMIT 1
      ) AS latest_price_eok
    FROM auctions a
    LEFT JOIN auction_matches m ON a.docid = m.docid
    LEFT JOIN complexes c ON m.complex_id = c.id
    WHERE a.docid = ?
  `;
  const row = db.prepare(query).get(docid);
  if (!row) return undefined;
  return mapRowToAuction(row);
}

/**
 * 단지별 경매 물건 조회 (차트 및 상세 뷰 연동)
 */
export function getAuctionsByComplexId(complexId: string, onlyActive = true): AuctionWithMatch[] {
  return getAuctions({ complexId, onlyActive });
}

/**
 * 단지명 기준 경매 물건 조회
 */
export function getAuctionsByComplexName(complexName: string, onlyActive = true): AuctionWithMatch[] {
  return getAuctions({ complexName, onlyActive });
}

/**
 * 경매 요약 통계 조회
 */
export function getAuctionSummary(): AuctionSummary {
  const db = getDb();
  const query = `
    SELECT
      COUNT(DISTINCT a.docid) AS total_auctions,
      COUNT(DISTINCT m.complex_id) AS total_complexes,
      AVG(a.min_price_rate) AS avg_min_price_rate,
      SUM(CASE WHEN a.sale_date BETWEEN date('now', '+9 hours') AND date('now', '+9 hours', '+7 days') THEN 1 ELSE 0 END) AS upcoming_7_days
    FROM auctions a
    LEFT JOIN auction_matches m ON a.docid = m.docid
    WHERE a.closed_at IS NULL
      AND a.status_cd = '01'
      AND (a.sale_date IS NULL OR a.sale_date >= date('now', '+9 hours'))
  `;
  const row = db.prepare(query).get() as any;

  return {
    totalAuctions: Number(row?.total_auctions || 0),
    totalComplexes: Number(row?.total_complexes || 0),
    avgMinPriceRate: row?.avg_min_price_rate != null ? Number(row.avg_min_price_rate) : 0,
    upcoming7Days: Number(row?.upcoming_7_days || 0),
  };
}

/**
 * 단지 매칭 저장 (기존 수동 매칭 보존 및 1:1 매칭 보장)
 */
export function saveAuctionMatch(match: AuctionMatch): void {
  const db = getDb();

  // 자동 매칭인 경우 기존에 사용자가 수동 확정한 매칭이 있으면 덮어쓰지 않음
  if (match.decidedBy !== "user") {
    const existing = getAuctionMatch(match.docid);
    if (existing && existing.decidedBy === "user") {
      return;
    }
  }

  db.exec("BEGIN TRANSACTION");
  try {
    // 단일 docid에 다중 단지 매칭이 남지 않도록 기존 매칭 삭제 후 삽입
    db.prepare("DELETE FROM auction_matches WHERE docid = ?").run(match.docid);

    db.prepare(`
      INSERT INTO auction_matches (
        docid, complex_id, method, confidence, distance_m, name_score,
        area_verified, candidates_json, decided_by, created_at
      ) VALUES (
        @docid, @complexId, @method, @confidence, @distanceM, @nameScore,
        @areaVerified, @candidatesJson, @decidedBy, @createdAt
      )
    `).run({
      docid: match.docid,
      complexId: match.complexId,
      method: match.method,
      confidence: match.confidence,
      distanceM: match.distanceM ?? null,
      nameScore: match.nameScore ?? null,
      areaVerified: match.areaVerified ? 1 : 0,
      candidatesJson: match.candidatesJson ?? null,
      decidedBy: match.decidedBy,
      createdAt: match.createdAt,
    });

    db.prepare(`
      UPDATE auctions
      SET candidates_json = @candidatesJson, match_checked_at = @createdAt
      WHERE docid = @docid
    `).run({
      docid: match.docid,
      candidatesJson: match.candidatesJson ?? null,
      createdAt: match.createdAt,
    });

    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

/**
 * 단건 경매 물건의 매칭 정보 조회
 */
export function getAuctionMatch(docid: string): AuctionMatch | undefined {
  const db = getDb();
  const row = db.prepare("SELECT * FROM auction_matches WHERE docid = ?").get(docid) as any;
  if (!row) return undefined;
  return {
    docid: row.docid,
    complexId: row.complex_id,
    method: row.method,
    confidence: Number(row.confidence),
    distanceM: row.distance_m != null ? Number(row.distance_m) : null,
    nameScore: row.name_score != null ? Number(row.name_score) : null,
    areaVerified: row.area_verified === 1,
    candidatesJson: row.candidates_json,
    decidedBy: row.decided_by,
    createdAt: row.created_at,
  };
}

/**
 * 수동 매칭 확정
 */
export function manualMatchAuction(docid: string, complexId: string): void {
  saveAuctionMatch({
    docid,
    complexId,
    method: "manual",
    confidence: 1.0,
    distanceM: null,
    nameScore: 1.0,
    areaVerified: true,
    decidedBy: "user",
    createdAt: new Date().toISOString(),
  });
}

/**
 * 매칭 해제
 */
export function deleteAuctionMatch(docid: string): void {
  const db = getDb();
  db.prepare("DELETE FROM auction_matches WHERE docid = ?").run(docid);
}

/**
 * 미매핑 경매 물건의 후보 목록 및 매칭 시도 시각 저장
 */
export function updateAuctionCandidates(docid: string, candidates: AuctionCandidate[], checkedAt = new Date().toISOString()): void {
  const db = getDb();
  db.prepare(`
    UPDATE auctions
    SET candidates_json = ?, match_checked_at = ?
    WHERE docid = ?
  `).run(JSON.stringify(candidates), checkedAt, docid);
}

/**
 * 미매핑 경매 물건 및 후보 조회 (관리자용)
 */
export function getUnmatchedAuctions(limit = 50): { auction: AuctionRecord; candidates: AuctionCandidate[] }[] {
  const db = getDb();
  const safeLimit = Number.isFinite(Number(limit)) && Number(limit) > 0 ? Math.min(Math.floor(Number(limit)), 500) : 50;
  const query = `
    SELECT a.*
    FROM auctions a
    LEFT JOIN auction_matches m ON a.docid = m.docid
    WHERE m.docid IS NULL
      AND a.closed_at IS NULL
      AND a.status_cd = '01'
      AND (a.sale_date IS NULL OR a.sale_date >= date('now', '+9 hours'))
    ORDER BY a.sale_date ASC
    LIMIT ?
  `;
  const rows = db.prepare(query).all(safeLimit);

  return rows.map((row: any) => {
    const auction = mapRowToAuction(row);
    let candidates: AuctionCandidate[] = [];
    if (row.candidates_json) {
      try {
        candidates = JSON.parse(row.candidates_json);
      } catch {
        candidates = [];
      }
    } else if (row.raw_json) {
      try {
        const parsedRaw = JSON.parse(row.raw_json);
        if (Array.isArray(parsedRaw?.candidates)) {
          candidates = parsedRaw.candidates;
        }
      } catch {
        candidates = [];
      }
    }
    return { auction, candidates };
  });
}

/**
 * 당일(KST 기준) 누적 경매 수집 HTTP 요청 횟수 조회
 */
export function getTodayAuctionRequestCount(kstDateStr?: string): number {
  const db = getDb();
  if (kstDateStr) {
    const row = db.prepare(`
      SELECT COALESCE(SUM(request_count), 0) AS total_requests
      FROM auction_collect_runs
      WHERE date(started_at, '+9 hours') = ?
    `).get(kstDateStr) as { total_requests: number } | undefined;
    return Number(row?.total_requests || 0);
  }
  const row = db.prepare(`
    SELECT COALESCE(SUM(request_count), 0) AS total_requests
    FROM auction_collect_runs
    WHERE date(started_at, '+9 hours') = date('now', '+9 hours')
  `).get() as { total_requests: number } | undefined;
  return Number(row?.total_requests || 0);
}

/**
 * 좌표 업데이트
 */
export function updateAuctionCoords(docid: string, lat: number, lng: number): void {
  const db = getDb();
  db.prepare(`
    UPDATE auctions
    SET lat = ?, lng = ?, geocoded_at = ?
    WHERE docid = ?
  `).run(lat, lng, new Date().toISOString(), docid);
}

/**
 * 수집 실행 이력 생성
 */
export function createAuctionCollectRun(run: AuctionCollectRun): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO auction_collect_runs (
      id, lawd_code, started_at, ended_at, request_count,
      http_status, ipcheck, total_cnt, fetched, matched, unmatched, blocked, error
    ) VALUES (
      @id, @lawdCode, @startedAt, @endedAt, @requestCount,
      @httpStatus, @ipcheck, @totalCnt, @fetched, @matched, @unmatched, @blocked, @error
    )
  `).run({
    id: run.id,
    lawdCode: run.lawdCode ?? null,
    startedAt: run.startedAt,
    endedAt: run.endedAt ?? null,
    requestCount: run.requestCount,
    httpStatus: run.httpStatus ?? null,
    ipcheck: run.ipcheck != null ? run.ipcheck : null,
    totalCnt: run.totalCnt ?? null,
    fetched: run.fetched ?? null,
    matched: run.matched ?? null,
    unmatched: run.unmatched ?? null,
    blocked: run.blocked,
    error: run.error ?? null,
  });
}

/**
 * 수집 실행 이력 업데이트
 */
export function updateAuctionCollectRun(id: string, updates: Partial<AuctionCollectRun>): void {
  const db = getDb();
  const fields: string[] = [];
  const params: any = { id };

  if (updates.endedAt !== undefined) {
    fields.push("ended_at = @endedAt");
    params.endedAt = updates.endedAt;
  }
  if (updates.requestCount !== undefined) {
    fields.push("request_count = @requestCount");
    params.requestCount = updates.requestCount;
  }
  if (updates.httpStatus !== undefined) {
    fields.push("http_status = @httpStatus");
    params.httpStatus = updates.httpStatus;
  }
  if (updates.ipcheck !== undefined) {
    fields.push("ipcheck = @ipcheck");
    params.ipcheck = updates.ipcheck;
  }
  if (updates.totalCnt !== undefined) {
    fields.push("total_cnt = @totalCnt");
    params.totalCnt = updates.totalCnt;
  }
  if (updates.fetched !== undefined) {
    fields.push("fetched = @fetched");
    params.fetched = updates.fetched;
  }
  if (updates.matched !== undefined) {
    fields.push("matched = @matched");
    params.matched = updates.matched;
  }
  if (updates.unmatched !== undefined) {
    fields.push("unmatched = @unmatched");
    params.unmatched = updates.unmatched;
  }
  if (updates.blocked !== undefined) {
    fields.push("blocked = @blocked");
    params.blocked = updates.blocked;
  }
  if (updates.error !== undefined) {
    fields.push("error = @error");
    params.error = updates.error;
  }

  if (fields.length === 0) return;

  db.prepare(`UPDATE auction_collect_runs SET ${fields.join(", ")} WHERE id = @id`).run(params);
}

/**
 * 최근 수집 이력 목록
 */
export function getAuctionCollectRuns(limit = 20): AuctionCollectRun[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM auction_collect_runs ORDER BY started_at DESC LIMIT ?").all(limit) as any[];
  return rows.map((r) => ({
    id: r.id,
    lawdCode: r.lawd_code,
    startedAt: r.started_at,
    endedAt: r.ended_at,
    requestCount: Number(r.request_count || 0),
    httpStatus: r.http_status != null ? Number(r.http_status) : null,
    ipcheck: r.ipcheck != null ? Number(r.ipcheck) : null,
    totalCnt: r.total_cnt != null ? Number(r.total_cnt) : null,
    fetched: r.fetched != null ? Number(r.fetched) : null,
    matched: r.matched != null ? Number(r.matched) : null,
    unmatched: r.unmatched != null ? Number(r.unmatched) : null,
    blocked: Number(r.blocked || 0),
    error: r.error,
  }));
}

/**
 * 용도 코드 축적 저장
 */
export function saveAuctionUsageCode(code: AuctionUsageCode): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO auction_usage_codes (usage_l, usage_m, usage_s, name, observed_at)
    VALUES (@usageL, @usageM, @usageS, @name, @observedAt)
    ON CONFLICT(usage_l, usage_m, usage_s) DO UPDATE SET
      name = excluded.name,
      observed_at = excluded.observed_at
  `).run({
    usageL: code.usageL,
    usageM: code.usageM,
    usageS: code.usageS,
    name: code.name,
    observedAt: code.observedAt,
  });
}

/**
 * 용도 코드 목록 조회
 */
export function getAuctionUsageCodes(): AuctionUsageCode[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM auction_usage_codes ORDER BY usage_l, usage_m, usage_s").all() as any[];
  return rows.map((r) => ({
    usageL: r.usage_l,
    usageM: r.usage_m,
    usageS: r.usage_s,
    name: r.name,
    observedAt: r.observed_at,
  }));
}

/**
 * 시군구 코드 캐시 조회
 */
export function getAuctionRegionCode(lawdCode: string): AuctionRegionCode | undefined {
  const db = getDb();
  const row = db.prepare("SELECT * FROM auction_region_codes WHERE lawd_code = ?").get(lawdCode) as any;
  if (!row) return undefined;
  return {
    lawdCode: row.lawd_code,
    sidoCd: row.sido_cd,
    sggCd: row.sgg_cd,
    displayName: row.display_name,
    verifiedAt: row.verified_at,
  };
}

/**
 * 시군구 코드 캐시 저장
 */
export function setAuctionRegionCode(code: AuctionRegionCode): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO auction_region_codes (lawd_code, sido_cd, sgg_cd, display_name, verified_at)
    VALUES (@lawdCode, @sidoCd, @sggCd, @displayName, @verifiedAt)
    ON CONFLICT(lawd_code) DO UPDATE SET
      sido_cd = excluded.sido_cd,
      sgg_cd = excluded.sgg_cd,
      display_name = excluded.display_name,
      verified_at = excluded.verified_at
  `).run({
    lawdCode: code.lawdCode,
    sidoCd: code.sidoCd,
    sggCd: code.sggCd,
    displayName: code.displayName ?? null,
    verifiedAt: code.verifiedAt ?? null,
  });
}

