import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  Check,
  X,
  FileDiff,
  Clock,
  User,
  Calendar,
  MessageSquare,
  Search,
  Filter,
  RefreshCw,
  ArrowRight,
  ArrowDownUp,
  ShieldCheck,
  AlertCircle,
  Send,
  Eye,
  Pencil,
  ChevronRight,
  Sparkles,
  Inbox,
  RotateCcw,
  Ban,
  MessageCircle,
} from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { can } from "@/lib/roles";
import { relative } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/approvals")({ component: ApprovalsPage });

type ApprovalRequest = {
  id: string;
  module: string;
  recordId?: string;
  actionType: string;
  requestedBy: string;
  requestedByName: string;
  teamId?: string;
  previousValues?: Record<string, any>;
  newValues: Record<string, any>;
  status: "pending" | "approved" | "rejected" | "changes_requested";
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedByName?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  comments: any[];
  auditHistory: any[];
  createdAt: string;
  updatedAt: string;
};

const MODULES = ["leads", "followups", "customers", "quotes", "carriers", "loads"];

const MODULE_ICONS: Record<string, string> = {
  leads: "🎯",
  followups: "📋",
  customers: "🏢",
  quotes: "📄",
  carriers: "🚛",
  loads: "📦",
};

const DOC_LABELS: Record<string, string> = {
  rate_confirmation: "Rate Confirmation",
  bol: "BOL",
  pod: "POD",
  carrier_invoice: "Carrier Invoice",
  customer_invoice: "Customer Invoice",
};

function humanizeKey(key: string) {
  const withSpaces = key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/_/g, " ");
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
}

function isIsoDateString(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(v);
}

function looksLikeId(v: unknown): v is string {
  return typeof v === "string" && /^[a-f0-9]{24}$/i.test(v);
}

function formatPrimitive(v: unknown): string {
  if (v === null || v === undefined || v === "") return "(empty)";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (isIsoDateString(v)) {
    const d = new Date(v);
    return Number.isNaN(d.getTime())
      ? String(v)
      : d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  }
  return String(v);
}

function renderChangeValue(key: string, value: unknown): ReactNode {
  if (value === null || value === undefined)
    return <span className="text-muted-foreground/50 italic">(empty)</span>;

  if (key === "documents" && Array.isArray(value)) {
    if (value.length === 0) return <span className="text-muted-foreground/50 italic">(none)</span>;
    return (
      <ul className="space-y-1.5">
        {value.map((doc: any, i: number) => (
          <li key={i} className="flex items-center justify-between gap-3 text-xs">
            <span className="font-medium">
              {DOC_LABELS[doc.kind] || humanizeKey(doc.kind || "Document")}
            </span>
            <span
              className={
                doc.uploaded ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground/50"
              }
            >
              {doc.uploaded
                ? `Uploaded${doc.uploadedAt ? ` · ${formatPrimitive(doc.uploadedAt)}` : ""}`
                : "Missing"}
            </span>
          </li>
        ))}
      </ul>
    );
  }

  if (/history$/i.test(key) && Array.isArray(value)) {
    if (value.length === 0) return <span className="text-muted-foreground/50 italic">(none)</span>;
    return (
      <ul className="space-y-1.5">
        {value.map((entry: any, i: number) => {
          const when = entry.changedAt || entry.at;
          const label = entry.status ? String(entry.status).replace(/_/g, " ") : humanizeKey(key);
          return (
            <li key={i} className="flex items-center justify-between gap-3 text-xs">
              <span className="capitalize font-medium">{label}</span>
              {when && <span className="text-muted-foreground/60">{formatPrimitive(when)}</span>}
            </li>
          );
        })}
      </ul>
    );
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-muted-foreground/50 italic">(none)</span>;
    if (typeof value[0] === "object" && value[0] !== null) {
      return (
        <ul className="space-y-2">
          {value.map((entry: any, i: number) => (
            <li key={i} className="rounded-lg border border-border/40 bg-muted/10 p-2.5">
              {Object.entries(entry)
                .filter(([k, v]) => !(/by$/i.test(k) && looksLikeId(v)))
                .map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3 text-xs">
                    <span className="text-muted-foreground/60">{humanizeKey(k)}</span>
                    <span className="font-medium">{formatPrimitive(v)}</span>
                  </div>
                ))}
            </li>
          ))}
        </ul>
      );
    }
    return <span className="text-xs">{value.map((v) => formatPrimitive(v)).join(", ")}</span>;
  }

  if (typeof value === "object") {
    return (
      <div className="space-y-1">
        {Object.entries(value as Record<string, unknown>)
          .filter(([k, v]) => !(/by$/i.test(k) && looksLikeId(v)))
          .map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3 text-xs">
              <span className="text-muted-foreground/60">{humanizeKey(k)}</span>
              <span className="font-medium">{formatPrimitive(v)}</span>
            </div>
          ))}
      </div>
    );
  }

  return <span className="text-xs">{formatPrimitive(value)}</span>;
}

