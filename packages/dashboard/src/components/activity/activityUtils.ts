export function formatActivityType(type: string, t: any): string {
  const types: Record<string, string> = {
    page_view: t.activityType_page_view || "페이지 뷰",
    search_transactions: t.activityType_search_transactions || "실거래 검색",
    region_add: t.activityType_region_add || "지역 추가",
    region_delete: t.activityType_region_delete || "지역 삭제",
    rule_create: t.activityType_rule_create || "규칙 생성",
    rule_update: t.activityType_rule_update || "규칙 수정",
    rule_delete: t.activityType_rule_delete || "규칙 삭제",
    rule_test: t.activityType_rule_test || "규칙 테스트",
    preset_create: t.activityType_preset_create || "프리셋 추가",
    preset_delete: t.activityType_preset_delete || "프리셋 삭제",
    api_call: t.activityType_api_call || "API 호출",
    mcp_tool_call: t.activityType_mcp_tool_call || "MCP 도구 실행",
    mcp_connect: t.activityType_mcp_connect || "MCP 세션 연결",
    mcp_token_create: t.activityType_mcp_token_create || "MCP 토큰 발급",
    mcp_token_delete: t.activityType_mcp_token_delete || "MCP 토큰 폐기",
  };
  return types[type] || type;
}

export function getActivityTypeBadgeClass(type: string): string {
  switch (type) {
    case "mcp_tool_call":
    case "mcp_connect":
    case "mcp_token_create":
    case "mcp_token_delete":
      return "bg-purple-100 text-purple-700 dark:bg-purple-950/70 dark:text-purple-300 border border-purple-200 dark:border-purple-800";
    case "api_call":
      return "bg-sky-100 text-sky-700 dark:bg-sky-950/70 dark:text-sky-300 border border-sky-200 dark:border-sky-800";
    case "rule_create":
    case "rule_update":
    case "rule_delete":
    case "rule_test":
      return "bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200 dark:border-amber-800";
    case "region_add":
    case "region_delete":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800";
    case "search_transactions":
      return "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800";
    default:
      return "bg-primary/10 text-primary border border-primary/20";
  }
}
