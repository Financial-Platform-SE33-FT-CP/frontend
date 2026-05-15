"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getWorkspaceUserId,
  setWorkspaceUserId,
} from "@/lib/workspace-session";

/** Until auth JWT is wired, set your user UUID so tenant APIs resolve membership (``X-User-Id``). */
export function WorkspaceDevBar() {
  const [value, setValue] = useState("");
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    setSaved(getWorkspaceUserId());
    setValue(getWorkspaceUserId() ?? "");
  }, []);

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-dashed border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-950 dark:text-amber-100">
      <span className="font-medium">Dev: User ID</span>
      <Input
        className="h-8 max-w-xs font-mono text-xs"
        placeholder="UUID (matches auth user id)"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="h-8"
        onClick={() => {
          setWorkspaceUserId(value);
          setSaved(getWorkspaceUserId());
        }}
      >
        Save
      </Button>
      {saved ? (
        <span className="text-muted-foreground">Saved: {saved.slice(0, 8)}…</span>
      ) : (
        <span className="text-muted-foreground">Required for tenant list / create</span>
      )}
    </div>
  );
}
