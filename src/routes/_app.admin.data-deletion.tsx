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
  Zap,
  HardDrive,
  Activity,
  Users,
  FileText,
  CircleDot,
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
  { key: "notifications", label: "Notifications", icon: CircleDot },
  { key: "leads", label: "Leads", icon: Zap },
  { key: "customers", label: "Customers", icon: Users },
  { key: "followups", label: "Follow-ups", icon: Activity },
  { key: "loads", label: "Loads", icon: HardDrive },
  { key: "quotes", label: "Quotes", icon: FileText },
  { key: "invoices", label: "Invoices", icon: FileText },
  { key: "teams", label: "Teams", icon: Users },
  { key: "carriers", label: "Carriers", icon: HardDrive },
  { key: "commissions", label: "Commissions", icon: FileText },
  { key: "approvals", label: "Approvals", icon: ShieldCheck },
  { key: "activityLogs", label: "Activity logs", icon: Activity },
  { key: "auditLogs", label: "Audit logs", icon: Activity },
  { key: "loginHistory", label: "Login history", icon: Activity },
  { key: "users", label: "Users", icon: Users },
  { key: "adminUsers", label: "Admins", icon: Shield },
];

const RESOURCE_GROUPS: Array<{
  title: string;
  icon: React.ElementType;
  gradient: string;
  bgGlow: string;
  resources: Array<{
    resource: Resource;
    label: string;
    description: string;
  }>;
}> = [
  {
    title: "Business Data",
    icon: FolderOpen,
    gradient: "from-blue-500/20 to-cyan-500/20",
    bgGlow: "shadow-blue-500/[0.03]",
    resources: [
      {
        resource: "leads",
        label: "Leads",
        description: "Permanently remove all lead records and associated metadata.",
      },
      {
        resource: "customers",
        label: "Customers",
        description: "Permanently remove all customer profiles and related data.",
      },
      {
        resource: "followups",
        label: "Follow-ups",
        description: "Permanently remove all scheduled and completed follow-ups.",
      },
      {
        resource: "loads",
        label: "Loads",
        description: "Permanently remove all load records and shipment data.",
      },
      {
        resource: "quotes",
        label: "Quotes",
        description: "Permanently remove all quote requests and responses.",
      },
      {
        resource: "invoices",
        label: "Invoices",
        description: "Permanently remove all invoices, line items, and payment records.",
      },
    ],
  },
  {
    title: "Organization",
    icon: Building2,
    gradient: "from-violet-500/20 to-purple-500/20",
    bgGlow: "shadow-violet-500/[0.03]",
    resources: [
      {
        resource: "teams",
        label: "Teams",
        description: "Permanently remove all teams and dissolve member assignments.",
      },
      {
        resource: "carriers",
        label: "Carriers",
        description: "Soft-delete all active carriers using the deletedAt flag.",
      },
      {
        resource: "commissions",
        label: "Commissions",
        description: "Permanently remove all commission calculations and records.",
      },
    ],
  },
  {
    title: "System & Logs",
    icon: Shield,
    gradient: "from-slate-400/15 to-zinc-400/15",
    bgGlow: "shadow-slate-500/[0.02]",
    resources: [
      {
        resource: "approvals",
        label: "Approvals",
        description: "Permanently remove all approval workflows and history.",
      },
      {
        resource: "activityLogs",
        label: "Activity Logs",
        description: "Permanently remove all daily activity log entries.",
      },
      {
        resource: "auditLogs",
        label: "Audit Logs",
        description: "Permanently remove the entire audit trail.",
      },
      {
        resource: "loginHistory",
        label: "Login History",
        description: "Permanently remove all session and login records.",
      },
    ],
  },
];

/* ─── Animated counter ────────────────────────────────────────────── */

function AnimatedNumber({ value, loading }: { value: number; loading: boolean }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (loading) {
      setDisplay(0);
      return;
    }
    const start = display;
    const diff = value - start;
    if (diff === 0) return;
    const duration = Math.min(600, Math.max(200, Math.abs(diff) * 2));
    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + diff * eased));
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, loading]);

  return <span className="tabular-nums">{loading ? "–" : display.toLocaleString()}</span>;
}

/* ─── Count cell ──────────────────────────────────────────────────── */

