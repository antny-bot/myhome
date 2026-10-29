import { XMLParser } from "fast-xml-parser";

const parser = new XMLParser({
  ignoreAttributes: true,
  parseTagValue: true,
  trimValues: true,
});

export interface ParsedXmlResponse {
  resultCode: string;
  resultMsg: string;
  items: any[];
  totalCount: number;
  pageNo: number;
  numOfRows: number;
}

export function parseRealEstateXmlResponse(xmlText: string): ParsedXmlResponse {
  if (!xmlText || !xmlText.trim()) {
    throw new Error("빈 XML 응답입니다.");
  }

  const jsonObj = parser.parse(xmlText);

  if (!jsonObj || !jsonObj.response) {
    if (jsonObj && jsonObj.OpenAPI_ServiceResponse) {
      const err = jsonObj.OpenAPI_ServiceResponse.cmmMsgHeader;
      const returnReasonCode = String(err?.returnReasonCode ?? "");
      const returnAuthMsg = String(err?.returnAuthMsg ?? "OpenAPI 인증 실패");
      const error: any = new Error(`공공데이터 API 에러: [${returnAuthMsg}] ${returnReasonCode}`);
      error.resultCode = returnReasonCode || "AUTH_ERROR";
      error.resultMsg = returnAuthMsg;
      throw error;
    }
    throw new Error("올바르지 않은 XML 응답 형식입니다.");
  }

  const header = jsonObj.response.header;
  const resultCode = String(header?.resultCode ?? "");
  const resultMsg = String(header?.resultMsg ?? "");

  const body = jsonObj.response.body;
  const totalCount = body?.totalCount !== undefined ? Number(body.totalCount) : 0;
  const pageNo = body?.pageNo !== undefined ? Number(body.pageNo) : 1;
  const numOfRows = body?.numOfRows !== undefined ? Number(body.numOfRows) : 0;

  let items: any[] = [];
  if (body && body.items && body.items !== "") {
    const item = body.items.item;
    if (item) {
      items = Array.isArray(item) ? item : [item];
    }
  }

  return {
    resultCode,
    resultMsg,
    items,
    totalCount: isNaN(totalCount) ? items.length : totalCount,
    pageNo: isNaN(pageNo) ? 1 : pageNo,
    numOfRows: isNaN(numOfRows) ? items.length : numOfRows,
  };
}

export function parseRealEstateXml(xmlText: string): any[] {
  const parsed = parseRealEstateXmlResponse(xmlText);
  if (parsed.resultCode !== "000" && parsed.resultCode !== "00" && parsed.resultCode !== "0") {
    throw new Error(`공공데이터 API 에러: [${parsed.resultCode}] ${parsed.resultMsg}`);
  }
  return parsed.items;
}
