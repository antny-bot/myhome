import neo4j, { type Driver, type Session } from "neo4j-driver";
import { TransactionNode, RegionInfo, TrendPoint, GraphStats, GraphFilter, GraphTopologyData, GraphNode, GraphLink } from "./types.js";

let _driver: Driver | null = null;

function getDriver(): Driver {
  if (_driver) return _driver;

  const uri = process.env.NEO4J_URI;
  const username = process.env.NEO4J_USERNAME ?? "neo4j";
  const password = process.env.NEO4J_PASSWORD;

  if (!uri || !password) {
    throw new Error(
      "NEO4J_URI 또는 NEO4J_PASSWORD 환경변수가 설정되지 않았습니다."
    );
  }

  _driver = neo4j.driver(uri, neo4j.auth.basic(username, password), {
    maxConnectionLifetime: 3 * 60 * 60 * 1000, // 3시간
    maxConnectionPoolSize: 10,
    connectionAcquisitionTimeout: 10_000,
  });

  return _driver;
}

export async function closeGraphDb(): Promise<void> {
  if (_driver) {
    await _driver.close();
    _driver = null;
  }
}

/**
 * 그래프 DB 전용 dedupeKey 생성 함수.
 * 거래 식별자 = lawdCode + 단지명 + 거래일 + 전용면적 + 층
 * 가격은 정정될 수 있으므로 키에서 제외하고 ON MATCH SET으로 업데이트한다.
 */
export function makeGraphDedupeKey(
  lawdCode: string,
  apartmentName: string,
  dealDate: string,
  areaM2: number | undefined,
  floor: number | undefined
): string {
  return [lawdCode, apartmentName, dealDate, areaM2 ?? "", floor ?? ""].join("|");
}

/**
 * Region → Complex → Transaction 노드를 MERGE(없으면 생성, 있으면 매칭)로 upsert.
 * 같은 dedupeKey가 이미 존재하면 중복 생성 없이 관계만 확인한다.
 */
export async function upsertTransaction(
  region: RegionInfo,
  complexName: string,
  tx: TransactionNode
): Promise<void> {
  const driver = getDriver();
  const database = process.env.NEO4J_DATABASE ?? "neo4j";
  const session: Session = driver.session({ database });

  try {
    await session.run(
      `
      MERGE (r:Region {lawdCode: $lawdCode})
        ON CREATE SET r.displayName = $displayName,
                      r.createdAt   = $now

      MERGE (c:Complex {name: $complexName, lawdCode: $lawdCode})
        ON CREATE SET c.createdAt = $now

      MERGE (r)-[:CONTAINS]->(c)

      MERGE (t:Transaction {dedupeKey: $dedupeKey})
        ON CREATE SET t.dealDate    = $dealDate,
                      t.priceEok   = $priceEok,
                      t.areaM2     = $areaM2,
                      t.floor      = $floor,
                      t.collectedAt = $now
        ON MATCH SET  t.priceEok   = $priceEok,
                      t.updatedAt  = $now

      MERGE (c)-[:HAS_TRANSACTION]->(t)
      `,
      {
        lawdCode:    region.lawdCode,
        displayName: region.displayName,
        complexName,
        dedupeKey:   tx.dedupeKey,
        dealDate:    tx.dealDate,
        priceEok:    tx.priceEok,
        areaM2:      tx.areaM2   ?? null,
        floor:       tx.floor    ?? null,
        now:         new Date().toISOString(),
      }
    );
  } finally {
    await session.close();
  }
}

/**
 * 특정 단지의 월별 평균 실거래가 추이를 반환한다.
 * dealDate의 YYYY-MM 부분으로 그룹화한다.
 */
async function resolveComplexName(session: Session, complexName: string, lawdCode?: string): Promise<string> {
  if (!complexName.trim()) return complexName;
  try {
    // 1. 정확히 일치하는 단지가 있는지 검사
    const exactRes = await session.run(
      `
      MATCH (c:Complex)
      WHERE c.name = $complexName ${lawdCode ? "AND c.lawdCode = $lawdCode" : ""}
      RETURN c.name AS name LIMIT 1
      `,
      { complexName, lawdCode: lawdCode || null }
    );
    if (exactRes.records.length > 0) {
      return exactRes.records[0].get("name") as string;
    }

    // 2. 부분 일치하는 단지 중 실거래가 가장 많은 단지 1개 매칭
    const fuzzyRes = await session.run(
      `
      MATCH (c:Complex)-[:HAS_TRANSACTION]->(t)
      WHERE c.name CONTAINS $complexName ${lawdCode ? "AND c.lawdCode = $lawdCode" : ""}
      RETURN c.name AS name, count(t) AS cnt
      ORDER BY cnt DESC LIMIT 1
      `,
      { complexName, lawdCode: lawdCode || null }
    );
    if (fuzzyRes.records.length > 0) {
      return fuzzyRes.records[0].get("name") as string;
    }
  } catch (err) {
    console.error("[GraphDB] resolveComplexName error", err);
  }
  return complexName;
}

