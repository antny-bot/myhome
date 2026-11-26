import {
  getDb,
  getAuctionByDocId,
  saveAuctionMatch,
  getAuctionMatch,
  updateAuctionCoords,
  updateAuctionCandidates,
  createLogger,
  type AuctionRecord,
  type AuctionMatch,
  type AuctionCandidate,
} from "@myhome/shared";
import { geocodeAddressDetailed } from "./geocoding-kakao.js";
import { haversineDistance } from "./geocoding-utils.js";

const log = createLogger("AuctionMatcher");

/**
 * 아파트 단지명 정규화
 */
export function normalizeComplexName(rawName?: string | null): string {
  if (!rawName) return "";
  let name = rawName.toLowerCase();

  // 브랜드 동의어 통일
  name = name
    .replace(/이편한세상|이-편한세상/g, "e편한세상")
    .replace(/한화포레나/g, "포레나")
    .replace(/gs자이|지에스자이/g, "자이")
    .replace(/대우푸르지오/g, "푸르지오")
    .replace(/포스코더샵/g, "더샵")
    .replace(/현대힐스테이트/g, "힐스테이트")
    .replace(/삼성래미안/g, "래미안")
    .replace(/현대아이파크/g, "아이파크");

  // 괄호 내용 제거
  name = name.replace(/\([^)]*\)/g, "");

  // 동, 층, 호, 주소 패턴 제거 (예: "323동 1층101호", "101동 202호", "323동")
  name = name.replace(/[0-9]+동\s*[0-9]+(?:층|호)?/g, "");
  name = name.replace(/[0-9]+층\s*[0-9]+호/g, "");
  name = name.replace(/[0-9]+호/g, "");
  name = name.replace(/[0-9]+동/g, "");

  // 아파트 관련 수식어 및 단지/차수 표준화
  name = name
    .replace(/[0-9]+단지/g, "")
    .replace(/(?:아파트|apt|단지)/gi, "")
    .replace(/제?([0-9]+)차/g, "$1차");

  // 특수문자 및 공백 제거
  name = name.replace(/[^a-z0-9가-힣]/g, "");


  return name;
}

/**
 * 2-gram 문자 토큰 집합 생성
 */
function getBiGrams(str: string): Set<string> {
  const set = new Set<string>();
  if (str.length < 2) {
    if (str.length === 1) set.add(str);
    return set;
  }
  for (let i = 0; i < str.length - 1; i++) {
    set.add(str.substring(i, i + 2));
  }
  return set;
}

/**
 * 토큰 자카드 유사도 (0~1)
 */
export function calculateJaccardSimilarity(str1: string, str2: string): number {
  const set1 = getBiGrams(str1);
  const set2 = getBiGrams(str2);
  if (set1.size === 0 && set2.size === 0) return 1;
  if (set1.size === 0 || set2.size === 0) return 0;

  let intersection = 0;
  for (const item of set1) {
    if (set2.has(item)) intersection++;
  }
  const union = set1.size + set2.size - intersection;
  return intersection / union;
}

/**
 * 레벤슈타인 거리 기반 유사도 (0~1)
 */
