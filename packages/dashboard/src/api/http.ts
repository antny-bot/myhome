export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function request<T>(url: string, init?: RequestInit): Promise<T> {
  // 하위 호환성을 유지하면서 API 호출 주소를 v1으로 자동 변환합니다.
  const targetUrl = url.startsWith("/api/") && !url.startsWith("/api/v1/")
    ? url.replace("/api/", "/api/v1/")
    : url;
  const response = await fetch(targetUrl, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...init?.headers
    }
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const message = body.error ?? `Request failed with ${response.status}`;
    const code = body.code;
    throw new ApiError(message, response.status, code);
  }
  if (response.status === 204) {
    return undefined as unknown as T;
  }
  return response.json() as Promise<T>;
}
