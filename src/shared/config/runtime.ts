const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]", "::1"]);

function normalizeHostname(hostname: string) {
  return hostname.trim().toLowerCase().replace(/\.$/, "");
}

export function isLoopbackHostname(hostname: string) {
  return LOOPBACK_HOSTS.has(normalizeHostname(hostname));
}

const apiBase = import.meta.env.VITE_API_BASE_URL?.trim() || "/api/v1";
const useMockData = import.meta.env.VITE_USE_MOCK_DATA === "true";
const browserHostname = typeof window === "undefined" ? "127.0.0.1" : window.location.hostname;
const dashboardOrigin = typeof window === "undefined" ? "http://127.0.0.1" : window.location.origin;

function resolveApiHostname() {
  if (apiBase.startsWith("/")) return browserHostname;

  try {
    return new URL(apiBase).hostname;
  } catch {
    return "invalid";
  }
}

const apiHostname = resolveApiHostname();

export const runtimeConfig = Object.freeze({
  accessMode: "local" as const,
  apiBase,
  apiHostname,
  apiIsLoopback: isLoopbackHostname(apiHostname),
  dashboardHostname: browserHostname,
  dashboardOrigin,
  dashboardIsLoopback: isLoopbackHostname(browserHostname),
  dataMode: useMockData ? ("mock" as const) : ("live" as const),
  isDevelopment: import.meta.env.DEV,
  useMockData,
});

export function assertSafeLiveApiTarget() {
  if (!runtimeConfig.useMockData && !runtimeConfig.apiIsLoopback) {
    throw new Error(
      "로컬 전용 모드에서는 외부 Result API에 연결할 수 없습니다. API를 127.0.0.1 또는 localhost로 실행해 주세요.",
    );
  }
}