export async function getComplexTrend(
  complexName: string,
  lawdCode?: string
): Promise<TrendPoint[]> {
  const driver = getDriver();
  const database = process.env.NEO4J_DATABASE ?? "neo4j";
  const session: Session = driver.session({ database });

  try {
    // 검색 단지명 유연 해석
    const resolvedName = await resolveComplexName(session, complexName, lawdCode);
    const finalComplexName = resolvedName || complexName;

    const whereClause = lawdCode
      ? "WHERE c.name = $complexName AND c.lawdCode = $lawdCode"
      : "WHERE c.name = $complexName";

    const result = await session.run(
      `
      MATCH (c:Complex)-[:HAS_TRANSACTION]->(t)
      ${whereClause}
      WITH substring(t.dealDate, 0, 7) AS month,
           avg(t.priceEok)             AS avgPriceEok,
           count(t)                    AS cnt
      RETURN month, avgPriceEok, cnt
      ORDER BY month
      `,
      { complexName: finalComplexName, lawdCode: lawdCode ?? null }
    );

    return result.records.map((r) => ({
      month:        r.get("month") as string,
      avgPriceEok:  (r.get("avgPriceEok") as number),
      count:        (r.get("cnt") as { toNumber: () => number }).toNumber?.() ?? Number(r.get("cnt")),
    }));
  } finally {
    await session.close();
  }
}

/**
 * 특정 지역의 월별 평균 실거래가 추이를 반환한다.
 */
export async function getRegionTrend(
  lawdCode: string
): Promise<TrendPoint[]> {
  const driver = getDriver();
  const database = process.env.NEO4J_DATABASE ?? "neo4j";
  const session: Session = driver.session({ database });

  try {
    const result = await session.run(
      `
      MATCH (:Region {lawdCode: $lawdCode})-[:CONTAINS]->(:Complex)-[:HAS_TRANSACTION]->(t)
      WITH substring(t.dealDate, 0, 7) AS month,
           avg(t.priceEok)             AS avgPriceEok,
           count(t)                    AS cnt
      RETURN month, avgPriceEok, cnt
      ORDER BY month
      `,
      { lawdCode }
    );

    return result.records.map((r) => ({
      month:        r.get("month") as string,
      avgPriceEok:  (r.get("avgPriceEok") as number),
      count:        (r.get("cnt") as { toNumber: () => number }).toNumber?.() ?? Number(r.get("cnt")),
    }));
  } finally {
    await session.close();
  }
}

/**
 * 전체 그래프 DB 노드 수 통계를 반환한다.
 */
export async function getGraphStats(): Promise<GraphStats> {
  const driver = getDriver();
  const database = process.env.NEO4J_DATABASE ?? "neo4j";
  const session: Session = driver.session({ database });

  try {
    const result = await session.run(`
      MATCH (r:Region)      WITH count(r) AS regions
      MATCH (c:Complex)     WITH regions, count(c) AS complexes
      MATCH (t:Transaction) WITH regions, complexes, count(t) AS transactions
      RETURN regions, complexes, transactions
    `);

    if (result.records.length === 0) {
      return { regions: 0, complexes: 0, transactions: 0 };
    }

    const rec = result.records[0];
    const toNum = (v: unknown) =>
      typeof v === "object" && v !== null && "toNumber" in v
        ? (v as { toNumber: () => number }).toNumber()
        : Number(v);

    return {
      regions:      toNum(rec.get("regions")),
      complexes:    toNum(rec.get("complexes")),
      transactions: toNum(rec.get("transactions")),
    };
  } finally {
    await session.close();
  }
}

/**
 * 다중 필터 조합 검색.
 */