export function calculateLevenshteinSimilarity(str1: string, str2: string): number {
  const l1 = str1.length;
  const l2 = str2.length;
  if (l1 === 0 && l2 === 0) return 1;
  if (l1 === 0 || l2 === 0) return 0;

  const dp: number[][] = Array.from({ length: l1 + 1 }, () => new Array(l2 + 1).fill(0));

  for (let i = 0; i <= l1; i++) dp[i][0] = i;
  for (let j = 0; j <= l2; j++) dp[0][j] = j;

  for (let i = 1; i <= l1; i++) {
    for (let j = 1; j <= l2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,      // deletion
        dp[i][j - 1] + 1,      // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }

  const distance = dp[l1][l2];
  const maxLen = Math.max(l1, l2);
  return Math.max(0, 1 - distance / maxLen);
}

/**
 * 종합 이름 유사도 점수 (0~1)
 */
export function calculateNameScore(auctionName: string, complexName: string, isFtsHit = false): number {
  const norm1 = normalizeComplexName(auctionName);
  const norm2 = normalizeComplexName(complexName);

  if (!norm1 || !norm2) return 0;
  if (norm1 === norm2) return 1.0;

  // 한쪽이 다른 쪽에 완전히 포함되어 있는 경우
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    const ratio = Math.min(norm1.length, norm2.length) / Math.max(norm1.length, norm2.length);
    const containedScore = 0.8 + 0.2 * ratio;
    return isFtsHit ? Math.max(containedScore, 0.85) : containedScore;
  }

  const jaccard = calculateJaccardSimilarity(norm1, norm2);
  const lev = calculateLevenshteinSimilarity(norm1, norm2);
  const baseSim = Math.max(jaccard, lev);

  if (isFtsHit) {
    return Math.min(1.0, 0.7 + 0.3 * baseSim);
  }
  return baseSim;
}

/**
 * 3단계: 전유면적 일치 여부 확인 (SARGable 범위 쿼리)
 */
export function verifyAreaMatch(complexId: string, areaM2?: number | null, areaKey?: number | null): boolean {
  if (areaM2 == null && areaKey == null) return false;
  const db = getDb();

  const targetKey = areaKey ?? (areaM2 ? Math.round(areaM2 * 100) : 0);
  const targetM2 = areaM2 ?? targetKey / 100;

  // ±10 area_key (즉 ±0.1㎡) 또는 transactions/complex_area_mappings 면적 일치 확인 (SARGable BETWEEN 비교)
  const row = db.prepare(`
    SELECT 1 FROM transactions
    WHERE complex_id = ?
      AND (
        (area_key >= ? AND area_key <= ?)
        OR (area_m2 >= ? AND area_m2 <= ?)
      )
    LIMIT 1
  `).get(complexId, targetKey - 10, targetKey + 10, targetM2 - 0.15, targetM2 + 0.15);

  if (row) return true;

  try {
    const camRow = db.prepare(`
      SELECT 1 FROM complex_area_mappings
      WHERE complex_id = ?
        AND (
          (area_key >= ? AND area_key <= ?)
          OR (area_m2 >= ? AND area_m2 <= ?)
        )
      LIMIT 1
    `).get(complexId, targetKey - 10, targetKey + 10, targetM2 - 0.15, targetM2 + 0.15);
    return Boolean(camRow);
  } catch {
    return false;
  }
}

/**
 * FTS5 접두 매칭 단지 목록 조회
 */
function searchFtsComplexes(query: string, lawdCode?: string | null): Set<string> {
  const hits = new Set<string>();
  const clean = query.replace(/[^a-zA-Z0-9가-힣]/g, " ").trim();
  if (!clean) return hits;

  const firstWord = clean.split(/\s+/)[0];
  if (!firstWord || firstWord.length < 2) return hits;

  const db = getDb();
  try {
    const ftsQuery = `"${firstWord}"*`;
    let sql = "SELECT complex_id FROM complexes_fts WHERE complexes_fts MATCH ?";
    const params: any[] = [ftsQuery];
    if (lawdCode) {
      sql += " AND lawd_code = ?";
      params.push(lawdCode);
    }
    sql += " LIMIT 20";

    const rows = db.prepare(sql).all(...params) as { complex_id: string }[];
    for (const r of rows) {
      hits.add(r.complex_id);
    }
  } catch (err: any) {
    log.debug(`[AuctionMatcher] FTS 검색 실패: ${err.message}`);
  }

  return hits;
}

export interface MatchResult {
  docid: string;
  matched: boolean;
  complexId?: string;
  method?: "manual" | "geo+name" | "geo+name+area" | "name+area";
  confidence: number;
  candidates: AuctionCandidate[];
}

/**
 * 단건 경매 물건 3단계 매칭 수행
 */
export async function matchAuction(docid: string): Promise<MatchResult> {
  const auction = getAuctionByDocId(docid);
  if (!auction) {
    throw new Error(`경매 물건(${docid})을 찾을 수 없습니다.`);
  }

  // 사용자가 수동 확정한 매칭이 이미 있으면 유지
  const existingMatch = getAuctionMatch(docid);
  if (existingMatch && existingMatch.decidedBy === "user") {
    return {
      docid,
      matched: true,
      complexId: existingMatch.complexId,
      method: "manual",
      confidence: 1.0,
      candidates: [],
    };
  }

  const db = getDb();

  // 1단계: 좌표 확보 (기존 DB 캐시 우선, 없으면 지오코딩)
  let lat = auction.lat;
  let lng = auction.lng;

  if (lat == null || lng == null) {
    // 5.1절: printSt(완성 주소) 우선, 실패 시 도로명 -> 지번
    const queries = [
      auction.addrFull,
      [auction.addrRoad, auction.addrBuldNo].filter(Boolean).join(" "),
      [auction.addrSido, auction.addrSigu, auction.addrDong, auction.addrLotno].filter(Boolean).join(" "),
    ].filter(Boolean) as string[];

    for (const query of queries) {
      if (!query || query.length < 5) continue;
      const res = await geocodeAddressDetailed(query);
      if (res.success && res.lat != null && res.lng != null) {
        lat = res.lat;
        lng = res.lng;
        updateAuctionCoords(docid, lat, lng);
        break;
      }
    }
  }

  // 위치 기반 후보 단지 검색 (반경 150m, 없으면 300m 확장)
  let complexRows: Array<{ id: string; name: string; lawd_code: string; lat: number; lng: number }> = [];

  if (lat != null && lng != null) {
    const radiusList = [150, 300];
    for (const radius of radiusList) {
      const candidatesInLawd = db.prepare(`
        SELECT id, name, lawd_code, lat, lng
        FROM complexes
        WHERE lawd_code = ? AND lat IS NOT NULL AND lng IS NOT NULL
      `).all(auction.lawdCode) as any[];

      const filtered = candidatesInLawd
        .map((c) => ({
          ...c,
          distance: haversineDistance(lat!, lng!, c.lat, c.lng),
        }))
        .filter((c) => c.distance <= radius)
        .sort((a, b) => a.distance - b.distance);

      if (filtered.length > 0) {
        complexRows = filtered.slice(0, 5);
        break;
      }
    }
  }

  // 위치로 후보를 못 찾은 경우 이름 FTS 및 같은 lawdCode 내 이름 유사도 후보 탐색
  const ftsHits = searchFtsComplexes(auction.buldName || "", auction.lawdCode);

  if (complexRows.length === 0 && auction.lawdCode) {
    const sameLawdComplexes = db.prepare(`
      SELECT id, name, lawd_code, lat, lng
      FROM complexes
      WHERE lawd_code = ?
      LIMIT 100
    `).all(auction.lawdCode) as any[];

    complexRows = sameLawdComplexes;
  }

  // 2단계 & 3단계: 이름 유사도 및 면적 일치 검증
  const candidateScores: AuctionCandidate[] = [];

  for (const c of complexRows) {
    const dist = lat != null && lng != null && c.lat != null && c.lng != null
      ? haversineDistance(lat, lng, c.lat, c.lng)
      : 9999;

    const isFtsHit = ftsHits.has(c.id);
    const nameScore = calculateNameScore(auction.buldName || "", c.name, isFtsHit);

    // 이름 점수가 0.55 미만이고 거리도 멀면 제외
    if (nameScore < 0.55 && dist > 300) continue;

    const areaVerified = verifyAreaMatch(c.id, auction.areaM2, auction.areaKey);

    // 종합 신뢰도 점수 산출
    let score = nameScore * 0.6;
    if (dist <= 100) score += 0.25;
    else if (dist <= 150) score += 0.2;
    else if (dist <= 300) score += 0.1;

    if (areaVerified) score += 0.15;
    score = Math.min(1.0, score);

    candidateScores.push({
      complexId: c.id,
      complexName: c.name,
      distanceM: Math.round(dist),
      nameScore: Math.round(nameScore * 100) / 100,
      areaVerified,
      score: Math.round(score * 100) / 100,
    });
  }

  // 점수 내림차순 정렬 후 상위 3개 후보 선정
  candidateScores.sort((a, b) => b.score - a.score);
  const topCandidates = candidateScores.slice(0, 3);

  // 5.4 확정 규칙
  let matched = false;
  let bestCandidate: AuctionCandidate | undefined;
  let method: "geo+name" | "geo+name+area" | "name+area" = "geo+name";
  let confidence = 0;

  if (topCandidates.length > 0) {
    const best = topCandidates[0];
    const second = topCandidates[1];
    const hasGeo = best.distanceM <= 300;

    // 케이스 1: 100m 이내 + name_score >= 0.7 -> 자동 확정
    if (best.distanceM <= 100 && best.nameScore >= 0.7) {
      matched = true;
      bestCandidate = best;
      confidence = best.areaVerified ? 0.95 : 0.88;
      method = best.areaVerified ? "geo+name+area" : "geo+name";
    }
    // 케이스 2: 후보 여러 개 중 면적 일치 유일 + nameScore >= 0.65
    else if (
      best.areaVerified &&
      (!second || !second.areaVerified || best.nameScore > second.nameScore + 0.15) &&
      best.nameScore >= 0.65
    ) {
      matched = true;
      bestCandidate = best;
      confidence = 0.9;
      method = hasGeo ? "geo+name+area" : "name+area";
    }
    // 케이스 3: 150m 이내 + nameScore >= 0.85
    else if (best.distanceM <= 150 && best.nameScore >= 0.85) {
      matched = true;
      bestCandidate = best;
      confidence = best.areaVerified ? 0.95 : 0.87;
      method = best.areaVerified ? "geo+name+area" : "geo+name";
    }
    // 케이스 4: 0.85 이상 점수
    else if (best.score >= 0.85) {
      matched = true;
      bestCandidate = best;
      confidence = best.score;
      method = best.areaVerified ? (hasGeo ? "geo+name+area" : "name+area") : "geo+name";
    }
  }

  if (matched && bestCandidate) {
    saveAuctionMatch({
      docid,
      complexId: bestCandidate.complexId,
      method,
      confidence,
      distanceM: bestCandidate.distanceM,
      nameScore: bestCandidate.nameScore,
      areaVerified: bestCandidate.areaVerified,
      candidatesJson: JSON.stringify(topCandidates),
      decidedBy: "auto",
      createdAt: new Date().toISOString(),
    });

    log.info(`[AuctionMatcher] 경매 ${docid}(${auction.buldName}) -> 단지 ${bestCandidate.complexName} 자동 확정 (신뢰도: ${confidence})`);

    return {
      docid,
      matched: true,
      complexId: bestCandidate.complexId,
      method,
      confidence,
      candidates: topCandidates,
    };
  }

  // 자동 확정 불가 -> 미매핑 큐 (auctions.candidates_json 및 match_checked_at에 기록)
  updateAuctionCandidates(docid, topCandidates);

  log.info(`[AuctionMatcher] 경매 ${docid}(${auction.buldName}) 미매핑 큐 보류 (후보 ${topCandidates.length}건)`);

  return {
    docid,
    matched: false,
    confidence: topCandidates[0]?.score ?? 0,
    candidates: topCandidates,
  };
}

/**
 * 미매칭 경매 물건 일괄 매칭 수행 (신규 미시도 물건 우선 처리하여 기아 현상 방지)
 */
export async function matchPendingAuctions(limit = 30): Promise<{
  totalProcessed: number;
  matchedCount: number;
  unmatchedCount: number;
}> {
  const db = getDb();
  // 아직 auction_matches 에 없는 진행 경매 물건 (신규 미검사 물건을 우선 매칭)
  const rows = db.prepare(`
    SELECT a.docid
    FROM auctions a
    LEFT JOIN auction_matches m ON a.docid = m.docid
    WHERE m.docid IS NULL
      AND a.closed_at IS NULL
      AND a.status_cd = '01'
      AND (a.sale_date IS NULL OR a.sale_date >= date('now', '+9 hours'))
    ORDER BY (a.match_checked_at IS NOT NULL) ASC, a.sale_date ASC
    LIMIT ?
  `).all(limit) as { docid: string }[];

  let matchedCount = 0;
  let unmatchedCount = 0;

  for (const row of rows) {
    try {
      const res = await matchAuction(row.docid);
      if (res.matched) {
        matchedCount++;
      } else {
        unmatchedCount++;
      }
    } catch (err: any) {
      log.warn(`[AuctionMatcher] 매칭 실패 (${row.docid}): ${err.message}`);
      unmatchedCount++;
    }
  }

  return {
    totalProcessed: rows.length,
    matchedCount,
    unmatchedCount,
  };
}
