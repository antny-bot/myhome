import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { splitLawdCode, buildSearchBody } from "./request.js";
import { normalizeAuctionItem, parseAreaM2, formatSaleDate, formatSaleTime } from "./normalize.js";
import {
  AuctionClient,
  BlockedError,
  AuctionClientError,
  extractSetCookieHeaders,
  parseSetCookieLine,
  splitSetCookieHeader,
} from "./client.js";
import { runAuctionCollector } from "./index.js";
import { initDb, closeDb, getAuctions, getAuctionCollectRuns } from "@myhome/shared";

process.env.SQLITE_DB_PATH = ":memory:";

before(() => {
  initDb();
});

after(() => {
  closeDb();
});

test("request: splitLawdCode 시도 2자리 / 시군구 3자리 분리", () => {
  assert.deepEqual(splitLawdCode("41117"), { sidoCd: "41", sggCd: "117" });
  assert.deepEqual(splitLawdCode("41135"), { sidoCd: "41", sggCd: "135" });
  assert.deepEqual(splitLawdCode("11680"), { sidoCd: "11", sggCd: "680" });

  assert.throws(() => splitLawdCode("411"), /유효하지 않은 lawd_code/);
});

test("request: buildSearchBody 47개 필드 구성 및 pageSize 검증", () => {
  const body = buildSearchBody({
    lawdCode: "41117",
    saleFrom: "20261126",
    saleTo: "20270228",
    pageSize: 50,
    pageNo: 1,
  });

  assert.equal(body.dma_pageInfo.pageNo, 1);
  assert.equal(body.dma_pageInfo.pageSize, 50);
  assert.equal(body.dma_srchGdsDtlSrchInfo.rprsAdongSdCd, "41");
  assert.equal(body.dma_srchGdsDtlSrchInfo.rprsAdongSggCd, "117");
  assert.equal(body.dma_srchGdsDtlSrchInfo.lclDspslGdsLstUsgCd, "20000");
  assert.equal(body.dma_srchGdsDtlSrchInfo.mclDspslGdsLstUsgCd, "20100");
  assert.equal(body.dma_srchGdsDtlSrchInfo.sclDspslGdsLstUsgCd, "20104");
  assert.equal(body.dma_srchGdsDtlSrchInfo.bidBgngYmd, "20261126");
  assert.equal(body.dma_srchGdsDtlSrchInfo.bidEndYmd, "20270228");

  // 잘못된 pageSize 거부 검증
  assert.throws(
    () => buildSearchBody({ lawdCode: "41117", pageSize: 30 as any }),
    /허용되지 않는 pageSize입니다/
  );
});

test("normalize: parseAreaM2 및 날짜/시간 변환", () => {
  assert.equal(parseAreaM2("철근콘크리트조\r\n84.96㎡"), 84.96);
  assert.equal(parseAreaM2("186.24 m2"), 186.24);
  assert.equal(parseAreaM2(59.98), 59.98);
  assert.equal(parseAreaM2(null), null);

  assert.equal(formatSaleDate("20261202"), "2026-12-02");
  assert.equal(formatSaleTime("1000"), "10:00");
  assert.equal(formatSaleTime("10"), "10:00");
});