export async function searchTransactions(filter: GraphFilter): Promise<any[]> {
  const driver = getDriver();
  const database = process.env.NEO4J_DATABASE ?? "neo4j";
  const session = driver.session({ database });

  try {
    const result = await session.run(
      `
      MATCH (r:Region)-[:CONTAINS]->(c:Complex)-[:HAS_TRANSACTION]->(t:Transaction)
      WHERE ($lawdCode IS NULL OR r.lawdCode STARTS WITH $lawdCode)
        AND ($complexName IS NULL OR c.name CONTAINS $complexName)
        AND ($startDate IS NULL OR t.dealDate >= $startDate)
        AND ($endDate IS NULL OR t.dealDate <= $endDate)
        AND ($minArea IS NULL OR t.areaM2 >= $minArea)
        AND ($maxArea IS NULL OR t.areaM2 <= $maxArea)
      RETURN r.displayName AS regionName, r.lawdCode AS lawdCode, c.name AS apartmentName,
             t.dealDate AS dealDate, t.priceEok AS priceEok, t.areaM2 AS areaM2, t.floor AS floor, t.dedupeKey AS dedupeKey
      ORDER BY t.dealDate DESC LIMIT 500
      `,
      {
        lawdCode: filter.lawdCode || null,
        complexName: filter.complexName || null,
        startDate: filter.startDate || null,
        endDate: filter.endDate || null,
        minArea: filter.minArea || null,
        maxArea: filter.maxArea || null,
      }
    );

    return result.records.map((r) => ({
      regionName: r.get("regionName") as string,
      lawdCode: r.get("lawdCode") as string,
      apartmentName: r.get("apartmentName") as string,
      dealDate: r.get("dealDate") as string,
      priceEok: r.get("priceEok") as number,
      areaM2: r.get("areaM2") as number | null,
      floor: r.get("floor") as number | null,
      dedupeKey: r.get("dedupeKey") as string,
    }));
  } finally {
    await session.close();
  }
}

/**
 * 드릴다운: 시/도 레벨 집계
 */
export async function getDrilldownRegions(): Promise<any[]> {
  const driver = getDriver();
  const database = process.env.NEO4J_DATABASE ?? "neo4j";
  const session = driver.session({ database });

  try {
    const result = await session.run(
      `
      MATCH (r:Region)-[:CONTAINS]->(c:Complex)-[:HAS_TRANSACTION]->(t:Transaction)
      WITH r.lawdCode AS code, r.displayName AS name, count(t) AS count, avg(t.priceEok) AS avgPriceEok
      RETURN code, name, count, avgPriceEok
      ORDER BY name
      `
    );

    const toNum = (v: unknown) =>
      typeof v === "object" && v !== null && "toNumber" in v
        ? (v as { toNumber: () => number }).toNumber()
        : Number(v);

    return result.records.map((r) => ({
      code: r.get("code") as string,
      name: r.get("name") as string,
      count: toNum(r.get("count")),
      avgPriceEok: Number((r.get("avgPriceEok") as number).toFixed(2)),
    }));
  } finally {
    await session.close();
  }
}

/**
 * 드릴다운: 특정 지역의 아파트 단지별 집계
 */
export async function getDrilldownComplexes(lawdCode: string): Promise<any[]> {
  const driver = getDriver();
  const database = process.env.NEO4J_DATABASE ?? "neo4j";
  const session = driver.session({ database });

  try {
    const result = await session.run(
      `
      MATCH (r:Region {lawdCode: $lawdCode})-[:CONTAINS]->(c:Complex)-[:HAS_TRANSACTION]->(t:Transaction)
      WITH c.name AS name, count(t) AS count, avg(t.priceEok) AS avgPriceEok
      RETURN name, count, avgPriceEok
      ORDER BY count DESC
      `,
      { lawdCode }
    );

    const toNum = (v: unknown) =>
      typeof v === "object" && v !== null && "toNumber" in v
        ? (v as { toNumber: () => number }).toNumber()
        : Number(v);

    return result.records.map((r) => ({
      name: r.get("name") as string,
      count: toNum(r.get("count")),
      avgPriceEok: Number((r.get("avgPriceEok") as number).toFixed(2)),
    }));
  } finally {
    await session.close();
  }
}

/**
 * 드릴다운: 특정 단지의 평수별 집계
 */
export async function getDrilldownAreas(complexName: string, lawdCode?: string): Promise<any[]> {
  const driver = getDriver();
  const database = process.env.NEO4J_DATABASE ?? "neo4j";
  const session = driver.session({ database });

  try {
    const resolvedName = await resolveComplexName(session, complexName, lawdCode);
    const finalComplexName = resolvedName || complexName;

    const whereClause = lawdCode
      ? "WHERE c.name = $complexName AND c.lawdCode = $lawdCode"
      : "WHERE c.name = $complexName";

    const result = await session.run(
      `
      MATCH (c:Complex)-[:HAS_TRANSACTION]->(t:Transaction)
      ${whereClause}
      WITH toString(round(t.areaM2)) + '㎡' AS name, count(t) AS count, avg(t.priceEok) AS avgPriceEok
      RETURN name, count, avgPriceEok
      ORDER BY avgPriceEok DESC
      `,
      { complexName: finalComplexName, lawdCode: lawdCode || null }
    );

    const toNum = (v: unknown) =>
      typeof v === "object" && v !== null && "toNumber" in v
        ? (v as { toNumber: () => number }).toNumber()
        : Number(v);

    return result.records.map((r) => ({
      name: r.get("name") as string,
      count: toNum(r.get("count")),
      avgPriceEok: Number((r.get("avgPriceEok") as number).toFixed(2)),
    }));
  } finally {
    await session.close();
  }
}

