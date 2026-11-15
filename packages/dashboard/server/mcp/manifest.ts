/**
 * MCP (Model Context Protocol) Tools Manifest
 * Agent에게 공개되는 도구 스키마 명세
 */
export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, any>;
    required?: string[];
  };
}

export function getMcpToolsManifest(): McpToolDefinition[] {
  return [
    {
      name: "search_complexes",
      description: "아파트 단지명 및 지역을 검색합니다. 키워드, 지역코드(lawd_code)를 조건으로 검색할 수 있습니다.",
      inputSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "검색할 단지명 키워드 (예: '자이', '은마', '아크로', '반포')",
          },
          lawd_code: {
            type: "string",
            description: "5자리 법정동 시군구 코드 (예: '11680' 강남구, '11650' 서초구, '41135' 성남시 분당구)",
          },
          limit: {
            type: "integer",
            description: "반환할 최대 단지 수 (기본값: 20, 최대: 100)",
          },
        },
        required: ["query"],
      },
    },
    {
      name: "get_complex_detail",
      description: "특정 아파트 단지의 상세 정보(주소, 세대수, 주차대수, 준공년도, 면적별 공급/전용 정보, 위경도 좌표)를 조회합니다.",
      inputSchema: {
        type: "object",
        properties: {
          complex_id: {
            type: "string",
            description: "단지 고유 식별자 (형식: 'lawd_code|단지명')",
          },
          complex_name: {
            type: "string",
            description: "단지명 (complex_id가 없을 경우 검색에 사용)",
          },
          lawd_code: {
            type: "string",
            description: "5자리 법정동 시군구 코드 (선택 사항)",
          },
        },
      },
    },
    {
      name: "get_recent_transactions",
      description: "특정 아파트 단지 또는 지역의 최근 실거래가 내역을 조회합니다. (거래일자, 가격, 전용면적, 층수, 동 정보)",
      inputSchema: {
        type: "object",
        properties: {
          complex_name: {
            type: "string",
            description: "아파트 단지명 (예: '반포자이', '잠실엘스')",
          },
          lawd_code: {
            type: "string",
            description: "5자리 법정동 시군구 코드 (예: '11680')",
          },
          start_date: {
            type: "string",
            description: "조회 시작일 (YYYY-MM-DD 또는 YYYYMMDD)",
          },
          end_date: {
            type: "string",
            description: "조회 종료일 (YYYY-MM-DD 또는 YYYYMMDD)",
          },
          min_price_eok: {
            type: "number",
            description: "최소 거래금액 (억원 단위, 예: 15.5)",
          },
          max_price_eok: {
            type: "number",
            description: "최대 거래금액 (억원 단위, 예: 30.0)",
          },
          limit: {
            type: "integer",
            description: "반환할 최대 거래 건수 (기본값: 30, 최대: 200)",
          },
        },
      },
    },
    {
      name: "get_transaction_stats",
      description: "특정 아파트 단지의 실거래가 통계(최근 1년 최고가/최저가/평균가, 최근 실거래가, 총 거래건수, 면적대별 통계)를 요약 조회합니다.",
      inputSchema: {
        type: "object",
        properties: {
          complex_name: {
            type: "string",
            description: "아파트 단지명 (예: '헬리오시티', '마포래미안푸르지오')",
          },
          lawd_code: {
            type: "string",
            description: "5자리 법정동 시군구 코드 (선택 사항)",
          },
          months: {
            type: "integer",
            description: "분석 대상 기간 (최근 개월 수, 기본값: 12)",
          },
        },
        required: ["complex_name"],
      },
    },
    {
      name: "search_regions",
      description: "DB에 등록된 지역 목록 및 5자리 법정동 시군구 코드(lawd_code)를 조회합니다.",
      inputSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "지역명 검색어 (예: '강남', '송파', '분당', '수원', '해운대')",
          },
        },
      },
    },
    {
      name: "list_monitoring_rules",
      description: "사용자가 myhome 시스템에 등록해 둔 실거래가 감시 및 알림 룰 목록을 조회합니다.",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
  ];
}
