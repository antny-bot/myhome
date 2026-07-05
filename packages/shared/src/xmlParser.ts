import { XMLParser } from "fast-xml-parser";

const parser = new XMLParser({
  ignoreAttributes: true,
  parseTagValue: true,
  trimValues: true,
});

export function parseRealEstateXml(xmlText: string): any[] {
  if (!xmlText || !xmlText.trim()) return [];
  
  const jsonObj = parser.parse(xmlText);
  
  if (!jsonObj || !jsonObj.response) {
    // 혹시 에러 XML 형태가 다를 경우 헤더 검사
    if (jsonObj && jsonObj.OpenAPI_ServiceResponse) {
      const err = jsonObj.OpenAPI_ServiceResponse.cmmMsgHeader;
      throw new Error(`공공데이터 API 에러: [${err?.returnAuthMsg}] ${err?.returnReasonCode}`);
    }
    throw new Error("올바르지 않은 XML 응답 형식입니다.");
  }
  
  const header = jsonObj.response.header;
  if (!header || (header.resultCode !== "000" && header.resultCode !== 0 && header.resultCode !== "00")) {
    throw new Error(`공공데이터 API 에러: [${header?.resultCode}] ${header?.resultMsg}`);
  }
  
  const body = jsonObj.response.body;
  if (!body) return [];
  
  const itemsObj = body.items;
  if (!itemsObj || itemsObj === "") return [];
  
  const item = itemsObj.item;
  if (!item) return [];
  
  return Array.isArray(item) ? item : [item];
}
