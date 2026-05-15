"use client";

import type { ReactNode } from "react";

type RoleGateProps = {
  allow: boolean;
  children: ReactNode;
  fallback?: ReactNode;
};

export function RoleGate({ allow, children, fallback = null }: RoleGateProps) {
  if (!allow) return <>{fallback}</>;
  return <>{children}</>;
}
