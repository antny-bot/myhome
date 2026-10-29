import { simpleStringHash } from "../geocoding-utils.js";
import { calculateCategoryScore, calculateParkingScore } from "./scoreCalculator.js";

/**
 * Mock 입지 평가 (API 키 미설정 또는 좌표 없을 때 해시 기반 생성)
 */
export function generateMockInfraRating(complexName: string, parkingPerHousehold?: number | null) {
  const hash = simpleStringHash(complexName);
  const categoryConfigs = [
    { code: "SW8", name: "역세권", weight: 1.5, radius: 1000, baseDist: 150, countMax: 4 },
    { code: "SC4", name: "학교", weight: 1.2, radius: 500, baseDist: 100, countMax: 3 },
    { code: "HP8", name: "병원", weight: 0.8, radius: 1000, baseDist: 200, countMax: 5 },
    { code: "MT1", name: "대형마트", weight: 0.7, radius: 1500, baseDist: 400, countMax: 2 }
  ];

  const categories: Record<string, any> = {};
  let weightedScoreSum = 0;
  let weightSum = 0;

  for (const config of categoryConfigs) {
    const categoryHash = hash + config.code.charCodeAt(0) + config.code.charCodeAt(1);

    // 해시 기반으로 시설이 존재 여부 및 거리 시뮬레이션
    const simulatedDist = config.baseDist + (categoryHash % Math.round(config.radius * 1.3));
    const hasFacilities = simulatedDist <= config.radius;

    let count = 0;
    let minDistance: number | null = null;
    let score = 0;
    let details: any = null;

    if (hasFacilities) {
      count = (categoryHash % config.countMax) + 1;
      minDistance = simulatedDist;

      if (config.code === "SW8") {
        const isGtxExist = (categoryHash % 4) === 0;
        const gtxCount = isGtxExist ? 1 : 0;
        const gtxMinDistance = isGtxExist ? simulatedDist + 500 : null;

        const isRailExist = (categoryHash % 3) === 0;
        const railCount = isRailExist ? 1 : 0;
        const railMinDistance = isRailExist ? simulatedDist + 300 : null;

        const metroCount = count;
        const metroMinDistance = simulatedDist;

        details = {
          metroCount,
          metroMinDistance,
          gtxCount,
          gtxMinDistance,
          railCount,
          railMinDistance
        };
      } else if (config.code === "HP8") {
        const isBigHospitalExist = (categoryHash % 3) > 0;
        const generalHospitalCount = isBigHospitalExist ? 1 : 0;
        const generalHospitalMinDistance = isBigHospitalExist ? simulatedDist + 200 : null;
        const localClinicCount = count;
        const localClinicMinDistance = simulatedDist;
        const pharmacyCount = count * 2;
        const pharmacyMinDistance = simulatedDist;

        let sLarge = 0;
        if (generalHospitalMinDistance !== null) {
          if (generalHospitalMinDistance <= 500) sLarge = 100;
          else if (generalHospitalMinDistance <= 1000) sLarge = 80;
        }
        let sClinic = 0;
        if (localClinicMinDistance !== null) {
          const d = localClinicMinDistance;
          if (d <= 150) sClinic = 100;
          else if (d <= 300) sClinic = 80;
          else if (d <= 500) sClinic = 60;
          else if (d <= 1000) sClinic = 40;
        }

        if (generalHospitalMinDistance !== null) {
          score = Math.min(100, Math.round(sLarge * 0.7 + sClinic * 0.3 + 10));
        } else {
          score = sClinic;
        }

        details = {
          generalHospitalCount,
          generalHospitalMinDistance,
          localClinicCount,
          localClinicMinDistance,
          pharmacyCount,
          pharmacyMinDistance
        };
      } else if (config.code === "MT1") {
        const isLargeMartExist = (categoryHash % 2) > 0;
        const largeMartCount = isLargeMartExist ? 1 : 0;
        const largeMartMinDistance = isLargeMartExist ? simulatedDist + 300 : null;
        const ssmCount = count;
        const ssmMinDistance = simulatedDist;
        const convenienceCount = count * 3;
        const convenienceMinDistance = simulatedDist;

        let sMart = 0;
        if (largeMartMinDistance !== null) {
          const d = largeMartMinDistance;
          if (d <= 500) sMart = 100;
          else if (d <= 1000) sMart = 80;
          else if (d <= 1500) sMart = 60;
        }
        let sSsm = 0;
        if (ssmMinDistance !== null) {
          const d = ssmMinDistance;
          if (d <= 300) sSsm = 100;
          else if (d <= 700) sSsm = 80;
          else if (d <= 1500) sSsm = 50;
        }

        if (largeMartMinDistance !== null) {
          score = Math.min(100, Math.round(sMart * 0.7 + sSsm * 0.3));
        } else {
          score = Math.round(sSsm * 0.7);
        }

        details = {
          largeMartCount,
          largeMartMinDistance,
          ssmCount,
          ssmMinDistance,
          convenienceCount,
          convenienceMinDistance
        };
      } else if (config.code === "SC4") {
        const elementaryCount = (categoryHash % 2) + 1;
        const elementaryMinDistance = simulatedDist;
        const middleCount = (categoryHash % 2);
        const middleMinDistance = middleCount > 0 ? simulatedDist + 150 : null;
        const highCount = (categoryHash % 2);
        const highMinDistance = highCount > 0 ? simulatedDist + 300 : null;

        score = calculateCategoryScore(config.code, minDistance, count);

        details = {
          elementaryCount,
          elementaryMinDistance,
          middleCount,
          middleMinDistance,
          highCount,
          highMinDistance
        };
      } else {
        score = calculateCategoryScore(config.code, minDistance, count);
      }
    } else {
      score = 0;
    }

    categories[config.code] = {
      name: config.name,
      score,
      count,
      minDistance,
      details
    };

    weightedScoreSum += score * config.weight;
    weightSum += config.weight;
  }

  // 주차 쾌적도 (PKG) 가산 (가중치 1.2)
  const simulatedPkg = parkingPerHousehold ?? (0.8 + ((hash % 10) * 0.1));
  const pkgScoreInfo = calculateParkingScore(simulatedPkg);
  categories["PKG"] = {
    name: "주차환경",
    score: pkgScoreInfo.score,
    count: 1,
    minDistance: null,
    details: {
      parkingPerHousehold: simulatedPkg,
      status: pkgScoreInfo.label
    }
  };
  weightedScoreSum += pkgScoreInfo.score * 1.2;
  weightSum += 1.2;

  const baseScore = Math.round((weightedScoreSum / weightSum) * 10) / 10;

  // NAT (조망/환경) 가상 데이터 생성 및 가산점화
  const natCategoryHash = hash + "NAT".charCodeAt(0) + "NAT".charCodeAt(1);
  const natSimulatedDist = 150 + (natCategoryHash % 1300);
  const natHasFacilities = natSimulatedDist <= 1000;

  let natScore = 0;
  let natCount = 0;
  let natMinDistance: number | null = null;
  let natDetails: any = null;

  if (natHasFacilities) {
    const hasWater = (natCategoryHash % 2) === 0;
    const waterMinDistance = hasWater ? (natSimulatedDist % 900) + 100 : null;
    const waterType = hasWater ? (natCategoryHash % 3 === 0 ? "OCEAN" : natCategoryHash % 3 === 1 ? "RIVER" : "LAKE") : null;

    const hasGreen = (natCategoryHash % 3) > 0;
    const greenMinDistance = hasGreen ? ((natSimulatedDist + 200) % 950) + 50 : null;
    const greenType = hasGreen ? (natCategoryHash % 2 === 0 ? "FOREST" : "PARK") : null;

    let sWater = 0;
    if (waterMinDistance !== null) {
      const d = waterMinDistance;
      if (d <= 250) sWater = 100;
      else if (d <= 500) sWater = 85;
      else if (d <= 1000) sWater = 60;

      const typeWeight = waterType === "OCEAN" ? 1.2 : waterType === "RIVER" ? 1.1 : waterType === "LAKE" ? 1.0 : 0.8;
      sWater = Math.min(100, Math.round(sWater * typeWeight));
    }

    let sGreen = 0;
    if (greenMinDistance !== null) {
      const d = greenMinDistance;
      if (d <= 250) sGreen = 100;
      else if (d <= 500) sGreen = 85;
      else if (d <= 1000) sGreen = 60;

      const typeWeight = greenType === "PARK" ? 1.0 : 0.9;
      sGreen = Math.min(100, Math.round(sGreen * typeWeight));
    }

    natScore = Math.max(sWater, sGreen);
    natCount = (hasWater ? 1 : 0) + (hasGreen ? 1 : 0);
    natMinDistance = natCount > 0 ? (waterMinDistance !== null && greenMinDistance !== null ? Math.min(waterMinDistance, greenMinDistance) : waterMinDistance ?? greenMinDistance) : null;

    natDetails = {
      waterMinDistance,
      waterType,
      greenMinDistance,
      greenType
    };
  }

  categories["NAT"] = {
    name: "조망/환경",
    score: natScore,
    count: natCount,
    minDistance: natMinDistance,
    details: natDetails
  };

  const bonus = Math.round((natScore / 10) * 10) / 10; // 최대 10점 가산
  const totalScore = Math.min(100, Math.round((baseScore + bonus) * 10) / 10);

  let grade = "D";
  if (totalScore >= 90) grade = "S";
  else if (totalScore >= 80) grade = "A";
  else if (totalScore >= 70) grade = "B";
  else if (totalScore >= 60) grade = "C";

  return {
    totalScore,
    grade,
    categories,
    isMock: true
  };
}
