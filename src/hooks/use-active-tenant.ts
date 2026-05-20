"use client";

import { useEffect, useState } from "react";
import { setTenantId } from "@/lib/auth";
import { getActiveTenantId } from "@/lib/workspace-session";

/** Active company id; updates when the user picks a tenant on the Tenants page. */
export function useActiveTenantId(): string | null {
  const [tenantId, setTenantIdState] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => {
      const id = getActiveTenantId();
      setTenantIdState(id);
      if (id) setTenantId(id);
    };
    sync();
    window.addEventListener("acct-workspace-change", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("acct-workspace-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return tenantId;
}
