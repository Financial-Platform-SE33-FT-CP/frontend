const TOKEN_KEY = "auth_token";
const REFRESH_TOKEN_KEY = "auth_refresh_token";
const TENANT_ID_KEY = "tenant_id";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function getToken(): string | null {
  if (!isBrowser()) return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // localStorage unavailable
  }
}

export function removeToken(): void {
  if (!isBrowser()) return;
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // localStorage unavailable
  }
}

export function getRefreshToken(): string | null {
  if (!isBrowser()) return null;
  try {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setRefreshToken(token: string): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  } catch {
    /* ignore */
  }
}

export function removeRefreshToken(): void {
  if (!isBrowser()) return;
  try {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export function getTenantId(): string | null {
  if (!isBrowser()) return null;
  try {
    return localStorage.getItem(TENANT_ID_KEY);
  } catch {
    return null;
  }
}

export function setTenantId(id: string): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(TENANT_ID_KEY, id);
  } catch {
    // localStorage unavailable
  }
}

export function removeTenantId(): void {
  if (!isBrowser()) return;
  try {
    localStorage.removeItem(TENANT_ID_KEY);
  } catch {
    // localStorage unavailable
  }
}

export function isAuthenticated(): boolean {
  return getToken() !== null;
}
