import { request } from "./http.js";

export interface McpToken {
  id: string;
  user_email: string;
  name: string;
  token_prefix: string;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
  expires_at: string | null;
}

export interface CreatedMcpTokenResponse {
  id: string;
  name: string;
  raw_token: string;
  token_prefix: string;
  created_at: string;
}

/**
 * 사용자 소유의 MCP 토큰 목록을 조회합니다.
 */
export async function getMcpTokens(): Promise<McpToken[]> {
  const res = await request<{ ok: boolean; tokens: McpToken[] }>("/api/v1/mcp/tokens");
  return res.tokens || [];
}

/**
 * 신규 MCP API 토큰을 발급합니다.
 */
export async function createMcpToken(name: string): Promise<CreatedMcpTokenResponse> {
  const res = await request<{ ok: boolean; token: CreatedMcpTokenResponse }>("/api/v1/mcp/tokens", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
  return res.token;
}

/**
 * MCP API 토큰을 삭제(폐기)합니다.
 */
export async function deleteMcpToken(id: string): Promise<boolean> {
  const res = await request<{ ok: boolean }>(`/api/v1/mcp/tokens/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  return Boolean(res.ok);
}
