import test from "node:test";
import assert from "node:assert/strict";
import { syncSupplyArea } from "./areaMapper.js";
import { getDb } from "./db.js";
import { setupTestDb, teardownTestDb } from "./testUtils.js";

test("CircuitBreaker: 5회 연속 오류 발생 시 서킷 오픈되어 후속 호출 즉시 차단(fallback 반환)", async () => {
  setupTestDb();

  const originalFetch = globalThis.fetch;
  let fetchCallCount = 0;

  // fetch 모킹: 카카오 API는 성공, 국토부 건축HUB API는 HTTP 500 에러 발생
  globalThis.fetch = async (url: string | URL | Request): Promise<Response> => {
    const urlStr = typeof url === "string" ? url : url.toString();
    fetchCallCount++;

    if (urlStr.includes("dapi.kakao.com")) {
      return new Response(
        JSON.stringify({
          documents: [
            {
              address: {
                b_code: "1111012300"
              }
            }
          ]
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    if (urlStr.includes("apis.data.go.kr")) {
      return new Response("<error>Internal Server Error</error>", {
        status: 500,
        statusText: "Internal Server Error"
      });
    }

    return new Response("OK", { status: 200 });
  };

  try {
    process.env.DATA_GO_KR_API_KEY = "MOCK_DATA_GO_KR_API_KEY";
    process.env.KAKAO_REST_API_KEY = "MOCK_KAKAO_REST_API_KEY";

    const db = getDb();
    const now = new Date().toISOString();

    db.exec("DELETE FROM complex_area_mappings WHERE complex_id LIKE 'TEST_COMPLEX_CB_%'");

    db.prepare(`
      INSERT INTO regions (lawd_code, display_name, created_at)
      VALUES (?, ?, ?)
      ON CONFLICT(lawd_code) DO NOTHING
    `).run("11110", "서울특별시 테스트구", now);

    const stmt = db.prepare(`
      INSERT INTO complexes (id, lawd_code, name, created_at, dong_name, jibun, road_name)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO NOTHING
    `);

    for (let i = 1; i <= 6; i++) {
      stmt.run(`TEST_COMPLEX_CB_${i}`, "11110", `테스트아파트_${i}`, now, "테스트동", "100", "테스트로");
    }

    // 1회~5회차 호출로 실패 누적 유도
    for (let i = 1; i <= 5; i++) {
      const areaM2 = 84 + i;
      const result = await syncSupplyArea({
        complexId: `TEST_COMPLEX_CB_${i}`,
        complexName: `테스트아파트_${i}`,
        lawdCode: "11110",
        dongName: "테스트동",
        jibun: "100",
        areaM2,
        regionDisplayName: "서울특별시 테스트구"
      });
      const expectedFallback = Number((areaM2 / 0.78).toFixed(2));
      assert.equal(result, expectedFallback);
    }

    // 6회차 호출: 서킷 브레이커 OPEN 상태이므로 API 호출 없이 즉시 fallback 반환
    const fetchBefore = fetchCallCount;
    const result6 = await syncSupplyArea({
      complexId: "TEST_COMPLEX_CB_6",
      complexName: "테스트아파트_6",
      lawdCode: "11110",
      dongName: "테스트동",
      jibun: "100",
      areaM2: 90,
      regionDisplayName: "서울특별시 테스트구"
    });

    const expectedFallback6 = Number((90 / 0.78).toFixed(2));
    assert.equal(result6, expectedFallback6);
    assert.equal(fetchCallCount - fetchBefore, 0, "서킷 브레이커가 OPEN되어 외부 API를 호출하지 않아야 함");
  } finally {
    globalThis.fetch = originalFetch;
    teardownTestDb();
  }
});
