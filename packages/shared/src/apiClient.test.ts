import test from "node:test";
import assert from "node:assert/strict";
import {
  fetchApartmentPricesPage,
  fetchApartmentPricesDirect,
  buildDataGoKrUrl,
  maskUrl,
  ApiFetchError,
} from "./apiClient.js";

test("maskUrl: serviceKey 값을 별표로 올바르게 마스킹함", () => {
  const url1 = "https://apis.data.go.kr/test?LAWD_CD=11680&serviceKey=secret1234&pageNo=1";
  assert.equal(
    maskUrl(url1),
    "https://apis.data.go.kr/test?LAWD_CD=11680&serviceKey=***&pageNo=1"
  );

  const url2 = "https://apis.data.go.kr/test?serviceKey=abc%2B123%3D";
  assert.equal(maskUrl(url2), "https://apis.data.go.kr/test?serviceKey=***");
});

test("buildDataGoKrUrl: serviceKey가 이미 인코딩되어 있으면 이중 인코딩하지 않고, 일반 문자열이면 인코딩함", () => {
  const encodedKey = "abc%2Bdef%3D";
  const url1 = buildDataGoKrUrl("https://apis.data.go.kr/endpoint", {
    serviceKey: encodedKey,
    LAWD_CD: "11680",
  });
  assert.ok(url1.includes("serviceKey=abc%2Bdef%3D"));
  assert.ok(!url1.includes("abc%252B"));

  const rawKey = "abc+def=";
  const url2 = buildDataGoKrUrl("https://apis.data.go.kr/endpoint", {
    serviceKey: rawKey,
    LAWD_CD: "11680",
  });
  assert.ok(url2.includes("serviceKey=abc%2Bdef%3D"));
});

test("fetchApartmentPricesPage: HTTP 500 발생 시 재시도 후 ApiFetchError(SERVER_ERROR) throw", async () => {
  let callCount = 0;
  const mockFetch = async () => {
    callCount++;
    return {
      ok: false,
      status: 500,
      text: async () => "Internal Server Error",
    } as any;
  };

  await assert.rejects(
    async () => {
      await fetchApartmentPricesPage("11680", "202601", 1, 1000, {
        apiKey: "test-key",
        maxRetries: 3,
        initialBackoffMs: 10,
        fetchFn: mockFetch,
      });
    },
    (err: any) => {
      assert.ok(err instanceof ApiFetchError);
      assert.equal(err.code, "SERVER_ERROR");
      assert.equal(err.status, 500);
      assert.ok(Boolean(err.maskedUrl?.includes("serviceKey=***")));
      return true;
    }
  );

  assert.equal(callCount, 3);
});

test("fetchApartmentPricesPage: resultCode 22(한도 초과) 시 재시도 없이 즉시 ApiFetchError(LIMIT_EXCEEDED) throw", async () => {
  let callCount = 0;
  const limitXml = `
    <response>
      <header>
        <resultCode>22</resultCode>
        <resultMsg>LIMITED_NUMBER_OF_SERVICE_REQUESTS_EXCEEDS_ERROR</resultMsg>
      </header>
      <body></body>
    </response>
  `;

  const mockFetch = async () => {
    callCount++;
    return {
      ok: true,
      status: 200,
      text: async () => limitXml,
    } as any;
  };

  await assert.rejects(
    async () => {
      await fetchApartmentPricesPage("11680", "202601", 1, 1000, {
        apiKey: "test-key",
        maxRetries: 3,
        initialBackoffMs: 10,
        fetchFn: mockFetch,
      });
    },
    (err: any) => {
      assert.ok(err instanceof ApiFetchError);
      assert.equal(err.code, "LIMIT_EXCEEDED");
      return true;
    }
  );

  assert.equal(callCount, 1);
});

test("fetchApartmentPricesDirect: totalCount 1500일 때 2회 페이지네이션 호출하여 총 1500건 합산 반환", async () => {
  const calls: string[] = [];

  const makeXml = (pageNo: number, countInPage: number, totalCount: number) => {
    let itemsXml = "";
    for (let i = 1; i <= countInPage; i++) {
      itemsXml += `
        <item>
          <aptNm>단지_${pageNo}_${i}</aptNm>
          <dealAmount>100,000</dealAmount>
          <dealYear>2026</dealYear>
          <dealMonth>1</dealMonth>
          <dealDay>${(i % 28) + 1}</dealDay>
          <excluUseAr>84.9</excluUseAr>
          <floor>10</floor>
          <umdNm>대치동</umdNm>
        </item>
      `;
    }

    return `
      <response>
        <header>
          <resultCode>000</resultCode>
          <resultMsg>NORMAL_SERVICE</resultMsg>
        </header>
        <body>
          <pageNo>${pageNo}</pageNo>
          <numOfRows>1000</numOfRows>
          <totalCount>${totalCount}</totalCount>
          <items>${itemsXml}</items>
        </body>
      </response>
    `;
  };

  const mockFetch = async (url: string | URL | Request) => {
    const urlStr = url.toString();
    calls.push(urlStr);
    const parsed = new URL(urlStr);
    const pageNo = Number(parsed.searchParams.get("pageNo") || "1");

    const countInPage = pageNo === 1 ? 1000 : 500;
    return {
      ok: true,
      status: 200,
      text: async () => makeXml(pageNo, countInPage, 1500),
    } as any;
  };

  const result = await fetchApartmentPricesDirect("11680", "202601", {
    apiKey: "test-key",
    fetchFn: mockFetch,
  });

  assert.equal(result.totalCount, 1500);
  assert.equal(result.items.length, 1500);
  assert.equal(calls.length, 2);
  assert.ok(calls[0].includes("pageNo=1"));
  assert.ok(calls[1].includes("pageNo=2"));
  assert.equal(result.items[0].apartmentName, "단지_1_1");
  assert.equal(result.items[1499].apartmentName, "단지_2_500");
});
