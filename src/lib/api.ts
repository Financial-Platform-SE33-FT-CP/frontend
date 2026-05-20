import { getToken, getTenantId } from "./auth";

/**
 * Base URL for the generic API client.
 *
 * - Production (behind nginx): leave unset → same-origin, calls go through nginx proxy.
 * - Local dev (direct to backends): set NEXT_PUBLIC_API_URL=http://localhost:8000 in .env.local
 */
const BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");

interface RequestOptions {
  headers?: Record<string, string>;
  params?: Record<string, string>;
  /** Override base URL (e.g. auth service on a different host/port or path). */
  baseUrl?: string;
}

class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

/**
 * Resolve a path against a base URL.
 * - If base is an origin (http[s]://...), use standard URL resolution.
 * - If base is a relative path (e.g. "/api/auth"), concatenate directly.
 * - If base is empty, use the path as-is (same-origin request).
 */
function resolveUrl(path: string, base: string): string {
  if (!base) return path;
  if (/^https?:\/\//i.test(base)) {
    return new URL(path, base).toString();
  }
  // Relative base — concatenate
  return base.replace(/\/$/, "") + path;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options?: RequestOptions,
): Promise<T> {
  const base = options?.baseUrl ?? BASE_URL;
  const url = resolveUrl(path, base);

  // Append query parameters
  let finalUrl = url;
  if (options?.params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(options.params)) {
      searchParams.set(key, value);
    }
    const qs = searchParams.toString();
    if (qs) finalUrl += (finalUrl.includes("?") ? "&" : "?") + qs;
  }

  const headers: Record<string, string> = {
    ...(options?.headers ?? {}),
  };

  const token = getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const tenantId = getTenantId();
  if (tenantId) {
    headers["X-Tenant-ID"] = tenantId;
  }

  if (body !== undefined && !(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(finalUrl, {
    method,
    headers,
    body:
      body instanceof FormData
        ? body
        : body !== undefined
          ? JSON.stringify(body)
          : undefined,
  });

  if (!response.ok) {
    let errorBody: unknown;
    try {
      errorBody = await response.json();
    } catch {
      errorBody = await response.text().catch(() => null);
    }
    throw new ApiError(
      `Request failed: ${response.status} ${response.statusText}`,
      response.status,
      errorBody,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>("GET", path, undefined, options),

  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("POST", path, body, options),

  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("PATCH", path, body, options),

  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>("DELETE", path, undefined, options),
};

export { ApiError };

/** Turn FastAPI / domain error JSON into a single user-facing string. */
export function formatApiErrorBody(body: unknown): string {
  if (body == null) {
    return "Request failed.";
  }
  if (typeof body === "string" && body.trim()) {
    return body;
  }
  if (typeof body !== "object") {
    return "Request failed.";
  }
  const detail = (body as { detail?: unknown }).detail;
  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }
  if (Array.isArray(detail)) {
    const parts = detail.map((item) => {
      if (item && typeof item === "object" && "msg" in item) {
        return String((item as { msg: unknown }).msg);
      }
      return null;
    });
    const joined = parts.filter(Boolean).join(" ");
    return joined || "Validation failed.";
  }
  return "Request failed.";
}

export function formatApiError(err: unknown): string {
  if (err instanceof ApiError) {
    return formatApiErrorBody(err.body);
  }
  if (err instanceof Error) {
    return err.message;
  }
  return "Something went wrong.";
}