/**
 * 노드-링크 시각화용 데이터 (최대 150개 거래 제한)
 */
export async function getGraphTopology(filter: GraphFilter): Promise<GraphTopologyData> {
  const driver = getDriver();
  const database = process.env.NEO4J_DATABASE ?? "neo4j";
  const session = driver.session({ database });

  try {
    const result = await session.run(
      `
      MATCH (r:Region)-[:CONTAINS]->(c:Complex)-[:HAS_TRANSACTION]->(t:Transaction)
      WHERE ($lawdCode IS NULL OR r.lawdCode STARTS WITH $lawdCode)
        AND ($complexName IS NULL OR c.name CONTAINS $complexName)
        AND ($startDate IS NULL OR t.dealDate >= $startDate)
        AND ($endDate IS NULL OR t.dealDate <= $endDate)
      WITH r, c, t LIMIT 150
      RETURN r.lawdCode AS rId, r.displayName AS rName, 
             c.name AS cName, c.lawdCode AS cLawd,
             t.dedupeKey AS tKey, t.dealDate AS tDate, t.priceEok AS tPrice
      `,
      {
        lawdCode: filter.lawdCode || null,
        complexName: filter.complexName || null,
        startDate: filter.startDate || null,
        endDate: filter.endDate || null,
      }
    );

    const nodesMap = new Map<string, GraphNode>();
    const links: GraphLink[] = [];

    result.records.forEach((r) => {
      const rId = r.get("rId") as string;
      const rName = r.get("rName") as string;
      const cName = r.get("cName") as string;
      const cLawd = r.get("cLawd") as string;
      const cId = `${cLawd}|${cName}`;
      const tKey = r.get("tKey") as string;
      const tDate = r.get("tDate") as string;
      const tPrice = r.get("tPrice") as number;

      // Region Node
      if (!nodesMap.has(rId)) {
        nodesMap.set(rId, { id: rId, type: "Region", label: rName });
      }
      // Complex Node
      if (!nodesMap.has(cId)) {
        nodesMap.set(cId, { id: cId, type: "Complex", label: cName });
      }
      // Transaction Node
      if (!nodesMap.has(tKey)) {
        nodesMap.set(tKey, { id: tKey, type: "Transaction", label: `${tDate} (${tPrice}억)`, val: tPrice });
      }

      // Link: Region -> Complex
      const link1Key = `${rId}->${cId}`;
      if (!links.some((l) => `${l.source}->${l.target}` === link1Key)) {
        links.push({ source: rId, target: cId, type: "CONTAINS" });
      }
      // Link: Complex -> Transaction
      const link2Key = `${cId}->${tKey}`;
      if (!links.some((l) => `${l.source}->${l.target}` === link2Key)) {
        links.push({ source: cId, target: tKey, type: "HAS_TRANSACTION" });
      }
    });

    return {
      nodes: Array.from(nodesMap.values()),
      links,
    };
  } finally {
    await session.close();
  }
}

/**
 * 단지 상세 분석: 평수/층/최근 거래 종합
 */
