import { api } from "./api";
import { setRefreshToken, setToken } from "./auth";

function authBaseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_AUTH_URL ?? "http://localhost:8001";
  return raw.replace(/\/$/, "");
}

function authOpts() {
  return { baseUrl: authBaseUrl() };
}

export type RegisterResponse = {
  id: string;
  email: string;
  full_name: string | null;
  email_verified: boolean;
  is_active: boolean;
  created_at: string;
};

export type TokenResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
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
  setRefreshToken(data.refresh_token);
  return data;
}
