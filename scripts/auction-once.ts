import { runAuctionCollector } from "@myhome/collector";
import { initDb, getAuctions, getAuctionCollectRuns } from "@myhome/shared";

async function main() {
  initDb();
  console.log("=== 법원경매 수동 1회 수집 스크립트 시작 ===");
  const args = process.argv.slice(2);
  const lawdCodes = args.length > 0 ? args : ["41117", "41135"];

  console.log(`대상 지역: ${lawdCodes.join(", ")}`);
  const result = await runAuctionCollector({ lawdCodes });

  console.log("수집 결과:", {
    totalFetched: result.totalFetched,
    totalUpserted: result.totalUpserted,
    runCount: result.runCount,
    blocked: result.blocked,
    blockedUntil: result.blockedUntil,
    errors: result.errors,
  });

  const latestRuns = getAuctionCollectRuns(5);
  console.log("최근 실행 이력:", latestRuns);

  const auctions = getAuctions({ limit: 5 });
  console.log(`적재된 경매 물건 (상위 ${auctions.length}건):`, auctions.map((a) => ({
    docid: a.docid,
    srnSaNo: a.srnSaNo,
    lawdCode: a.lawdCode,
    courtName: a.courtName,
    buldName: a.buldName,
    minPrice: a.minPrice,
    minPriceRate: a.minPriceRate,
    saleDate: a.saleDate,
  })));
}

main().catch((err) => {
  console.error("실행 중 오류 발생:", err);
  process.exit(1);
});