function CountCell({
  item,
  value,
  loading,
  muted,
}: {
  item: (typeof COUNT_ITEMS)[number];
  value: number;
  loading: boolean;
  muted?: boolean;
}) {
  const Icon = item.icon;
  const isEmpty = !loading && value === 0;

  return (
    <div
      className={`group relative overflow-hidden rounded-xl border p-3.5 transition-all duration-300 ${
        muted
          ? "border-amber-500/20 bg-gradient-to-br from-amber-50/80 to-orange-50/50 dark:from-amber-950/30 dark:to-orange-950/20"
          : isEmpty
            ? "border-border/40 bg-muted/30"
            : "border-border/60 bg-card hover:border-border hover:shadow-sm"
      }`}
    >
      {/* Subtle corner glow for non-empty */}
      {!isEmpty && !muted && (
        <div className="pointer-events-none absolute -right-4 -top-4 size-16 rounded-full bg-gradient-to-br from-primary/5 to-transparent blur-2xl transition-opacity duration-300 group-hover:opacity-150" />
      )}

      <div className="relative flex items-center justify-between">
        <div
          className={`flex size-7 items-center justify-center rounded-lg transition-colors ${
            muted
              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
              : isEmpty
                ? "bg-muted/60 text-muted-foreground/40"
                : "bg-primary/8 text-primary/70"
          }`}
        >
          <Icon className="size-3.5" />
        </div>
        {value > 0 && !muted && (
          <span className="flex size-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50">
            <span className="absolute inline-flex size-2 animate-ping rounded-full bg-emerald-400 opacity-40" />
          </span>
        )}
      </div>

      <div className="relative mt-3">
        <div
          className={`text-xl font-bold leading-none tracking-tight ${
            loading
              ? "animate-pulse text-muted-foreground/30"
              : isEmpty
                ? "text-muted-foreground/25"
                : "text-foreground"
          }`}
        >
          <AnimatedNumber value={value} loading={loading} />
        </div>
        <div
          className={`mt-1.5 text-[10px] font-semibold uppercase tracking-wider ${
            muted ? "text-amber-600/60 dark:text-amber-400/50" : "text-muted-foreground/60"
          }`}
        >
          {item.label}
        </div>
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
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`group relative overflow-hidden rounded-xl border transition-all duration-300 ${
        isEmpty
          ? "border-border/30 bg-muted/20 opacity-40"
          : hovered
            ? "border-red-500/30 bg-gradient-to-br from-red-50/50 via-card to-card dark:from-red-950/20 dark:to-card shadow-lg shadow-red-500/[0.04]"
            : "border-border/50 bg-card hover:border-red-500/15 hover:shadow-md hover:shadow-red-500/[0.02]"
      }`}
    >
      {/* Left accent bar */}
      {!isEmpty && (
        <div
          className={`absolute left-0 top-0 bottom-0 w-[3px] transition-all duration-300 ${
            hovered ? "bg-red-500 shadow-sm shadow-red-500/50" : "bg-red-500/30"
          }`}
        />
      )}

      <div className="flex items-start justify-between gap-4 p-4 pl-5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            <h3
              className={`text-sm font-semibold tracking-tight transition-colors ${
                isEmpty
                  ? "text-muted-foreground/50"
                  : hovered
                    ? "text-red-600 dark:text-red-400"
                    : ""
              }`}
            >
              {label}
            </h3>
            {!isEmpty && (
              <span
                className={`inline-flex size-1.5 rounded-full transition-colors duration-300 ${
                  hovered ? "bg-red-500 shadow-sm shadow-red-500/50" : "bg-red-400/60"
                }`}
              />
            )}
          </div>
          <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground/80">
            {description}
          </p>
          <div className="mt-3 flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold tabular-nums transition-colors ${
                isEmpty
                  ? "bg-muted/50 text-muted-foreground/30"
                  : hovered
                    ? "bg-red-500/10 text-red-600 dark:text-red-400"
                    : "bg-muted/60 text-muted-foreground"
              }`}
            >
              <AnimatedNumber value={count ?? 0} loading={loading} />
              <span className="font-medium opacity-60">records</span>
            </span>
          </div>
        </div>

        <Button
          variant={isEmpty ? "ghost" : "outline"}
          size="sm"
          className={`mt-0.5 shrink-0 transition-all duration-200 ${
            isEmpty
              ? "cursor-not-allowed text-muted-foreground/30"
              : hovered
                ? "border-red-500/40 bg-red-500 text-white shadow-md shadow-red-500/25 hover:bg-red-600 hover:text-white"
                : "text-destructive/80 hover:border-red-500/30 hover:bg-red-500/10 hover:text-destructive"
          }`}
          onClick={onDelete}
          disabled={loading || isEmpty}
        >
          {isEmpty ? (
            "Empty"
          ) : (
            <>
              <Trash2 className="size-3.5" />
              <span className="hidden sm:inline">Delete all</span>
              <span className="sm:hidden">Delete</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

/* ─── Group section ───────────────────────────────────────────────── */

function GroupSection({
  icon: Icon,
  title,
  gradient,
  bgGlow,
  resources,
  counts,
  loading,
  onAction,
}: {
  icon: React.ElementType;
  title: string;
  gradient: string;
  bgGlow: string;
  resources: Array<{ resource: Resource; label: string; description: string }>;
  counts: Counts;
  loading: boolean;
  onAction: (r: Resource) => void;
}) {
  const groupCount = resources.reduce((sum, r) => sum + (counts[r.resource] ?? 0), 0);

  return (
    <section className={`rounded-2xl border border-border/50 bg-card shadow-sm ${bgGlow}`}>
      {/* Group header */}
      <div className="relative overflow-hidden border-b border-border/40 px-5 py-4">
        <div
          className={`pointer-events-none absolute inset-0 bg-gradient-to-r ${gradient} opacity-60`}
        />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-lg bg-background/80 backdrop-blur-sm border border-border/40 shadow-sm">
              <Icon className="size-4 text-foreground/80" />
            </div>
            <div>
              <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-foreground/80">
                {title}
              </h2>
              <p className="mt-0.5 text-[10px] text-muted-foreground/60">
                <span className="font-semibold text-foreground/60">
                  {loading ? "…" : groupCount.toLocaleString()}
                </span>{" "}
                total records
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {resources.map((r) => (
              <span
                key={r.resource}
                className={`block size-1.5 rounded-full transition-colors ${
                  (counts[r.resource] ?? 0) > 0
                    ? "bg-emerald-500 shadow-sm shadow-emerald-500/40"
                    : "bg-muted-foreground/15"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Cards */}
      <div className="grid gap-px bg-border/20 p-px md:grid-cols-2">
        {resources.map((item, idx) => (
          <div
            key={item.resource}
            className={idx % 2 === 1 ? "md:border-l md:border-border/20" : ""}
          >
            <DeletionCard
              label={item.label}
              description={item.description}
              count={counts[item.resource]}
              loading={loading}
              onDelete={() => onAction(item.resource)}
            />
          </div>
        ))}
      </div>
    </section>
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
      <AlertDialogContent className="overflow-hidden rounded-2xl border-0 p-0 sm:max-w-md">
        {/* Red gradient top bar */}
        <div className="h-1 w-full bg-gradient-to-r from-red-500 via-red-600 to-orange-500" />

        <div className="px-6 pt-6 pb-2">
          <AlertDialogHeader>
            <div className="flex items-center gap-4">
              <div className="relative flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-red-500/15 to-orange-500/15 ring-1 ring-red-500/20">
                <AlertTriangle className="size-6 text-red-500" />
                <span className="absolute -right-0.5 -top-0.5 flex size-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-60" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
                </span>
              </div>
              <AlertDialogTitle className="text-left text-base font-bold tracking-tight">
                Delete {label}?
              </AlertDialogTitle>
            </div>
          </AlertDialogHeader>
        </div>

        <div className="space-y-4 px-6 pb-6">
          {/* Warning box */}
          <div className="relative overflow-hidden rounded-xl border border-red-500/20 bg-gradient-to-br from-red-50/80 to-orange-50/50 p-4 dark:from-red-950/40 dark:to-orange-950/30">
            <div className="pointer-events-none absolute -right-6 -top-6 size-24 rounded-full bg-red-500/5 blur-2xl" />
            <p className="relative text-xs leading-relaxed font-medium text-red-700 dark:text-red-400">
              This operation will permanently remove data from the database. There is no undo and no
              recovery mechanism.
            </p>
          </div>

          {/* Record count */}
          {count !== undefined && (
            <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 px-4 py-3">
              <span className="text-xs font-medium text-muted-foreground">Records affected</span>
              <span className="text-lg font-bold tabular-nums tracking-tight">
                {count.toLocaleString()}
              </span>
            </div>
          )}

          {/* Admin protection notice */}
          {pending?.kind === "resource" && pending.resource === "users" && (
            <div className="flex items-center gap-2 rounded-lg bg-amber-50/80 px-3 py-2 dark:bg-amber-950/30">
              <ShieldCheck className="size-3.5 text-amber-600 dark:text-amber-400" />
              <p className="text-[11px] font-medium text-amber-700 dark:text-amber-400">
                Protected admin accounts:{" "}
                <span className="font-bold">{(counts.adminUsers ?? 0).toLocaleString()}</span>
              </p>
            </div>
          )}

          {/* Password field (reset only) */}
          {needsPassword && (
            <div className="space-y-2">
              <Label
                htmlFor="deletion-password"
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Admin password
              </Label>
              <Input
                id="deletion-password"
                type="password"
                value={password}
                onChange={(e) => onPasswordChange(e.target.value)}
                autoComplete="current-password"
                className="h-10 rounded-lg border-border/60 bg-muted/30 transition-colors focus:border-red-500/50 focus:ring-red-500/20"
              />
            </div>
          )}

          {/* Confirmation input */}
          <div className="space-y-2">
            <Label
              htmlFor="deletion-confirm"
              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              Type{" "}
              <code className="rounded-md bg-red-500/10 px-2 py-0.5 font-mono text-[11px] font-bold text-red-600 dark:text-red-400 ring-1 ring-red-500/20">
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
              className={`h-10 rounded-lg border-border/60 bg-muted/30 font-mono text-sm transition-all duration-200 focus:ring-2 ${
                isConfirmed
                  ? "border-red-500/50 text-red-600 shadow-sm shadow-red-500/10 focus:border-red-500/60 focus:ring-red-500/20 dark:text-red-400"
                  : "focus:border-border focus:ring-primary/10"
              }`}
            />
            {confirmation && !isConfirmed && (
              <p className="text-[10px] font-medium text-red-500/80">Text does not match</p>
            )}
          </div>
        </div>

        <AlertDialogFooter className="flex-col-reverse gap-2 border-t border-border/40 bg-muted/20 px-6 py-4 sm:flex-row">
          <AlertDialogCancel
            disabled={processing}
            className="w-full rounded-lg border-border/60 sm:w-auto"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={processing || !isConfirmed || (needsPassword && !password)}
            onClick={onConfirm}
            className={`w-full rounded-lg shadow-lg sm:w-auto ${
              isConfirmed
                ? "bg-gradient-to-r from-red-600 to-red-500 text-white shadow-red-500/25 hover:from-red-700 hover:to-red-600"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {processing ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Deleting…
              </>
            ) : (
              <>
                <Trash2 className="size-3.5" />
                Delete permanently
              </>
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
    <div className="mx-auto max-w-5xl space-y-8 pb-16">
      {/* ── Back link ── */}
      <Link
        to="/admin"
        className="group inline-flex items-center gap-2 text-xs font-medium text-muted-foreground/70 transition-all hover:text-foreground"
      >
        <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
        Back to Admin Panel
      </Link>

      {/* ── Hero ── */}
      <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm">
        {/* Background effects */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-20 -top-20 size-60 rounded-full bg-red-500/[0.04] blur-3xl" />
          <div className="absolute -bottom-20 -right-20 size-80 rounded-full bg-orange-500/[0.03] blur-3xl" />
          <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_48%,rgba(0,0,0,0.01)_49%,rgba(0,0,0,0.01)_51%,transparent_52%)] bg-[length:20px_20px]" />
        </div>

        <div className="relative z-10 flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div className="space-y-2">
            <div className="flex items-center gap-3.5">
              <div className="relative flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-red-500/15 to-orange-500/15 ring-1 ring-red-500/15">
                <Database className="size-5 text-red-500" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Data Deletion</h1>
                <p className="text-xs font-medium text-muted-foreground/60">Administrative tool</p>
              </div>
            </div>
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:ml-[58px]">
              Bulk deletion of portal data. These operations are{" "}
              <span className="font-semibold text-red-500/80">destructive and irreversible</span>.
              Exercise extreme caution.
            </p>
          </div>

          {/* Quick stats */}
          <div className="flex gap-3 sm:ml-auto">
            <div className="rounded-xl border border-border/50 bg-background/80 px-4 py-3 text-center backdrop-blur-sm">
              <div className="text-xl font-bold tabular-nums tracking-tight">
                <AnimatedNumber value={totalRecords} loading={loadingCounts} />
              </div>
              <div className="mt-0.5 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                Total
              </div>
            </div>
            <div className="rounded-xl border border-border/50 bg-background/80 px-4 py-3 text-center backdrop-blur-sm">
              <div className="text-xl font-bold tabular-nums tracking-tight">
                <AnimatedNumber value={nonEmptyCount} loading={loadingCounts} />
              </div>
              <div className="mt-0.5 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                Active
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Record counts grid ── */}
      <section className="rounded-2xl border border-border/50 bg-card shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-border/40 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-7 items-center justify-center rounded-lg bg-muted/50">
              <Activity className="size-3.5 text-muted-foreground/60" />
            </div>
            <h2 className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground/70">
              Record Counts
            </h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 rounded-lg px-3 text-[11px] font-medium text-muted-foreground/70 transition-colors hover:text-foreground hover:bg-muted/50"
            onClick={() => void refreshCounts()}
            disabled={loadingCounts}
          >
            <RefreshCw className={`size-3 ${loadingCounts ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-2.5 p-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
          {COUNT_ITEMS.map((item) => (
            <CountCell
              key={item.key}
              item={item}
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
        <GroupSection
          key={group.title}
          icon={group.icon}
          title={group.title}
          gradient={group.gradient}
          bgGlow={group.bgGlow}
          resources={group.resources}
          counts={counts}
          loading={loadingCounts}
          onAction={(resource) => openAction({ kind: "resource", resource })}
        />
      ))}

      {/* ── Delete all users ── */}
      <section className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-card shadow-sm shadow-amber-500/[0.02]">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-16 top-0 size-48 rounded-full bg-amber-500/[0.04] blur-3xl" />
          <div className="absolute -right-16 -bottom-16 size-48 rounded-full bg-orange-500/[0.03] blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-start gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/15 to-orange-500/15 ring-1 ring-amber-500/20">
              <ShieldCheck className="size-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold tracking-tight text-amber-700 dark:text-amber-400">
                Delete All Users Except Admins
              </h2>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                Removes{" "}
                <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-1.5 py-0.5 font-bold tabular-nums text-amber-700 dark:text-amber-400">
                  <AnimatedNumber value={counts.deletableUsers ?? 0} loading={loadingCounts} />
                </span>{" "}
                normal user accounts while preserving all admin accounts.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 gap-1.5 rounded-lg border-amber-500/30 bg-amber-500/5 text-amber-700 shadow-sm transition-all hover:border-amber-500/50 hover:bg-amber-500/10 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300"
            onClick={() => openAction({ kind: "resource", resource: "users" })}
            disabled={loadingCounts || (counts.deletableUsers ?? 0) === 0}
          >
            <Trash2 className="size-3.5" />
            Delete all users
          </Button>
        </div>
      </section>

      {/* ── Danger zone ── */}
      <section className="relative overflow-hidden rounded-2xl border border-red-500/20 bg-gradient-to-b from-zinc-950/[0.04] via-card to-card shadow-lg shadow-red-500/[0.03] dark:from-zinc-900/40">
        {/* Background effects */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-32 top-1/2 size-64 -translate-y-1/2 rounded-full bg-red-500/[0.06] blur-3xl" />
          <div className="absolute -right-32 -bottom-32 size-64 rounded-full bg-red-600/[0.04] blur-3xl" />
          {/* Subtle grid */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(239,68,68,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(239,68,68,0.02)_1px,transparent_1px)] bg-[size:32px_32px]" />
        </div>

        {/* Top accent */}
        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-red-500/40 to-transparent" />

        <div className="relative z-10 p-6 sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="relative flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-red-500/20 to-red-600/10 ring-1 ring-red-500/20">
                <AlertTriangle className="size-6 text-red-500" />
                <span className="absolute -right-0.5 -top-0.5 flex size-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-60" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
                </span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold uppercase tracking-[0.1em] text-red-600 dark:text-red-400">
                    Danger Zone
                  </h2>
                  <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-red-500 ring-1 ring-red-500/20">
                    Critical
                  </span>
                </div>
                <p className="mt-2 max-w-md text-xs leading-relaxed text-muted-foreground">
                  These operations permanently remove large amounts of system data. Verify you are
                  on the correct environment before proceeding.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 sm:items-end">
              <Button
                variant="destructive"
                className="w-full gap-2 rounded-xl shadow-lg shadow-red-500/20 transition-all hover:shadow-xl hover:shadow-red-500/30 sm:w-auto"
                onClick={() => openAction({ kind: "everything" })}
              >
                <Trash2 className="size-4" />
                Delete everything except admins
              </Button>
              <Button
                variant="outline"
                className="w-full gap-2 rounded-xl border-border/50 text-muted-foreground transition-all hover:border-border hover:text-foreground hover:bg-muted/50 sm:w-auto"
                onClick={() => openAction({ kind: "reset" })}
              >
                <RefreshCw className="size-3.5" />
                Full reset except users
              </Button>
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
