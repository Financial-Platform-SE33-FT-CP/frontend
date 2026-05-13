import { api } from "./api";
import { clearSession, getRefreshToken, setRefreshToken, setToken } from "./auth";

function authBaseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_AUTH_URL ?? "http://localhost:8001";
  return raw.replace(/\/$/, "");
}

function authOpts() {
  return { baseUrl: authBaseUrl() };
}

export type RegisterUser = {
  id: string;
  email: string;
  full_name: string | null;
  is_email_verified: boolean;
};

export type RegisterResponse = {
  message: string;
  user: RegisterUser;
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

export async function resendVerificationCode(email: string): Promise<MessageResponse> {
  return api.post<MessageResponse>(
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
}
