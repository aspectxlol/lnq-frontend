const DEFAULT_BACKEND_URL =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_BACKEND_URL) ||
  (typeof process !== "undefined" && process.env.BACKEND_URL) ||
  "http://localhost:3000";

function getCookie(name: string) {
  if (typeof document === "undefined") return null;
  const parts = document.cookie.split(";").map((p) => p.trim());
  const hit = parts.find((p) => p.startsWith(name + "="));
  if (!hit) return null;
  return decodeURIComponent(hit.slice(name.length + 1));
}

function setCookie(name: string, value: string) {
  if (typeof document === "undefined") return;
  // 30 days
  const maxAge = 60 * 60 * 24 * 30;
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
}

export function normalizeBackendUrl(value: string) {
  const trimmed = value.trim();
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
  const url = new URL(withProtocol);
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("URL must be http or https");
  return url.origin;
}

export function getBackendUrl() {
  if (typeof window === "undefined") return DEFAULT_BACKEND_URL;
  const fromLocal = window.localStorage.getItem("backendUrl");
  const fromCookie = getCookie("backendUrl");
  return fromLocal || fromCookie || DEFAULT_BACKEND_URL;
}

export function setBackendUrl(url: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("backendUrl", url);
  setCookie("backendUrl", url);
}

export function buildBackendUrl(pathname: string) {
  const base = getBackendUrl();
  const target = new URL(pathname.startsWith("/") ? pathname : `/${pathname}`, base);
  return target.toString();
}
