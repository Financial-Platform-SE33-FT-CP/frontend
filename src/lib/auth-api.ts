import { api } from "./api";
import { clearSession, getRefreshToken, setRefreshToken, setToken } from "./auth";
import { clearWorkspaceSession } from "./workspace-session";

function authBaseUrl(): string {
  // Production (behind nginx): leave unset → relative path /api/auth, calls go through proxy.
  // Local dev: set NEXT_PUBLIC_AUTH_SERVICE_URL=http://localhost:8001 in .env.local
  const raw =
    process.env.NEXT_PUBLIC_AUTH_SERVICE_URL ??
    process.env.NEXT_PUBLIC_AUTH_URL ??
    "/api/auth";
  return raw.replace(/\/$/, "");
}

function authOpts() {
  return { baseUrl: authBaseUrl() };
}

/** POST /auth/register — flat user fields + metadata (matches auth-service). */
export type RegisterResponse = {
  id: string;
  email: string;
  full_name: string | null;
  email_verified: boolean;
  is_active: boolean;
  created_at: string;
  message: string;
  /** Present in non-production for local testing. */
  verification_code: string | null;
};

export type TokenResponse = {
  access_token: string;
  refresh_token: string | null;
  token_type: string;
  expires_in: number;
  refresh_expires_in: number | null;
};

export type MessageResponse = {
  message: string;
};

export type ResendVerificationResponse = {
  message: string;
  /** Present in non-production when a new code was emailed. */
  verification_code?: string | null;
};

export type MeResponse = {
  id: string;
  email: string;
  email_verified?: boolean;
  is_email_verified?: boolean;
};

export async function registerUser(payload: {
  email: string;
  password: string;
  full_name?: string | null;
}): Promise<RegisterResponse> {
  return api.post<RegisterResponse>(
    "/auth/register",
    {
      email: payload.email.trim(),
      password: payload.password,
      full_name: payload.full_name?.trim() || null,
    },
    authOpts(),
  );
}

export async function loginUser(payload: {
  email: string;
  password: string;
}): Promise<TokenResponse> {
  const data = await api.post<TokenResponse>(
    "/auth/login",
    {
      email: payload.email.trim(),
      password: payload.password,
    },
    authOpts(),
  );
  setToken(data.access_token);
  if (data.refresh_token) {
    setRefreshToken(data.refresh_token);
  }
  return data;
}

/** Requires access token already stored (e.g. after `loginUser`). */
export async function fetchAuthMe(): Promise<MeResponse> {
  return api.get<MeResponse>("/auth/me", authOpts());
}

export async function verifyEmailCode(payload: {
  email: string;
  code: string;
}): Promise<MessageResponse> {
  return api.post<MessageResponse>(
    "/auth/verify-email-code",
    {
      email: payload.email.trim(),
      code: payload.code.trim().replace(/\s/g, ""),
    },
    authOpts(),
  );
}

export async function resendVerificationCode(email: string): Promise<ResendVerificationResponse> {
  return api.post<ResendVerificationResponse>(
    "/auth/resend-verification-code",
    { email: email.trim() },
    authOpts(),
  );
}

/** Revokes refresh token on server and clears local session. */
export async function logoutUser(): Promise<void> {
  const refresh = getRefreshToken();
  if (refresh) {
    try {
      await api.post<void>(
        "/auth/logout",
        { refresh_token: refresh },
        authOpts(),
      );
    } catch {
      // Still clear client session if server rejects token
    }
  }
  clearSession();
  clearWorkspaceSession();
}