test("normalize: PoC 실측 fixture 2건 정규화 검증", () => {
  // 수원 영통구 샘플
  const sampleSuwon = {
    docid: "B0002502024013008779111",
    boCd: "B000250",
    saNo: "20240130087791",
    printCsNo: "2024타경87791",
    maemulSer: "1",
    mokmulSer: "1",
    daepyoSidoCd: "41",
    daepyoSiguCd: "117",
    jiwonNm: "수원지방법원",
    jpDeptNm: "경매12계",
    tel: "031-210-1234",
    lclsUtilCd: "20000",
    mclsUtilCd: "20100",
    sclsUtilCd: "20104",
    dspslUsgNm: "아파트",
    hjguSido: "경기도",
    hjguSigu: "수원시 영통구",
    hjguDong: "영통동",
    daepyoLotno: "957-6",
    rdNm: "청명로",
    buldNo: "132",
    printSt: "경기도 수원시 영통구 청명로 132 323동 1층101호 (영통동,영통에듀파크)",
    buldNm: "영통에듀파크",
    buldList: "323동 1층101호",
    areaList: "철근콘크리트조\r\n84.96㎡",
    gamevalAmt: "670,000,000",
    minmaePrice: "469,000,000",
    notifyMinmaePriceRate1: "70",
    yuchalCnt: "1",
    maeGiil: "20261202",
    maeHh1: "1000",
    maePlace: "광교신청사 제101호 법정",
    mulStatcd: "01",
    mulJinYn: "Y",
  };

  const suwonRecord = normalizeAuctionItem(sampleSuwon);
  assert.equal(suwonRecord.docid, "B0002502024013008779111");
  assert.equal(suwonRecord.srnSaNo, "2024타경87791");
  assert.equal(suwonRecord.lawdCode, "41117");
  assert.equal(suwonRecord.courtName, "수원지방법원");
  assert.equal(suwonRecord.buldName, "영통에듀파크");
  assert.equal(suwonRecord.areaM2, 84.96);
  assert.equal(suwonRecord.areaKey, 8496);
  assert.equal(suwonRecord.appraisalAmt, 670000000);
  assert.equal(suwonRecord.minPrice, 469000000);
  assert.equal(suwonRecord.minPriceRate, 70);
  assert.equal(suwonRecord.failedCount, 1);
  assert.equal(suwonRecord.saleDate, "2026-12-02");
  assert.equal(suwonRecord.saleTime, "10:00");
  assert.equal(suwonRecord.closedAt, null);

  // 성남 분당구 샘플
  const sampleBundang = {
    docid: "B0002502026013005090811",
    boCd: "B000250",
    saNo: "20260130050908",
    printCsNo: "2026타경50908",
    daepyoSidoCd: "41",
    daepyoSiguCd: "135",
    jiwonNm: "성남지원",
    jpDeptNm: "경매2계",
    buldNm: "현대아파트",
    areaList: "186.24㎡",
    gamevalAmt: "2,980,000,000",
    minmaePrice: "2,980,000,000",
    notifyMinmaePriceRate1: "100",
    yuchalCnt: "0",
    maeGiil: "20261207",
    maeHh1: "1000",
    mulJinYn: "Y",
  };

  const bundangRecord = normalizeAuctionItem(sampleBundang);
  assert.equal(bundangRecord.lawdCode, "41135");
  assert.equal(bundangRecord.areaM2, 186.24);
  assert.equal(bundangRecord.areaKey, 18624);
  assert.equal(bundangRecord.appraisalAmt, 2980000000);
  assert.equal(bundangRecord.minPrice, 2980000000);
  assert.equal(bundangRecord.failedCount, 0);
  assert.equal(bundangRecord.saleDate, "2026-12-07");
});

