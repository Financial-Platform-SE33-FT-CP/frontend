"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatApiError } from "@/lib/api";
import {
  createAccount,
  deactivateAccount,
  getAccountTree,
  listAccounts,
  seedDefaultAccounts,
  updateAccount,
  type AccountDto,
  type AccountTreeNodeDto,
} from "@/lib/coa-api";

type Props = {
  canEdit: boolean;
};

const initialForm = {
  code: "",
  name: "",
  account_type: "asset",
  parent_code: "",
  description: "",
};

function TreeNode({ node }: { node: AccountTreeNodeDto }) {
  return (
    <li className="ml-4 list-disc">
      <span className="font-mono font-medium">{node.code}</span>{" "}
      <span>{node.name}</span>
      <span className="ml-2 text-xs text-muted-foreground">
        {node.account_type}
      </span>

      {node.children.length > 0 && (
        <ul className="mt-1 space-y-1">
          {node.children.map((child) => (
            <TreeNode key={child.id} node={child} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function ChartOfAccountsEditor({ canEdit }: Props) {
  const [accounts, setAccounts] = useState<AccountDto[]>([]);
  const [tree, setTree] = useState<AccountTreeNodeDto[]>([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const [accountRows, treeRows] = await Promise.all([
        listAccounts(),
        getAccountTree(),
      ]);
      setAccounts(accountRows);
      setTree(treeRows);
    } catch (error) {
      toast.error("Failed to load chart of accounts", {
        description: formatApiError(error),
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleSeed() {
    setLoading(true);
    try {
      await seedDefaultAccounts();
      toast.success("Default chart of accounts seeded.");
      await refresh();
    } catch (error) {
      toast.error("Failed to seed chart of accounts", {
        description: formatApiError(error),
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    try {
      await createAccount({
        code: form.code.trim(),
        name: form.name.trim(),
        account_type: form.account_type,
        parent_code: form.parent_code.trim() || null,
        description: form.description.trim() || null,
      });

      setForm(initialForm);
      toast.success("Account created.");
      await refresh();
    } catch (error) {
      toast.error("Failed to create account", {
        description: formatApiError(error),
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleRename(account: AccountDto) {
    const nextName = window.prompt("New account name", account.name);
    if (!nextName || nextName.trim() === account.name) return;

    setLoading(true);
    try {
      await updateAccount(account.id, { name: nextName.trim() });
      toast.success("Account updated.");
      await refresh();
    } catch (error) {
      toast.error("Failed to update account", {
        description: formatApiError(error),
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleDeactivate(account: AccountDto) {
    const ok = window.confirm(`Deactivate ${account.code} - ${account.name}?`);
    if (!ok) return;

    setLoading(true);
    try {
      await deactivateAccount(account.id);
      toast.success("Account deactivated.");
      await refresh();
    } catch (error) {
      toast.error("Failed to deactivate account", {
        description: formatApiError(error),
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={refresh} disabled={loading}>
            Refresh
          </Button>
          <Button
            type="button"
            onClick={handleSeed}
            disabled={loading || !canEdit}
          >
            Seed Default COA
          </Button>
          {!canEdit && (
            <p className="text-sm text-muted-foreground">
              Your role is read-only. Editing actions are disabled.
            </p>
          )}
        </CardContent>
      </Card>

      {canEdit && (
        <Card>
          <CardHeader>
            <CardTitle>Create Account</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="grid gap-3 md:grid-cols-5">
              <Input
                placeholder="Code"
                value={form.code}
                onChange={(event) =>
                  setForm({ ...form, code: event.target.value })
                }
                required
              />
              <Input
                placeholder="Name"
                value={form.name}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
                required
              />
              <select
                className="rounded-md border bg-background px-3 py-2 text-sm"
                value={form.account_type}
                onChange={(event) =>
                  setForm({ ...form, account_type: event.target.value })
                }
              >
                <option value="asset">asset</option>
                <option value="liability">liability</option>
                <option value="equity">equity</option>
                <option value="revenue">revenue</option>
                <option value="expense">expense</option>
              </select>
              <Input
                placeholder="Parent code optional"
                value={form.parent_code}
                onChange={(event) =>
                  setForm({ ...form, parent_code: event.target.value })
                }
              />
              <Button type="submit" disabled={loading}>
                Create
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Account List</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="px-3 py-2 text-left">Code</th>
                  <th className="px-3 py-2 text-left">Name</th>
                  <th className="px-3 py-2 text-left">Type</th>
                  <th className="px-3 py-2 text-left">Active</th>
                  <th className="px-3 py-2 text-left">System</th>
                  <th className="px-3 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <tr key={account.id} className="border-t">
                    <td className="px-3 py-2 font-mono">{account.code}</td>
                    <td className="px-3 py-2">{account.name}</td>
                    <td className="px-3 py-2">{account.account_type}</td>
                    <td className="px-3 py-2">{String(account.is_active)}</td>
                    <td className="px-3 py-2">{String(account.is_system)}</td>
                    <td className="space-x-2 px-3 py-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={loading || !canEdit}
                        onClick={() => handleRename(account)}
                      >
                        Rename
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={loading || !canEdit || !account.is_active}
                        onClick={() => handleDeactivate(account)}
                      >
                        Deactivate
                      </Button>
                    </td>
                  </tr>
                ))}

                {accounts.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-3 py-8 text-center text-muted-foreground"
                    >
                      No accounts found. Try seeding the default COA.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account Tree</CardTitle>
        </CardHeader>
        <CardContent>
          {tree.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No tree data available.
            </p>
          ) : (
            <ul className="space-y-1">
              {tree.map((node) => (
                <TreeNode key={node.id} node={node} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}