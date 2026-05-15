"use client";

import { useEffect, useState } from "react";
import { getActiveTenantRole } from "@/lib/workspace-session";

export function useWorkspaceRole(): string | null {
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => setRole(getActiveTenantRole());
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("acct-workspace-change", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("acct-workspace-change", sync);
    };
  }, []);

  return role;
}