/* ─── Status Pill ───────────────────────────────────────────────────── */

function StatusPill({ status }: { status: ApprovalRequest["status"] }) {
  const config: Record<
    ApprovalRequest["status"],
    { label: string; dot: string; bg: string; text: string }
  > = {
    pending: {
      label: "Pending",
      dot: "bg-amber-500",
      bg: "bg-amber-500/10 border-amber-500/20",
      text: "text-amber-600 dark:text-amber-400",
    },
    approved: {
      label: "Approved",
      dot: "bg-emerald-500",
      bg: "bg-emerald-500/10 border-emerald-500/20",
      text: "text-emerald-600 dark:text-emerald-400",
    },
    changes_requested: {
      label: "Changes Requested",
      dot: "bg-blue-500",
      bg: "bg-blue-500/10 border-blue-500/20",
      text: "text-blue-600 dark:text-blue-400",
    },
    rejected: {
      label: "Rejected",
      dot: "bg-red-500",
      bg: "bg-red-500/10 border-red-500/20",
      text: "text-red-600 dark:text-red-400",
    },
  };
  const c = config[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
        c.bg,
        c.text,
      )}
    >
      <span className={cn("size-1.5 rounded-full", c.dot)} />
      {c.label}
    </span>
  );
}

/* ─── Skeleton ───────────────────────────────────────────────────────── */

function ApprovalCardSkeleton() {
  return (
    <div className="group overflow-hidden rounded-2xl border border-border/40 bg-card">
      <div className="flex items-center gap-4 p-5">
        <div className="size-10 animate-pulse rounded-xl bg-muted/50" />
        <div className="flex-1 space-y-2.5">
          <div className="flex gap-2">
            <div className="h-6 w-20 animate-pulse rounded-full bg-muted/50" />
            <div className="h-6 w-24 animate-pulse rounded-full bg-muted/40" />
          </div>
          <div className="h-3.5 w-64 animate-pulse rounded-md bg-muted/30" />
          <div className="h-3 w-40 animate-pulse rounded-md bg-muted/20" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-24 animate-pulse rounded-xl bg-muted/40" />
          <div className="h-9 w-20 animate-pulse rounded-xl bg-muted/30" />
        </div>
      </div>
    </div>
  );
}

/* ─── Reason Dialog ──────────────────────────────────────────────────── */