export async function getComplexDetail(complexName: string, lawdCode?: string): Promise<any> {
  const trend = await getComplexTrend(complexName, lawdCode);

  const driver = getDriver();
  const database = process.env.NEO4J_DATABASE ?? "neo4j";
  const session = driver.session({ database });

  try {
    const resolvedName = await resolveComplexName(session, complexName, lawdCode);
    const finalComplexName = resolvedName || complexName;

    const whereClause = lawdCode
      ? "WHERE c.name = $complexName AND c.lawdCode = $lawdCode"
      : "WHERE c.name = $complexName";

    // 1. 평수별 통계
    const areaRes = await session.run(
      `
      MATCH (c:Complex)-[:HAS_TRANSACTION]->(t)
      ${whereClause}
      WITH toString(round(t.areaM2)) + '㎡' AS area, avg(t.priceEok) AS avgPrice, count(t) AS cnt
      RETURN area, avgPrice, cnt
      ORDER BY area
      `,
      { complexName: finalComplexName, lawdCode: lawdCode || null }
    );

    // 2. 층별 분포
    const floorRes = await session.run(
      `
      MATCH (c:Complex)-[:HAS_TRANSACTION]->(t)
      ${whereClause} AND t.floor IS NOT NULL
      WITH t.floor AS floor, count(t) AS cnt, avg(t.priceEok) AS avgPrice
      RETURN floor, cnt, avgPrice
      ORDER BY floor
      `,
      { complexName: finalComplexName, lawdCode: lawdCode || null }
    );

    // 3. 최근 거래 (최대 10건)
    const recentRes = await session.run(
      `
      MATCH (c:Complex)-[:HAS_TRANSACTION]->(t)
      ${whereClause}
      RETURN t.dealDate AS dealDate, t.priceEok AS priceEok, t.areaM2 AS areaM2, t.floor AS floor, t.dedupeKey AS dedupeKey
      ORDER BY t.dealDate DESC LIMIT 10
      `,
      { complexName: finalComplexName, lawdCode: lawdCode || null }
    );

    const toNum = (v: unknown) =>
      typeof v === "object" && v !== null && "toNumber" in v
        ? (v as { toNumber: () => number }).toNumber()
        : Number(v);

    const areaBreakdown = areaRes.records.map((r) => ({
      area: r.get("area") as string,
      avgPriceEok: Number((r.get("avgPrice") as number).toFixed(2)),
      count: toNum(r.get("cnt")),
    }));

    const floorDist = floorRes.records.map((r) => ({
      floor: toNum(r.get("floor")),
      count: toNum(r.get("cnt")),
      avgPriceEok: Number((r.get("avgPrice") as number).toFixed(2)),
    }));

    const recentTx = recentRes.records.map((r) => ({
      apartmentName: finalComplexName,
      dealDate: r.get("dealDate") as string,
      priceEok: r.get("priceEok") as number,
      areaM2: r.get("areaM2") as number | null,
      floor: r.get("floor") as number | null,
      dedupeKey: r.get("dedupeKey") as string,
    }));

    return {
      trend,
      areaBreakdown,
      floorDist,
      recentTx,
    };
  } finally {
    await session.close();
  }
}

/**
 * LLM 프롬프트 생성을 위한 데이터 요약 텍스트
 */
export async function getDataContext(filter: GraphFilter): Promise<string> {
  const txs = await searchTransactions(filter);

  if (txs.length === 0) {
    return "조건에 일치하는 실거래 데이터가 없습니다.";
  }

  const count = txs.length;
  const prices = txs.map((t) => t.priceEok);
  const avgPrice = prices.reduce((a, b) => a + b, 0) / count;
  const maxPrice = Math.max(...prices);
  const minPrice = Math.min(...prices);

  // 월별 추이 집계
  const monthlyMap = new Map<string, { count: number; sum: number }>();
  txs.forEach((t) => {
    const month = t.dealDate.substring(0, 7);
    const curr = monthlyMap.get(month) || { count: 0, sum: 0 };
    curr.count += 1;
    curr.sum += t.priceEok;
    monthlyMap.set(month, curr);
  });

  const monthlySummary = Array.from(monthlyMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, data]) => `- ${month}: 거래량 ${data.count}건, 평균가 ${(data.sum / data.count).toFixed(2)}억`)
    .join("\n");

  // 상위 거래 5건
  const topRecent = txs
    .slice(0, 5)
    .map((t) => `- [${t.dealDate}] ${t.apartmentName} (${t.floor}층, ${t.areaM2 ? Math.round(t.areaM2) : "-"}㎡) : ${t.priceEok}억`)
    .join("\n");

  return `[조회 필터 조건]
- 지역 코드: ${filter.lawdCode || "전체"}
- 아파트명 키워드: ${filter.complexName || "전체"}
- 기간: ${filter.startDate || "시작일 없음"} ~ ${filter.endDate || "종료일 없음"}
- 평형대(㎡): ${filter.minArea || 0}㎡ ~ ${filter.maxArea || "제한 없음"}㎡

[실거래 요약 통계]
- 총 거래 건수: ${count}건
- 평균 거래 금액: ${avgPrice.toFixed(2)}억 원
- 최고 거래 금액: ${maxPrice}억 원
- 최저 거래 금액: ${minPrice}억 원

[월별 거래 추이]
${monthlySummary}

[최근 실거래 내역 (상위 5건)]
${topRecent}
`;
}
