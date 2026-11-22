interface Env {
  ORIGIN_URL: string;
  CF_ACCESS_CLIENT_ID: string;
  CF_ACCESS_CLIENT_SECRET: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const target = new URL(url.pathname + url.search, context.env.ORIGIN_URL);
  const headers = new Headers(context.request.headers);
  headers.set("CF-Access-Client-Id", context.env.CF_ACCESS_CLIENT_ID);
  headers.set("CF-Access-Client-Secret", context.env.CF_ACCESS_CLIENT_SECRET);
  headers.set("X-Forwarded-Host", url.host);
  headers.set("X-Forwarded-Proto", "https");

  const init: RequestInit = {
    method: context.request.method,
    headers,
    redirect: "manual",
  };
  if (context.request.method !== "GET" && context.request.method !== "HEAD") {
    init.body = context.request.body;
  }
  return fetch(target.toString(), init);
};
