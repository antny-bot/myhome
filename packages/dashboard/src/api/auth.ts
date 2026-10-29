import { request } from "./http.js";

export function checkAuth() {
  return request<{ isAuthenticated: boolean; email?: string; isAdmin?: boolean; isTemporaryPassword?: boolean }>("/api/auth/me");
}

export function logout() {
  return request<{ ok: boolean }>("/api/auth/logout", {
    method: "POST"
  });
}

export function loginLocal(email: string, password: string) {
  return request<{ ok: boolean; email: string; isTemporaryPassword?: boolean }>("/api/auth/login-local", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
}

export function addUserAccount(email: string, isAdmin: boolean) {
  return request<{ ok: boolean; email: string; tempPassword?: string; isAdmin: boolean }>("/api/auth/users", {
    method: "POST",
    body: JSON.stringify({ email, isAdmin })
  });
}

export function updateCredentials(email: string, password?: string) {
  return request<{ ok: boolean; email: string }>("/api/auth/credentials", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
}

export function loadUserConfig() {
  return request<{
    telegramBotToken: string;
    telegramChatId: string;
    kakaoRestApiKey: string;
  }>("/api/user-config");
}

export function saveUserConfig(config: {
  telegramBotToken?: string;
  telegramChatId?: string;
  kakaoRestApiKey?: string;
}) {
  return request<{ ok: boolean }>("/api/user-config", {
    method: "POST",
    body: JSON.stringify(config)
  });
}
