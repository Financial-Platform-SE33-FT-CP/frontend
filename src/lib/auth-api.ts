const base = () =>
  (process.env.NEXT_PUBLIC_AUTH_SERVICE_URL ?? "http://localhost:8001").replace(/\/$/, "");
export type RegisterUserResponse = {
  id: string;
  email: string;
  full_name: string | null;
  email_verified: boolean;
  is_active: boolean;
  created_at: string;
};

async function parseError(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { detail?: unknown };
    if (typeof j.detail === "string") return j.detail;
    if (Array.isArray(j.detail)) {
      return j.detail
        .map((x: unknown) => (typeof x === "object" && x && "msg" in x ? String((x as { msg: string }).msg) : JSON.stringify(x)))
        .join("; ");
    }
    return res.statusText;
  } catch {
    return res.statusText;
  }
}

export async function registerAccount(body: {
  email: string;
  password: string;
  full_name: string | null;
}): Promise<RegisterUserResponse> {
  const res = await fetch(`${base()}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: body.email.trim(),
      password: body.password,
      full_name: body.full_name?.trim() || null,
    }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<RegisterUserResponse>;
}