test("client: ipcheck: false 감지 시 BlockedError throw", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    return {
      ok: true,
      json: async () => ({
        data: {
          ipcheck: false,
          dma_pageInfo: { totalCnt: "0" },
          dlt_srchResult: [],
        },
      }),
    } as any;
  };

  try {
    const client = new AuctionClient({ minDelayMs: 0, jitterMaxMs: 0 });
    await assert.rejects(async () => {
      await client.postSearch({});
    }, BlockedError);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("client: HTTP 500 에러 시 1회 백오프 재시도 동작 검증", async () => {
  const originalFetch = globalThis.fetch;
  let postCount = 0;
  globalThis.fetch = async (_url: any, init?: any) => {
    // 세션 웜업(GET)은 검색 요청 수에 포함하지 않는다.
    if (init?.method === "GET") {
      return { ok: true, status: 200 } as any;
    }
    postCount++;
    if (postCount === 1) {
      return { ok: false, status: 500, statusText: "Internal Server Error" } as any;
    }
    return {
      ok: true,
      json: async () => ({
        data: {
          ipcheck: true,
          dma_pageInfo: { totalCnt: "1", pageNo: 1, pageSize: 50 },
          dlt_srchResult: [{ docid: "DOC1" }],
        },
      }),
    } as any;
  };

  try {
    const client = new AuctionClient({ minDelayMs: 0, jitterMaxMs: 0, retryBackoffMs: 10 });
    const res = await client.postSearch({});
    assert.equal(postCount, 2);
    assert.equal(res.data.dlt_srchResult.length, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("client: Set-Cookie 파싱 헬퍼 — getSetCookie·get 폴백·Expires 콤마 처리", () => {
  // getSetCookie() 우선 사용
  assert.deepEqual(
    extractSetCookieHeaders({
      getSetCookie: () => ["WMONID=A1; Path=/", "JSESSIONID=B2; Path=/; HttpOnly"],
      get: () => "SID=SHOULD_NOT_BE_USED; Path=/",
    }),
    ["WMONID=A1; Path=/", "JSESSIONID=B2; Path=/; HttpOnly"]
  );

  // get("set-cookie") 폴백: Expires 의 콤마는 쿠키 구분자로 보지 않는다
  const fallback = extractSetCookieHeaders({
    get: (name: string) =>
      name.toLowerCase() === "set-cookie"
        ? "WMONID=A1; Expires=Wed, 26 Nov 2026 07:00:00 GMT; Path=/, SID=B2; Path=/"
        : null,
  });
  assert.deepEqual(fallback, ["WMONID=A1; Expires=Wed, 26 Nov 2026 07:00:00 GMT; Path=/", "SID=B2; Path=/"]);
  assert.deepEqual(splitSetCookieHeader(""), []);
  // headers 자체가 없으면 빈 배열
  assert.deepEqual(extractSetCookieHeaders(undefined), []);

  // name=value 만 추출(속성 무시), 값 없음/이름 없음은 무시
  assert.deepEqual(parseSetCookieLine("SID=\"quoted-val\"; Path=/; HttpOnly"), { name: "SID", value: "quoted-val" });
  assert.deepEqual(parseSetCookieLine("WMONID=abc"), { name: "WMONID", value: "abc" });
  assert.equal(parseSetCookieLine("Path=/;"), null);
  assert.equal(parseSetCookieLine("=novalue"), null);
});

test("client: 세션 웜업(GET /pgj/index.on) 후 모든 POST 에 Cookie 헤더 전달·1회만 웜업", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; method: string; headers: Record<string, string> }> = [];

  globalThis.fetch = async (url: any, init?: any) => {
    calls.push({ url: String(url), method: init?.method ?? "GET", headers: { ...(init?.headers ?? {}) } });

    if (init?.method === "GET") {
      return {
        ok: true,
        status: 200,
        headers: {
          getSetCookie: () => [
            "WMONID=warm-1; Path=/; HttpOnly",
            "JSESSIONID=js-1; Path=/; HttpOnly",
            "SID=; Path=/", // 값이 빈 쿠키는 저장하지 않는다
          ],
        },
      } as any;
    }

    return {
      ok: true,
      status: 200,
      headers: {
        // POST 응답의 Set-Cookie 로 세션이 갱신되는 상황
        getSetCookie: () => ["JSESSIONID=js-2; Path=/; HttpOnly"],
      },
      json: async () => ({
        data: {
          ipcheck: true,
          dma_pageInfo: { totalCnt: "1", pageNo: 1, pageSize: 50 },
          dlt_srchResult: [{ docid: "DOC1" }],
        },
      }),
    } as any;
  };

  try {
    const client = new AuctionClient({ minDelayMs: 0, jitterMaxMs: 0, retryBackoffMs: 0 });

    await client.postSearch({ page: 1 });

    const getCalls = calls.filter((c) => c.method === "GET");
    const postCalls = calls.filter((c) => c.method === "POST");
    assert.equal(getCalls.length, 1, "웜업은 1회만 호출되어야 한다");
    assert.ok(getCalls[0].url.includes("/pgj/index.on"), `웜업 URL 확인: ${getCalls[0].url}`);
    assert.match(getCalls[0].headers["User-Agent"] ?? "", /Mozilla\/5\.0/);
    assert.match(getCalls[0].headers["Accept"] ?? "", /text\/html/);
    assert.equal(getCalls[0].headers["Accept-Language"], "ko-KR,ko;q=0.9");

    // 첫 POST 는 웜업 쿠키를 Cookie 헤더로 전달 (값이 빈 SID 제외)
    assert.equal(postCalls[0].url, "https://www.courtauction.go.kr/pgj/pgjsearch/searchControllerMain.on");
    assert.equal(postCalls[0].headers["Cookie"], "WMONID=warm-1; JSESSIONID=js-1");
    assert.equal(postCalls[0].headers["Accept"], "application/json, text/javascript, */*; q=0.01");
    assert.equal(postCalls[0].headers["Accept-Language"], "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7");
    assert.equal(postCalls[0].headers["X-Requested-With"], "XMLHttpRequest");

    // 웜업은 검색 요청 예산(requestCount)에 가산하지 않는다
    assert.equal(client.getRequestCount(), 1);
    assert.equal(client.isSessionWarmedUp(), true);

    // 두 번째 호출: 재웜업 없이 갱신된 쿠키(POST 응답 Set-Cookie)를 재사용
    await client.postSearch({ page: 2 });
    assert.equal(calls.filter((c) => c.method === "GET").length, 1, "재웜업이 발생하면 안 된다");
    const secondPost = calls.filter((c) => c.method === "POST")[1];
    assert.equal(secondPost.headers["Cookie"], "WMONID=warm-1; JSESSIONID=js-2");
    assert.equal(client.getRequestCount(), 2);
    assert.equal(client.getCookies().get("JSESSIONID"), "js-2");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("client: 웜업 실패 시 경고 후 쿠키 없이 POST 진행(우회 로직 없음)", async () => {
  const originalFetch = globalThis.fetch;
  let getCount = 0;
  let postHeaders: Record<string, string> | null = null;

  globalThis.fetch = async (_url: any, init?: any) => {
    if (init?.method === "GET") {
      getCount++;
      const err: any = new TypeError("fetch failed");
      throw err;
    }
    postHeaders = { ...(init?.headers ?? {}) };
    return {
      ok: true,
      json: async () => ({
        data: {
          ipcheck: true,
          dma_pageInfo: { totalCnt: "0", pageNo: 1, pageSize: 50 },
          dlt_srchResult: [],
        },
      }),
    } as any;
  };

  try {
    const client = new AuctionClient({ minDelayMs: 0, jitterMaxMs: 0, retryBackoffMs: 0 });
    const res = await client.postSearch({});
    assert.equal(res.data.ipcheck, true);
    assert.equal(getCount, 1, "웜업은 1회만 시도한다");
    assert.equal(client.isSessionWarmedUp(), false);
    assert.equal(postHeaders?.["Cookie"], undefined, "쿠키가 없으면 Cookie 헤더를 보내지 않는다");

    // 실패 후 두 번째 호출에서도 매 요청마다 재시도하지 않는다(추가 부하 방지)
    await client.postSearch({});
    assert.equal(getCount, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("client: 웜업 후에도 ipcheck: false 면 BlockedError (Playwright 등 우회 없음)", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_url: any, init?: any) => {
    if (init?.method === "GET") {
      return {
        ok: true,
        status: 200,
        headers: { getSetCookie: () => ["WMONID=warm-1; Path=/"] },
      } as any;
    }
    return {
      ok: true,
      json: async () => ({
        data: {
          ipcheck: false,
          dma_pageInfo: { totalCnt: "0" },
          dlt_srchResult: [],
        },
      }),
    } as any;
  };

  try {
    const client = new AuctionClient({ minDelayMs: 0, jitterMaxMs: 0 });
    await assert.rejects(async () => {
      await client.postSearch({});
    }, BlockedError);
    assert.equal(client.getCookies().get("WMONID"), "warm-1");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("runAuctionCollector: mock fetch 로 영통구 8건 적재 및 collect_runs 검증", async () => {
  const originalFetch = globalThis.fetch;
  const mockResults = Array.from({ length: 8 }, (_, i) => ({
    docid: `DOC_MOCK_${i + 1}`,
    boCd: "B000250",
    saNo: `2024013008779${i}`,
    printCsNo: `2024타경8779${i}`,
    daepyoSidoCd: "41",
    daepyoSiguCd: "117",
    jiwonNm: "수원지방법원",
    jpDeptNm: "경매12계",
    buldNm: `테스트단지_${i + 1}`,
    areaList: "84.96㎡",
    gamevalAmt: "600,000,000",
    minmaePrice: "420,000,000",
    notifyMinmaePriceRate1: "70",
    yuchalCnt: "1",
    maeGiil: "20261215",
    maeHh1: "1000",
    mulStatcd: "01",
    mulJinYn: "Y",
  }));

  globalThis.fetch = async () => {
    return {
      ok: true,
      json: async () => ({
        data: {
          ipcheck: true,
          dma_pageInfo: { totalCnt: "8", pageNo: 1, pageSize: 50 },
          dlt_srchResult: mockResults,
        },
      }),
    } as any;
  };

  try {
    const result = await runAuctionCollector({
      lawdCodes: ["41117"],
      clientOptions: { minDelayMs: 0, jitterMaxMs: 0, retryBackoffMs: 0 },
    });

    assert.equal(result.totalFetched, 8);
    assert.equal(result.totalUpserted, 8);
    assert.equal(result.blocked, false);

    const saved = getAuctions({ lawdCode: "41117" });
    assert.ok(saved.length >= 8);

    const runs = getAuctionCollectRuns(5);
    const thisRun = runs.find((r) => r.lawdCode === "41117");
    assert.ok(thisRun);
    assert.equal(thisRun.fetched, 8);
    assert.equal(thisRun.ipcheck, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