function ReasonDialog({
  trigger,
  title,
  description,
  placeholder,
  required,
  submitLabel,
  submitVariant = "outline",
  icon: Icon,
  onSubmit,
}: {
  trigger: ReactNode;
  title: string;
  description?: string;
  placeholder: string;
  required?: boolean;
  submitLabel: string;
  submitVariant?: "outline" | "destructive";
  icon?: React.ElementType;
  onSubmit: (reason: string) => void;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="overflow-hidden rounded-2xl border-0 p-0 shadow-2xl sm:max-w-md">
        <div className="h-1 w-full bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500" />
        <div className="p-6">
          <DialogHeader className="space-y-3">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-amber-500/10 ring-1 ring-amber-500/20">
              <Icon className="size-6 text-amber-500" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold tracking-tight">{title}</DialogTitle>
              {description && <DialogDescription className="mt-1">{description}</DialogDescription>}
            </div>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              onSubmit((formData.get("reason") as string) || "");
            }}
            className="mt-5 space-y-4"
          >
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                {required ? "Reason (required)" : "Reason (optional)"}
              </Label>
              <Textarea
                name="reason"
                placeholder={placeholder}
                required={required}
                className="rounded-xl border-border/50 bg-background transition-colors focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                rows={4}
              />
            </div>
            <DialogFooter className="flex-col-reverse gap-2.5 sm:flex-row sm:gap-2.5">
              <DialogTrigger asChild>
                <Button type="button" variant="outline" className="w-full rounded-xl sm:w-auto">
                  Cancel
                </Button>
              </DialogTrigger>
              <Button
                type="submit"
                variant={submitVariant}
                className={cn(
                  "w-full rounded-xl shadow-lg sm:w-auto",
                  submitVariant === "destructive" && "shadow-red-500/20",
                )}
              >
                {submitLabel}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ═══════════════════════════════════════════════════════════════════════ */
/*  MAIN PAGE                                                            */
/* ═══════════════════════════════════════════════════════════════════════ */

