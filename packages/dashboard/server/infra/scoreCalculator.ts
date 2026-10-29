/**
 * 카테고리별 거리/개수 기반 가중 평점 및 주차 점수 계산 유틸
 */

export function calculateCategoryScore(code: string, minDistance: number | null, count: number): number {
  if (minDistance === null || count === 0) return 0;

  // 1. 거리 점수 계산 (S_dist)
  let distanceScore = 0;
  const d = minDistance;

  if (code === "SW8") {
    // 지하철역 (반경 1000m) - 최고 배점
    if (d <= 250) distanceScore = 100;
    else if (d <= 500) distanceScore = 85;
    else if (d <= 1000) distanceScore = 60;
    else distanceScore = 0;
  } else if (code === "SC4") {
    // 학교 (반경 500m)
    if (d <= 150) distanceScore = 100;
    else if (d <= 300) distanceScore = 85;
    else if (d <= 500) distanceScore = 60;
    else distanceScore = 0;
  } else if (code === "HP8") {
    // 병원 (반경 1000m)
    if (d <= 300) distanceScore = 100;
    else if (d <= 500) distanceScore = 80;
    else if (d <= 1000) distanceScore = 50;
    else distanceScore = 0;
  } else if (code === "MT1") {
    // 대형마트 (반경 1500m)
    if (d <= 500) distanceScore = 100;
    else if (d <= 1000) distanceScore = 80;
    else if (d <= 1500) distanceScore = 50;
    else distanceScore = 0;
  } else if (code === "PM9") {
    // 약국 (반경 500m)
    if (d <= 100) distanceScore = 100;
    else if (d <= 300) distanceScore = 80;
    else if (d <= 500) distanceScore = 50;
    else distanceScore = 0;
  } else if (code === "CS2") {
    // 편의점 (반경 300m)
    if (d <= 50) distanceScore = 100;
    else if (d <= 150) distanceScore = 80;
    else if (d <= 300) distanceScore = 50;
    else distanceScore = 0;
  } else {
    // 기본 디폴트
    if (d <= 300) distanceScore = 100;
    else if (d <= 500) distanceScore = 80;
    else if (d <= 1000) distanceScore = 50;
    else distanceScore = 0;
  }

  // 2. 최종 카테고리 평점 (거리 100%)
  return Math.round(distanceScore);
}

export function calculateParkingScore(parkingPerHousehold?: number | null): { score: number; label: string } {
  if (parkingPerHousehold === null || parkingPerHousehold === undefined || isNaN(parkingPerHousehold) || parkingPerHousehold <= 0) {
    return { score: 70, label: "정보 없음 (중위값 70점)" };
  }
  if (parkingPerHousehold >= 1.5) return { score: 100, label: "여유 (1.5대 이상)" };
  if (parkingPerHousehold >= 1.3) return { score: 85, label: "우수 (1.3~1.5대)" };
  if (parkingPerHousehold >= 1.1) return { score: 70, label: "양호 (1.1~1.3대)" };
  if (parkingPerHousehold >= 0.9) return { score: 50, label: "보통 (0.9~1.1대)" };
  return { score: 30, label: "혼잡 (0.9대 미만)" };
}
