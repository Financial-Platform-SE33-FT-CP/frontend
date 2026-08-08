import { api } from "./api";
import { getActiveTenantId } from "./workspace-session";
import { setTenantId } from "./auth";

const base = () =>
  (process.env.NEXT_PUBLIC_BILLING_SERVICE_URL ?? "/api/billing").replace(
    /\/$/,
    "",
  );

function billingOpts() {
  const tenantId = getActiveTenantId();
  if (tenantId) setTenantId(tenantId);
  return { baseUrl: base() };
}

export type PlanInfo = {
  plan_tier: string;
  subscription_status: string;
  trial_ends_at: string | null;
  subscription_ends_at: string | null;
  usage: {
    invoices_this_month: number;
    max_invoices: number | null;
    users: number;
    max_users: number | null;
  };
};

export type CheckoutSessionResult = {
  url: string;
};

export async function getCurrentPlan(): Promise<PlanInfo> {
  return api.get<PlanInfo>("/billing/plan", billingOpts());
}

export async function changePlan(
  planTier: string,
): Promise<CheckoutSessionResult> {
  return api.post<CheckoutSessionResult>(
    "/billing/change-plan",
    { plan_tier: planTier },
    billingOpts(),
  );
}
