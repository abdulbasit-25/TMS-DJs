import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertTriangle, Database, Loader2, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_app/admin/data-deletion copy")({ component: DataDeletionPage });

type Resource =
  | "notifications"
  | "leads"
  | "customers"
  | "followups"
  | "invoices"
  | "loads"
  | "quotes"
  | "approvals"
  | "teams"
  | "carriers"
  | "commissions"
  | "activityLogs"
  | "auditLogs"
  | "loginHistory"
  | "users";

type Counts = Record<string, number>;
type PendingAction =
  { kind: "resource"; resource: Resource } | { kind: "everything" } | { kind: "reset" };

const RESOURCE_GROUPS: Array<{
  title: string;
  resources: Array<{ resource: Resource; label: string; description: string }>;
}> = [
  {
    title: "Business data",
    resources: [
      { resource: "leads", label: "Leads", description: "Permanently delete all lead records." },
      {
        resource: "customers",
        label: "Customers",
        description: "Permanently delete all customer records.",
      },
      {
        resource: "followups",
        label: "Follow-ups",
        description: "Permanently delete all follow-up records.",
      },
      { resource: "loads", label: "Loads", description: "Permanently delete all load records." },
      {
        resource: "quotes",
        label: "Quotes",
        description: "Permanently delete all quote requests.",
      },
      { resource: "invoices", label: "Invoices", description: "Permanently delete all invoices." },
    ],
  },
  {
    title: "Organization",
    resources: [
      { resource: "teams", label: "Teams", description: "Permanently delete all teams." },
      {
        resource: "carriers",
        label: "Carriers",
        description: "Soft-delete all active carriers using deletedAt.",
      },
      {
        resource: "commissions",
        label: "Commissions",
        description: "Permanently delete all commission records.",
      },
    ],
  },
  {
    title: "System data",
    resources: [
      {
        resource: "approvals",
        label: "Approvals",
        description: "Permanently delete all approval requests.",
      },
      {
        resource: "activityLogs",
        label: "Activity logs",
        description: "Permanently delete all daily activity logs.",
      },
      {
        resource: "auditLogs",
        label: "Audit logs",
        description: "Permanently delete all audit records.",
      },
      {
        resource: "loginHistory",
        label: "Login history",
        description: "Permanently delete all login and session history.",
      },
    ],
  },
];

function DataDeletionPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [counts, setCounts] = useState<Counts>({});
  const [loadingCounts, setLoadingCounts] = useState(true);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const [password, setPassword] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (session && session.role !== "admin") {
      void navigate({ to: "/admin", replace: true });
    }
  }, [navigate, session]);

  useEffect(() => {
    if (session?.role !== "admin") return;
    void refreshCounts();
  }, [session?.role]);

  async function refreshCounts() {
    setLoadingCounts(true);
    try {
      const response = await apiFetch<{ counts: Counts }>("/api/admin/data-deletion");
      setCounts(response.data.counts);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load record counts.");
    } finally {
      setLoadingCounts(false);
    }
  }

  function openAction(action: PendingAction) {
    setConfirmation("");
    setPassword("");
    setPending(action);
  }

  function expectedConfirmation() {
    if (!pending) return "";
    if (pending.kind === "everything") return "DELETE EVERYTHING";
    if (pending.kind === "reset") return "RESET";
    if (pending.resource === "users") return "DELETE ALL USERS";
    return "DELETE";
  }

  async function executeAction() {
    if (!pending || confirmation !== expectedConfirmation()) return;
    setProcessing(true);
    try {
      if (pending.kind === "reset") {
        await apiFetch("/api/admin/reset-system", {
          method: "POST",
          body: JSON.stringify({ password, confirmation }),
        });
        toast.success("System reset complete. All users were preserved.");
      } else {
        const response = await apiFetch<{
          deletedCount?: number;
          protectedCount?: number;
          deleted?: Counts;
          protected?: { users: number };
        }>("/api/admin/data-deletion", {
          method: "POST",
          body: JSON.stringify(
            pending.kind === "everything"
              ? { action: "delete_everything_except_admins", confirmation }
              : { action: "delete_resource", resource: pending.resource, confirmation },
          ),
        });
        if (pending.kind === "everything") {
          toast.success(
            `Deleted ${Object.values(response.data.deleted ?? {}).reduce((sum, value) => sum + value, 0)} records. Protected admins: ${response.data.protected?.users ?? 0}.`,
          );
        } else {
          toast.success(`Deleted ${response.data.deletedCount ?? 0} ${pending.resource}.`);
        }
      }
      setPending(null);
      await refreshCounts();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Deletion failed. No success was recorded.",
      );
    } finally {
      setProcessing(false);
    }
  }

  if (session?.role !== "admin") return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Data Deletion & System Cleanup"
        description="Manage bulk deletion of portal data. These operations are destructive and cannot be undone."
      />

      <section className="rounded-lg border border-border bg-card p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-2">
          <Database className="size-4 text-primary" />
          <h2 className="text-sm font-semibold">Record counts</h2>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto"
            onClick={() => void refreshCounts()}
            disabled={loadingCounts}
          >
            {loadingCounts ? <Loader2 className="size-4 animate-spin" /> : "Refresh"}
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {[
            "notifications",
            "leads",
            "customers",
            "loads",
            "quotes",
            "invoices",
            "teams",
            "carriers",
            "users",
            "adminUsers",
            "activityLogs",
            "auditLogs",
          ].map((key) => (
            <div key={key} className="rounded-md border border-border bg-background px-3 py-2">
              <div className="text-xs capitalize text-muted-foreground">
                {key.replace(/([A-Z])/g, " $1")}
              </div>
              <div className="mt-1 font-mono text-lg font-semibold">
                {loadingCounts ? "..." : (counts[key] ?? 0).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </section>

      <DeletionCard
        label="Notifications"
        description="Permanently delete every notification from the system."
        count={counts.notifications}
        loading={loadingCounts}
        onDelete={() => openAction({ kind: "resource", resource: "notifications" })}
      />

      {RESOURCE_GROUPS.map((group) => (
        <section key={group.title} className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">{group.title}</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {group.resources.map((item) => (
              <DeletionCard
                key={item.resource}
                label={item.label}
                description={item.description}
                count={counts[item.resource]}
                loading={loadingCounts}
                onDelete={() => openAction({ kind: "resource", resource: item.resource })}
              />
            ))}
          </div>
        </section>
      ))}

      <section className="rounded-lg border border-amber-500/30 bg-amber-500/[0.04] p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-amber-600" />
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold">Delete All Users Except Admins</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Deletes {counts.deletableUsers ?? 0} normal users and preserves all users with role
              admin, including your account.
            </p>
            <Button
              variant="destructive"
              size="sm"
              className="mt-3"
              onClick={() => openAction({ kind: "resource", resource: "users" })}
            >
              <Trash2 className="size-4" /> Delete All Users
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-lg border-2 border-destructive/40 bg-destructive/[0.04] p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" />
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-destructive">Danger Zone</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              These operations can permanently remove large amounts of system data. Verify the
              environment before continuing.
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Button variant="destructive" onClick={() => openAction({ kind: "everything" })}>
                <Trash2 className="size-4" /> Delete Everything Except Admins
              </Button>
              <Button variant="outline" onClick={() => openAction({ kind: "reset" })}>
                Full Reset Except Users
              </Button>
            </div>
          </div>
        </div>
      </section>

      <ConfirmationDialog
        pending={pending}
        counts={counts}
        confirmation={confirmation}
        password={password}
        processing={processing}
        expected={expectedConfirmation()}
        onConfirmationChange={setConfirmation}
        onPasswordChange={setPassword}
        onCancel={() => setPending(null)}
        onConfirm={() => void executeAction()}
      />
    </div>
  );
}

