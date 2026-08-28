import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Database,
  FolderOpen,
  Building2,
  Shield,
  Trash2,
  Loader2,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_app/admin/data-deletion")({
  component: DataDeletionPage,
});

/* ─── Types ───────────────────────────────────────────────────────── */

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

/* ─── Data ───────────────────────────────────────────────────────── */

const COUNT_ITEMS = [
  { key: "notifications", label: "Notifications" },
  { key: "leads", label: "Leads" },
  { key: "customers", label: "Customers" },
  { key: "followups", label: "Follow-ups" },
  { key: "loads", label: "Loads" },
  { key: "quotes", label: "Quotes" },
  { key: "invoices", label: "Invoices" },
  { key: "teams", label: "Teams" },
  { key: "carriers", label: "Carriers" },
  { key: "commissions", label: "Commissions" },
  { key: "approvals", label: "Approvals" },
  { key: "activityLogs", label: "Activity logs" },
  { key: "auditLogs", label: "Audit logs" },
  { key: "loginHistory", label: "Login history" },
  { key: "users", label: "Users" },
  { key: "adminUsers", label: "Admins" },
];

const RESOURCE_GROUPS: Array<{
  title: string;
  icon: React.ElementType;
  color: string;
  resources: Array<{
    resource: Resource;
    label: string;
    description: string;
  }>;
}> = [
  {
    title: "Business data",
    icon: FolderOpen,
    color: "blue",
    resources: [
      {
        resource: "leads",
        label: "Leads",
        description: "Permanently delete all lead records and associated data.",
      },
      {
        resource: "customers",
        label: "Customers",
        description: "Permanently delete all customer records and associated data.",
      },
      {
        resource: "followups",
        label: "Follow-ups",
        description: "Permanently delete all follow-up records.",
      },
      {
        resource: "loads",
        label: "Loads",
        description: "Permanently delete all load records and associated data.",
      },
      {
        resource: "quotes",
        label: "Quotes",
        description: "Permanently delete all quote requests.",
      },
      {
        resource: "invoices",
        label: "Invoices",
        description: "Permanently delete all invoices and line items.",
      },
    ],
  },
  {
    title: "Organization",
    icon: Building2,
    color: "violet",
    resources: [
      {
        resource: "teams",
        label: "Teams",
        description: "Permanently delete all teams and remove member assignments.",
      },
      {
        resource: "carriers",
        label: "Carriers",
        description: "Soft-delete all active carriers using deletedAt flag.",
      },
      {
        resource: "commissions",
        label: "Commissions",
        description: "Permanently delete all commission records and calculations.",
      },
    ],
  },
  {
    title: "System data",
    icon: Shield,
    color: "slate",
    resources: [
      {
        resource: "approvals",
        label: "Approvals",
        description: "Permanently delete all approval requests and history.",
      },
      {
        resource: "activityLogs",
        label: "Activity logs",
        description: "Permanently delete all daily activity log entries.",
      },
      {
        resource: "auditLogs",
        label: "Audit logs",
        description: "Permanently delete all audit trail records.",
      },
      {
        resource: "loginHistory",
        label: "Login history",
        description: "Permanently delete all login and session history.",
      },
    ],
  },
];

/* ─── Color helpers ───────────────────────────────────────────────── */

const GROUP_ICON_COLORS: Record<string, string> = {
  blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  slate: "bg-slate-500/10 text-slate-500 dark:text-slate-400",
};

/* ─── Count cell ──────────────────────────────────────────────────── */

function CountCell({
  label,
  value,
  loading,
  muted,
}: {
  label: string;
  value: number;
  loading: boolean;
  muted?: boolean;
}) {
  const isEmpty = !loading && value === 0;
  return (
    <div
      className={`rounded-lg border px-3 py-2.5 transition-colors ${
        muted
          ? "border-amber-500/15 bg-amber-500/[0.03]"
          : isEmpty
            ? "border-border/30 bg-muted/20"
            : "border-border/50 bg-background"
      }`}
    >
      <div
        className={`text-lg font-bold tabular-nums leading-none ${
          loading
            ? "animate-pulse text-muted-foreground/40"
            : isEmpty
              ? "text-muted-foreground/30"
              : ""
        }`}
      >
        {loading ? "–" : value.toLocaleString()}
      </div>
      <div
        className={`mt-1.5 text-[10px] font-medium leading-none ${
          muted ? "text-amber-600/70 dark:text-amber-400/60" : "text-muted-foreground"
        }`}
      >
        {label}
      </div>
    </div>
  );
}