function ApprovalsPage() {
  const { session } = useAuth();
  const role = session?.role ?? "agent";
  const canAct = can(role, "approval_actions");
  const [items, setItems] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const lastRefreshRef = useRef<number>(0);

  const loadData = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      const res = await apiFetch<{ approvals: ApprovalRequest[] }>("/api/approvals", {
        method: "GET",
      });
      setItems(res.data.approvals);
    } catch (error) {
      console.error("Failed to load approvals:", error);
    } finally {
      setIsRefreshing(false);
      setLoading(false);
    }
  }, [isRefreshing]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) loadData();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    const interval = setInterval(() => {
      const now = Date.now();
      if (now - lastRefreshRef.current > 30000) {
        loadData();
        lastRefreshRef.current = now;
      }
    }, 30000);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearInterval(interval);
    };
  }, [loadData]);

  const selectedItem = selectedItemId ? (items.find((i) => i.id === selectedItemId) ?? null) : null;

  const handleDecide = async (
    approvalRequestId: string,
    action: "approve" | "reject" | "request_changes",
    reason?: string,
  ) => {
    try {
      await apiFetch("/api/approvals", {
        method: "PATCH",
        body: JSON.stringify({ approvalRequestId, action, rejectionReason: reason }),
      });
      const actionText =
        action === "approve" ? "approved" : action === "reject" ? "rejected" : "changes requested";
      toast.success(`Request ${actionText}`);
      setShowDetailsDialog(false);
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to process request");
    }
  };

  const handleUpdateRequest = async (approvalRequestId: string, newValues: Record<string, any>) => {
    try {
      await apiFetch("/api/approvals", {
        method: "PATCH",
        body: JSON.stringify({ approvalRequestId, action: "update", newValues }),
      });
      toast.success("Request updated and re-submitted");
      setShowDetailsDialog(false);
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update request");
    }
  };

  const pendingCount = items.filter((i) => i.status === "pending").length;
  const filteredItems = items
    .filter((item) => {
      const matchesSearch =
        item.requestedByName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.module.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.actionType.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesModule = moduleFilter === "all" || item.module === moduleFilter;
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      return matchesSearch && matchesModule && matchesStatus;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="space-y-6 print:hidden">
      <PageHeader
        title="Approvals"
        description="Review and manage approval requests"
        actions={
          <Button
            variant="outline"
            onClick={loadData}
            disabled={isRefreshing}
            size="sm"
            className="rounded-xl"
          >
            <RefreshCw className={cn("size-4", isRefreshing && "animate-spin")} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        }
      />

      {/* ── Stats bar ── */}
      {!loading && items.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {[
            {
              label: "Pending",
              count: items.filter((i) => i.status === "pending").length,
              dot: "bg-amber-500",
              bg: "bg-amber-500/10 border-amber-500/20",
            },
            {
              label: "Approved",
              count: items.filter((i) => i.status === "approved").length,
              dot: "bg-emerald-500",
              bg: "bg-emerald-500/10 border-emerald-500/20",
            },
            {
              label: "Changes Req.",
              count: items.filter((i) => i.status === "changes_requested").length,
              dot: "bg-blue-500",
              bg: "bg-blue-500/10 border-blue-500/20",
            },
            {
              label: "Rejected",
              count: items.filter((i) => i.status === "rejected").length,
              dot: "bg-red-500",
              bg: "bg-red-500/10 border-red-500/20",
            },
          ].map((s) => (
            <div
              key={s.label}
              className={cn(
                "flex items-center gap-2 rounded-xl border px-3.5 py-2 transition-all hover:shadow-sm",
                s.bg,
              )}
            >
              <span className={cn("size-2 rounded-full", s.dot)} />
              <span className="text-sm font-bold tabular-nums">{s.count}</span>
              <span className="text-xs text-muted-foreground/60">{s.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Filters ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/40" />
          <Input
            placeholder="Search by name, module, or action…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-10 rounded-xl border-border/50 bg-muted/20 pl-9 transition-all placeholder:text-muted-foreground/40 focus:border-primary/40 focus:bg-background focus:ring-2 focus:ring-primary/10"
          />
        </div>
        <div className="flex gap-2">
          <Select value={moduleFilter} onValueChange={setModuleFilter}>
            <SelectTrigger className="h-10 w-full rounded-xl border-border/50 bg-muted/20 sm:w-[180px]">
              <Filter className="mr-2 size-3.5 text-muted-foreground/50" />
              <SelectValue placeholder="Module" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">All modules</SelectItem>
              {MODULES.map((mod) => (
                <SelectItem key={mod} value={mod} className="rounded-lg">
                  <span className="mr-2">{MODULE_ICONS[mod]}</span>
                  {mod.charAt(0).toUpperCase() + mod.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-10 w-full rounded-xl border-border/50 bg-muted/20 sm:w-[180px]">
              <ArrowDownUp className="mr-2 size-3.5 text-muted-foreground/50" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending" className="rounded-lg">
                Pending
              </SelectItem>
              <SelectItem value="approved" className="rounded-lg">
                Approved
              </SelectItem>
              <SelectItem value="rejected" className="rounded-lg">
                Rejected
              </SelectItem>
              <SelectItem value="changes_requested" className="rounded-lg">
                Changes Requested
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Result count ── */}
      {!loading && items.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground/50">
            Showing <span className="font-semibold text-foreground">{filteredItems.length}</span> of{" "}
            <span className="font-semibold text-foreground">{items.length}</span> requests
          </p>
          {pendingCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-600 ring-1 ring-amber-500/20">
              <span className="flex size-1.5 rounded-full bg-amber-500" />
              {pendingCount} pending
            </span>
          )}
        </div>
      )}

      {/* ── Content ── */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <ApprovalCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-card">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-20 -top-20 size-64 rounded-full bg-primary/5 blur-3xl" />
            <div className="absolute -left-20 -bottom-20 size-48 rounded-full bg-emerald-500/5 blur-3xl" />
          </div>
          <div className="relative flex flex-col items-center justify-center py-20">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-emerald-500/10 ring-1 ring-emerald-500/20">
              <Inbox className="size-8 text-emerald-500" />
            </div>
            <h3 className="mt-5 text-lg font-bold tracking-tight">All caught up</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {items.length === 0 ? "No approval requests yet" : "No requests match your filters"}
            </p>
            {items.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="mt-5 rounded-xl"
                onClick={() => {
                  setSearchTerm("");
                  setModuleFilter("all");
                  setStatusFilter("all");
                }}
              >
                Clear filters
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredItems.map((item) => (
            <ApprovalRow
              key={item.id}
              item={item}
              canAct={canAct}
              selectedItemId={selectedItemId}
              showDetailsDialog={showDetailsDialog}
              onSelect={(id) => {
                setSelectedItemId(id);
                setShowDetailsDialog(true);
              }}
              onClose={() => {
                setShowDetailsDialog(false);
                setSelectedItemId(null);
              }}
              onDecide={handleDecide}
            />
          ))}
        </div>
      )}

      {/* ── Details Dialog ── */}
      <Dialog
        open={showDetailsDialog}
        onOpenChange={(o) => {
          setShowDetailsDialog(o);
          if (!o) setSelectedItemId(null);
        }}
      >
        <DialogContent className="top-[5%] translate-y-0 max-h-[90vh] max-w-5xl overflow-hidden rounded-2xl border-0 p-0 shadow-2xl">
          <div className="flex items-center justify-between border-b border-border/40 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10">
                <FileDiff className="size-4.5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold tracking-tight">
                  Approval Details
                </DialogTitle>
                <DialogDescription className="text-xs">Review changes and decide</DialogDescription>
              </div>
            </div>
            {selectedItem && <StatusPill status={selectedItem.status} />}
          </div>
          <div className="overflow-y-auto">
            {selectedItem && (
              <ApprovalDetails
                approval={selectedItem}
                canAct={canAct}
                onDecide={(id, action, reason) => {
                  handleDecide(id, action, reason);
                }}
                onUpdate={handleUpdateRequest}
                onRefresh={loadData}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── Approval Row ──────────────────────────────────────────────────── */

function ApprovalRow({
  item,
  canAct,
  selectedItemId,
  showDetailsDialog,
  onSelect,
  onClose,
  onDecide,
}: {
  item: ApprovalRequest;
  canAct: boolean;
  selectedItemId: string | null;
  showDetailsDialog: boolean;
  onSelect: (id: string) => void;
  onClose: () => void;
  onDecide: (id: string, action: "approve" | "reject" | "request_changes", reason?: string) => void;
}) {
  const isActive = item.status === "pending" || item.status === "changes_requested";
  const requesterInitials = item.requestedByName
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border bg-card transition-all duration-200",
        isActive
          ? "border-amber-500/15 hover:border-amber-500/25 hover:shadow-md hover:shadow-amber-500/[0.03]"
          : "border-border/40 hover:border-border/60 hover:shadow-sm",
      )}
    >
      {/* Active indicator bar */}
      {isActive && (
        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-amber-500 to-amber-500/50" />
      )}

      <div className="flex items-center gap-4 p-4 pl-5 sm:p-5 sm:pl-6">
        {/* Module icon */}
        <div
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-xl text-lg transition-colors",
            isActive ? "bg-amber-500/10" : "bg-muted/40",
          )}
        >
          {MODULE_ICONS[item.module] || "📄"}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-lg bg-primary/8 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-primary">
              {item.module}
            </span>
            <StatusPill status={item.status} />
            <span className="text-[11px] font-medium text-muted-foreground/60 uppercase tracking-wider">
              {item.actionType.replace(/_/g, " ")}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
            <div className="flex items-center gap-2">
              <div className="grid size-6 place-items-center rounded-full bg-muted/50 text-[9px] font-bold text-muted-foreground">
                {requesterInitials}
              </div>
              <span className="text-sm font-medium">{item.requestedByName}</span>
            </div>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground/50">
              <Clock className="size-3" />
              {relative(item.createdAt)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            onClick={() => onSelect(item.id)}
            className="flex items-center gap-1.5 rounded-xl border border-border/40 bg-muted/20 px-3.5 py-2 text-xs font-medium text-muted-foreground transition-all hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
          >
            <Eye className="size-3.5" />
            <span className="hidden sm:inline">View</span>
          </button>

          {canAct && isActive && (
            <div className="hidden items-center gap-1.5 sm:flex">
              <button
                onClick={() => onDecide(item.id, "approve")}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-semibold text-white shadow-sm shadow-emerald-500/20 transition-all hover:bg-emerald-600 hover:shadow-md hover:shadow-emerald-500/25"
              >
                <Check className="size-3.5" />
                Approve
              </button>
              <ReasonDialog
                trigger={
                  <button className="flex items-center gap-1.5 rounded-xl border border-blue-500/30 bg-blue-500/5 px-3.5 py-2 text-xs font-semibold text-blue-600 transition-all hover:bg-blue-500/10 dark:text-blue-400">
                    <MessageCircle className="size-3.5" />
                    <span className="hidden lg:inline">Changes</span>
                  </button>
                }
                title="Request Changes"
                description="Describe what needs to be changed"
                placeholder="Tell the requester what needs to be changed…"
                required
                submitLabel="Request Changes"
                icon={MessageCircle}
                onSubmit={(reason) => onDecide(item.id, "request_changes", reason)}
              />
              <ReasonDialog
                trigger={
                  <button className="flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/5 px-3.5 py-2 text-xs font-semibold text-red-600 transition-all hover:bg-red-500/10 dark:text-red-400">
                    <Ban className="size-3.5" />
                    <span className="hidden lg:inline">Reject</span>
                  </button>
                }
                title="Reject Request"
                description="This action cannot be undone"
                placeholder="Enter a reason for rejection…"
                required
                submitLabel="Reject"
                submitVariant="destructive"
                icon={Ban}
                onSubmit={(reason) => onDecide(item.id, "reject", reason)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════ */
/*  APPROVAL DETAILS (inside dialog)                                     */
/* ═══════════════════════════════════════════════════════════════════════ */

function ApprovalDetails({
  approval,
  canAct,
  onDecide,
  onUpdate,
  onRefresh,
}: {
  approval: ApprovalRequest;
  canAct: boolean;
  onDecide: (id: string, action: "approve" | "reject" | "request_changes", reason?: string) => void;
  onUpdate: (id: string, newValues: Record<string, any>) => void;
  onRefresh: () => Promise<void>;
}) {
  const { session } = useAuth();
  const isRequester = session?.id === approval.requestedBy;
  const canEdit = isRequester && ["rejected", "changes_requested"].includes(approval.status);
  const [editing, setEditing] = useState(false);
  const [newValues, setNewValues] = useState<string>(JSON.stringify(approval.newValues, null, 2));
  const [rejectionReason, setRejectionReason] = useState("");
  const [newComment, setNewComment] = useState("");
  const [addingComment, setAddingComment] = useState(false);

  const getChangedFields = () => {
    if (!approval.previousValues)
      return Object.entries(approval.newValues).map(([key, value]) => ({
        key,
        oldValue: null,
        newValue: value,
      }));
    const allKeys = new Set([
      ...Object.keys(approval.previousValues),
      ...Object.keys(approval.newValues),
    ]);
    return Array.from(allKeys)
      .map((key) => ({
        key,
        oldValue: approval.previousValues?.[key],
        newValue: approval.newValues?.[key],
      }))
      .filter(({ oldValue, newValue }) => JSON.stringify(oldValue) !== JSON.stringify(newValue));
  };

  const changedFields = getChangedFields();

  const handleSaveEdit = () => {
    try {
      const parsed = JSON.parse(newValues);
      onUpdate(approval.id, parsed);
      setEditing(false);
    } catch {
      toast.error("Invalid JSON in new values");
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setAddingComment(true);
    try {
      await apiFetch("/api/approvals", {
        method: "PATCH",
        body: JSON.stringify({
          approvalRequestId: approval.id,
          action: "add_comment",
          comment: newComment,
        }),
      });
      toast.success("Comment added");
      setNewComment("");
      await onRefresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add comment");
    } finally {
      setAddingComment(false);
    }
  };

  return (
    <div className="space-y-0 divide-y divide-border/30">
      {/* ── Request Info ── */}
      <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Module", value: approval.module, icon: MODULE_ICONS[approval.module] },
          { label: "Action", value: approval.actionType.replace(/_/g, " "), icon: "⚡" },
          { label: "Requested by", value: approval.requestedByName, icon: "👤" },
          {
            label: "Requested at",
            value: new Date(approval.createdAt).toLocaleString(),
            icon: "📅",
          },
        ].map((field) => (
          <div key={field.label} className="rounded-xl border border-border/40 bg-muted/10 p-3.5">
            <div className="flex items-center gap-1.5">
              <span className="text-xs">{field.icon}</span>
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/50">
                {field.label}
              </span>
            </div>
            <div className="mt-2 truncate text-sm font-semibold">{field.value}</div>
          </div>
        ))}
      </div>

      {/* ── Resolution info ── */}
      {(approval.status === "approved" ||
        approval.status === "rejected" ||
        approval.status === "changes_requested") && (
        <div className="p-6">
          <div className="rounded-xl border border-border/40 bg-muted/10 p-4">
            <div className="flex items-center gap-2 mb-3">
              {approval.status === "approved" && (
                <ShieldCheck className="size-4 text-emerald-500" />
              )}
              {approval.status === "changes_requested" && (
                <MessageCircle className="size-4 text-blue-500" />
              )}
              {approval.status === "rejected" && <Ban className="size-4 text-red-500" />}
              <span className="text-sm font-bold">
                {approval.status === "approved"
                  ? "Approved"
                  : approval.status === "changes_requested"
                    ? "Changes Requested"
                    : "Rejected"}
              </span>
            </div>
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <span className="text-xs text-muted-foreground/60">
                  {approval.status === "approved"
                    ? "Approved by"
                    : approval.status === "changes_requested"
                      ? "Requested by"
                      : "Rejected by"}
                </span>
                <div className="mt-0.5 font-semibold">
                  {approval.status === "approved"
                    ? approval.approvedByName
                    : approval.rejectedByName}
                </div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground/60">Processed at</span>
                <div className="mt-0.5 font-semibold tabular-nums">
                  {new Date(
                    (approval.status === "approved"
                      ? approval.approvedAt
                      : approval.rejectedAt) as string,
                  ).toLocaleString()}
                </div>
              </div>
            </div>
            {approval.rejectionReason && (
              <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/5 p-3">
                <span className="text-xs font-semibold text-red-600 dark:text-red-400">Reason</span>
                <p className="mt-1 text-sm text-red-700/80 dark:text-red-400/80">
                  {approval.rejectionReason}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Changes ── */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
              <FileDiff className="size-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-bold">Changes</h3>
              <p className="text-[11px] text-muted-foreground/50">
                {changedFields.length} field{changedFields.length !== 1 ? "s" : ""} modified
              </p>
            </div>
          </div>
          {canEdit && (
            <button
              onClick={() => setEditing(!editing)}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
            >
              {editing ? <X className="size-3.5" /> : <Pencil className="size-3.5" />}
              {editing ? "Cancel" : "Edit"}
            </button>
          )}
        </div>

        {editing ? (
          <div className="space-y-3">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
              Edit New Values (JSON)
            </Label>
            <Textarea
              value={newValues}
              onChange={(e) => setNewValues(e.target.value)}
              rows={10}
              className="rounded-xl border-border/50 font-mono text-xs"
            />
            <Button onClick={handleSaveEdit} className="rounded-xl shadow-lg shadow-primary/10">
              <RotateCcw className="size-4" />
              Save & Re-submit
            </Button>
          </div>
        ) : changedFields.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground/50">
            No changes detected
          </div>
        ) : (
          <div className="space-y-4">
            {changedFields.map(({ key, oldValue, newValue }) => (
              <div key={key} className="overflow-hidden rounded-xl border border-border/40">
                <div className="border-b border-border/30 bg-muted/20 px-4 py-2.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground/70">
                    {humanizeKey(key)}
                  </span>
                </div>
                <div className="grid grid-cols-1 divide-y divide-border/20 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
                  <div className="p-4">
                    <div className="mb-2 flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-red-500/60" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-red-500/70">
                        Previous
                      </span>
                    </div>
                    <div className="rounded-lg border border-red-500/15 bg-red-500/[0.03] p-3">
                      {renderChangeValue(key, oldValue)}
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="mb-2 flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-emerald-500/60" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500/70">
                        New
                      </span>
                    </div>
                    <div className="rounded-lg border border-emerald-500/15 bg-emerald-500/[0.03] p-3">
                      {renderChangeValue(key, newValue)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Comments ── */}
      <div className="p-6">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="flex size-8 items-center justify-center rounded-lg bg-blue-500/10">
            <MessageSquare className="size-4 text-blue-500" />
          </div>
          <div>
            <h3 className="text-sm font-bold">Comments</h3>
            <p className="text-[11px] text-muted-foreground/50">
              {approval.comments?.length ?? 0} comment
              {(approval.comments?.length ?? 0) !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {approval.comments && approval.comments.length > 0 ? (
            approval.comments.map((comment: any) => {
              const initials =
                comment.userName
                  ?.split(" ")
                  .map((p: string) => p[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase() || "??";

              return (
                <div
                  key={comment.id}
                  className="group flex gap-3 rounded-xl border border-border/30 bg-muted/10 p-3.5 transition-colors hover:bg-muted/20"
                >
                  <div className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold">{comment.userName}</span>
                      <span className="text-[10px] text-muted-foreground/40">
                        {relative(comment.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-foreground/80">
                      {comment.text}
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground/40">
              <MessageSquare className="size-6 mb-2" />
              <span className="text-sm">No comments yet</span>
            </div>
          )}

          {/* Add comment */}
          <div className="flex flex-col gap-2.5 rounded-xl border border-border/30 bg-muted/5 p-3.5 sm:flex-row">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment…"
              rows={2}
              className="flex-1 rounded-lg border-border/40 bg-background text-sm"
            />
            <Button
              onClick={handleAddComment}
              disabled={!newComment.trim() || addingComment}
              className="shrink-0 rounded-xl shadow-sm"
            >
              {addingComment ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              <span className="hidden sm:inline ml-1.5">Send</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ── Decision bar ── */}
      {canAct && ["pending", "changes_requested"].includes(approval.status) && (
        <div className="border-t-2 border-border/30 bg-muted/10 p-6">
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                Reason{" "}
                <span className="font-normal text-muted-foreground/40">
                  (required for changes, optional for reject)
                </span>
              </Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Add context for your decision…"
                className="rounded-xl border-border/50 bg-background transition-colors focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                rows={2}
              />
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                onClick={() => onDecide(approval.id, "reject", rejectionReason)}
                className="flex items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/5 px-5 py-2.5 text-sm font-semibold text-red-600 transition-all hover:bg-red-500/10 dark:text-red-400"
              >
                <Ban className="size-4" />
                Reject
              </button>
              <button
                onClick={() => onDecide(approval.id, "request_changes", rejectionReason)}
                disabled={!rejectionReason.trim()}
                className="flex items-center justify-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/5 px-5 py-2.5 text-sm font-semibold text-blue-600 transition-all hover:bg-blue-500/10 disabled:opacity-40 disabled:pointer-events-none dark:text-blue-400"
              >
                <MessageCircle className="size-4" />
                Request Changes
              </button>
              <button
                onClick={() => onDecide(approval.id, "approve")}
                className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-600 hover:shadow-xl hover:shadow-emerald-500/25"
              >
                <ShieldCheck className="size-4" />
                Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