function DeletionCard({
  label,
  description,
  count,
  loading,
  onDelete,
}: {
  label: string;
  description: string;
  count?: number;
  loading: boolean;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card p-4">
      <div className="min-w-0">
        <h3 className="text-sm font-semibold">{label}</h3>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
        <p className="mt-2 text-xs font-medium">
          Records affected: {loading ? "..." : (count ?? 0).toLocaleString()}
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="shrink-0 text-destructive hover:text-destructive"
        onClick={onDelete}
        disabled={!loading && count === 0}
      >
        Delete all
      </Button>
    </div>
  );
}

function ConfirmationDialog({
  pending,
  counts,
  confirmation,
  password,
  processing,
  expected,
  onConfirmationChange,
  onPasswordChange,
  onCancel,
  onConfirm,
}: {
  pending: PendingAction | null;
  counts: Counts;
  confirmation: string;
  password: string;
  processing: boolean;
  expected: string;
  onConfirmationChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const label =
    pending?.kind === "resource"
      ? pending.resource
      : pending?.kind === "everything"
        ? "everything except admin users"
        : "the full system";
  const count =
    pending?.kind === "resource"
      ? pending.resource === "users"
        ? counts.deletableUsers
        : counts[pending.resource]
      : undefined;
  const needsPassword = pending?.kind === "reset";

  return (
    <AlertDialog open={!!pending} onOpenChange={(open) => !open && !processing && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {label}?</AlertDialogTitle>
          <AlertDialogDescription>
            This operation permanently removes data and cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {count !== undefined && (
          <p className="text-sm font-medium">Records affected: {count.toLocaleString()}</p>
        )}
        {pending?.kind === "resource" && pending.resource === "users" && (
          <p className="text-xs text-muted-foreground">
            Protected admin accounts: {(counts.adminUsers ?? 0).toLocaleString()}
          </p>
        )}
        {needsPassword && (
          <div className="space-y-1.5">
            <Label htmlFor="deletion-password">Admin password</Label>
            <Input
              id="deletion-password"
              type="password"
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
              autoComplete="current-password"
            />
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="deletion-confirmation">Type {expected} to confirm</Label>
          <Input
            id="deletion-confirmation"
            value={confirmation}
            onChange={(event) => onConfirmationChange(event.target.value)}
            placeholder={expected}
            autoComplete="off"
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={processing}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={processing || confirmation !== expected || (needsPassword && !password)}
            onClick={onConfirm}
          >
            {processing ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Deleting...
              </>
            ) : (
              "Delete permanently"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