/* ─── Deletion card ───────────────────────────────────────────────── */

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
  const isEmpty = !loading && (count ?? 0) === 0;

  return (
    <div
      className={`relative flex items-start justify-between gap-4 rounded-xl border p-4 transition-all duration-200 ${
        isEmpty
          ? "border-border/30 bg-card/50 opacity-50"
          : "border-red-500/10 bg-card hover:border-red-500/25 hover:shadow-sm hover:shadow-red-500/[0.03]"
      }`}
    >
      {/* Armed indicator bar */}
      {!isEmpty && (
        <div className="absolute left-0 top-4 bottom-4 w-[3px] rounded-full bg-red-500/40 transition-colors group-hover:bg-red-500/60" />
      )}

      <div className="min-w-0 pl-3">
        <div className="flex items-center gap-2">
          <h3 className={`text-sm font-semibold ${isEmpty ? "text-muted-foreground" : ""}`}>
            {label}
          </h3>
          {!isEmpty && <span className="inline-flex size-1.5 rounded-full bg-red-500" />}
        </div>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
        <div className="mt-2.5 flex items-center gap-1.5">
          <span
            className={`text-xs tabular-nums ${isEmpty ? "text-muted-foreground/50" : "font-medium text-muted-foreground"}`}
          >
            {loading ? "…" : (count ?? 0).toLocaleString()}
          </span>
          <span className="text-[10px] text-muted-foreground/60">records</span>
        </div>
      </div>

      <Button
        variant={isEmpty ? "ghost" : "outline"}
        size="sm"
        className={`mt-0.5 shrink-0 transition-colors ${
          isEmpty
            ? "cursor-not-allowed text-muted-foreground/40"
            : "text-destructive hover:bg-destructive hover:text-destructive-foreground"
        }`}
        onClick={onDelete}
        disabled={loading || isEmpty}
      >
        {isEmpty ? (
          "Empty"
        ) : (
          <>
            <Trash2 className="size-3.5" />
            Delete all
          </>
        )}
      </Button>
    </div>
  );
}

/* ─── Group section header ────────────────────────────────────────── */

function GroupHeader({
  icon: Icon,
  title,
  color,
}: {
  icon: React.ElementType;
  title: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex size-6 items-center justify-center rounded-md ${GROUP_ICON_COLORS[color] ?? "bg-muted text-muted-foreground"}`}
      >
        <Icon className="size-3.5" />
      </div>
      <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        {title}
      </h2>
    </div>
  );
}

/* ─── Confirmation dialog ─────────────────────────────────────────── */

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
  onConfirmationChange: (v: string) => void;
  onPasswordChange: (v: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const label =
    pending?.kind === "resource"
      ? pending.resource === "users"
        ? "all users except admins"
        : pending.resource
      : pending?.kind === "everything"
        ? "everything except admin users"
        : "the full system (except users)";

  const count =
    pending?.kind === "resource"
      ? pending.resource === "users"
        ? counts.deletableUsers
        : counts[pending.resource]
      : undefined;

  const needsPassword = pending?.kind === "reset";
  const isConfirmed = confirmation === expected;

  return (
    <AlertDialog open={!!pending} onOpenChange={(open) => !open && !processing && onCancel()}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-red-100 dark:bg-red-950/50">
              <AlertTriangle className="size-5 text-red-600 dark:text-red-400" />
            </div>
            <AlertDialogTitle className="text-left">Delete {label}?</AlertDialogTitle>
          </div>
        </AlertDialogHeader>

        {/* Warning box */}
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
          <p className="text-xs leading-relaxed text-red-700 dark:text-red-400">
            This operation will permanently remove data from the database. There is no undo and no
            recovery mechanism.
          </p>
        </div>

        {/* Record count */}
        {count !== undefined && (
          <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 px-3.5 py-2.5">
            <span className="text-xs text-muted-foreground">Records affected</span>
            <span className="text-sm font-bold tabular-nums">{count.toLocaleString()}</span>
          </div>
        )}

        {/* Admin protection notice */}
        {pending?.kind === "resource" && pending.resource === "users" && (
          <p className="text-[11px] text-muted-foreground">
            Protected admin accounts:{" "}
            <span className="font-medium">{(counts.adminUsers ?? 0).toLocaleString()}</span>
          </p>
        )}

        {/* Password field (reset only) */}
        {needsPassword && (
          <div className="space-y-1.5">
            <Label htmlFor="deletion-password" className="text-xs font-medium">
              Admin password
            </Label>
            <Input
              id="deletion-password"
              type="password"
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              autoComplete="current-password"
              className="h-9"
            />
          </div>
        )}

        {/* Confirmation input */}
        <div className="space-y-1.5">
          <Label htmlFor="deletion-confirm" className="text-xs font-medium">
            Type{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] font-bold">
              {expected}
            </code>{" "}
            to confirm
          </Label>
          <Input
            id="deletion-confirm"
            value={confirmation}
            onChange={(e) => onConfirmationChange(e.target.value)}
            placeholder={expected}
            autoComplete="off"
            className={`h-9 font-mono transition-colors ${isConfirmed ? "border-red-500/50 text-red-600 dark:text-red-400" : ""}`}
          />
        </div>

        <AlertDialogFooter className="flex-col-reverse gap-2 pt-1 sm:flex-row">
          <AlertDialogCancel disabled={processing} className="w-full sm:w-auto">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={processing || !isConfirmed || (needsPassword && !password)}
            onClick={onConfirm}
            className="w-full bg-red-600 text-white hover:bg-red-700 sm:w-auto"
          >
            {processing ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Deleting…
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

/* ═══════════════════════════════════════════════════════════════════ */

function DataDeletionPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [counts, setCounts] = useState<Counts>({});
  const [loadingCounts, setLoadingCounts] = useState(true);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const [password, setPassword] = useState("");
  const [processing, setProcessing] = useState(false);

  /* ── Auth guard ── */
  useEffect(() => {
    if (session && session.role !== "admin") {
      void navigate({ to: "/admin", replace: true });
    }
  }, [navigate, session]);

  /* ── Load counts ── */
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

  /* ── Computed ── */
  const totalRecords = useMemo(() => {
    return COUNT_ITEMS.reduce((sum, item) => sum + (counts[item.key] ?? 0), 0);
  }, [counts]);

  const nonEmptyCount = useMemo(() => {
    return COUNT_ITEMS.filter((item) => (counts[item.key] ?? 0) > 0).length;
  }, [counts]);

  /* ── Actions ── */
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
              : {
                  action: "delete_resource",
                  resource: pending.resource,
                  confirmation,
                },
          ),
        });
        if (pending.kind === "everything") {
          const total = Object.values(response.data.deleted ?? {}).reduce(
            (sum, value) => sum + value,
            0,
          );
          toast.success(
            `Deleted ${total.toLocaleString()} records across all resources. Protected admins: ${response.data.protected?.users ?? 0}.`,
          );
        } else {
          toast.success(
            `Deleted ${(response.data.deletedCount ?? 0).toLocaleString()} ${pending.resource} records.`,
          );
        }
      }
      setPending(null);
      await refreshCounts();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Deletion failed. No data was removed.");
    } finally {
      setProcessing(false);
    }
  }

  /* ── Guard ── */
  if (session?.role !== "admin") return null;

  /* ═══════════════════════════════════════════════════════════════════ */

  return (
    <div className="space-y-6">
      {/* ── Back link ── */}
      <Link
        to="/admin"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Back to Admin Panel
      </Link>

      {/* ── Hero ── */}
      <div className="relative overflow-hidden rounded-2xl border border-red-500/15 bg-card">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-red-500/[0.04] via-transparent to-orange-500/[0.03]" />

        <div className="relative z-10 flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-lg bg-red-500/10">
                <Database className="size-4.5 text-red-500" />
              </div>
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Data Deletion</h1>
            </div>
            <p className="max-w-lg text-sm text-muted-foreground sm:ml-[46px]">
              Bulk deletion of portal data. These operations are destructive and cannot be undone.
            </p>
          </div>
        </div>
      </div>

      {/* ── Record counts ── */}
      <section className="rounded-xl border border-border/60 bg-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border/40 px-5 py-3.5">
          <div className="flex items-center gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Record counts
            </h2>
            {!loadingCounts && (
              <span className="text-[11px] tabular-nums text-muted-foreground/70">
                <span className="font-semibold text-foreground">
                  {totalRecords.toLocaleString()}
                </span>{" "}
                total across <span className="font-semibold text-foreground">{nonEmptyCount}</span>{" "}
                {nonEmptyCount === 1 ? "table" : "tables"} with data
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 text-xs text-muted-foreground"
            onClick={() => void refreshCounts()}
            disabled={loadingCounts}
          >
            <RefreshCw className={`size-3 ${loadingCounts ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-px bg-border/30 sm:grid-cols-4 lg:grid-cols-6">
          {COUNT_ITEMS.map((item) => (
            <CountCell
              key={item.key}
              label={item.label}
              value={counts[item.key] ?? 0}
              loading={loadingCounts}
              muted={item.key === "adminUsers"}
            />
          ))}
        </div>
      </section>

      {/* ── Notifications (standalone) ── */}
      <DeletionCard
        label="Notifications"
        description="Permanently delete every notification from the system."
        count={counts.notifications}
        loading={loadingCounts}
        onDelete={() => openAction({ kind: "resource", resource: "notifications" })}
      />

      {/* ── Resource groups ── */}
      {RESOURCE_GROUPS.map((group) => (
        <section key={group.title} className="space-y-3">
          <GroupHeader icon={group.icon} title={group.title} color={group.color} />
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

      {/* ── Delete all users ── */}
      <section className="relative overflow-hidden rounded-xl border border-amber-500/20 bg-amber-500/[0.03] dark:bg-amber-950/10">
        <div className="pointer-events-none absolute inset-0 shadow-[inset_0_1px_30px_-15px_rgba(245,158,11,0.06)]" />

        <div className="relative z-10 flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
          <div className="flex items-start gap-3.5">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
              <ShieldCheck className="size-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                Delete All Users Except Admins
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Removes{" "}
                <span className="font-semibold tabular-nums text-foreground">
                  {loadingCounts ? "…" : (counts.deletableUsers ?? 0).toLocaleString()}
                </span>{" "}
                normal user accounts while preserving all admin accounts, including yours.
              </p>
            </div>
          </div>
          <Button
            variant="destructive"
            size="sm"
            className="shrink-0 gap-1.5 shadow-sm"
            onClick={() => openAction({ kind: "resource", resource: "users" })}
            disabled={loadingCounts || (counts.deletableUsers ?? 0) === 0}
          >
            <Trash2 className="size-3.5" />
            Delete all users
          </Button>
        </div>
      </section>

      {/* ── Danger zone ── */}
      <section className="relative overflow-hidden rounded-xl border border-red-500/25 bg-zinc-950/[0.03] dark:bg-zinc-900/30">
        {/* Inner glow */}
        <div className="pointer-events-none absolute inset-0 shadow-[inset_0_1px_50px_-20px_rgba(239,68,68,0.08)]" />

        <div className="relative z-10 p-5 sm:p-6">
          <div className="flex items-start gap-3.5">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-red-500/10">
              <div className="relative">
                <AlertTriangle className="size-5 text-red-500" />
                <span className="absolute -right-0.5 -top-0.5 flex size-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                </span>
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-bold text-red-600 dark:text-red-400">Danger Zone</h2>
              <p className="mt-1.5 max-w-lg text-xs leading-relaxed text-muted-foreground">
                These operations permanently remove large amounts of system data. Verify you are on
                the correct environment before proceeding.
              </p>

              <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
                <Button
                  variant="destructive"
                  className="gap-1.5 shadow-sm"
                  onClick={() => openAction({ kind: "everything" })}
                >
                  <Trash2 className="size-3.5" />
                  Delete everything except admins
                </Button>
                <Button
                  variant="outline"
                  className="gap-1.5 border-border/60"
                  onClick={() => openAction({ kind: "reset" })}
                >
                  <RefreshCw className="size-3.5" />
                  Full reset except users
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Dialog ── */}
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
