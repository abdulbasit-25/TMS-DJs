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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
  Minus,
  Plus,
  Inbox,
} from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { can } from "@/lib/roles";
import { relative } from "@/lib/format";

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

const DOC_LABELS: Record<string, string> = {
  rate_confirmation: "Rate Confirmation",
  bol: "BOL",
  pod: "POD",
  carrier_invoice: "Carrier Invoice",
  customer_invoice: "Customer Invoice",
};

/** "customerReference" / "changed_by" -> "Customer Reference" / "Changed By" */
function humanizeKey(key: string) {
  const withSpaces = key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/_/g, " ");
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
}

function isIsoDateString(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(v);
}

/** Raw Mongo-style ObjectIds aren't meaningful to a non-technical reader without a name lookup we don't have here. */
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

/** "Jane Doe" -> "JD", "cindy" -> "CI" — used for the small avatar chips throughout. */
function getInitials(name?: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Deterministic, quiet accent color for an avatar based on the person's name. */
function avatarTint(name?: string | null): string {
  const tints = [
    "bg-primary/10 text-primary",
    "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  ];
  if (!name) return tints[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return tints[hash % tints.length];
}

function Avatar({
  name,
  className = "size-7 text-[11px]",
}: {
  name?: string | null;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold ${avatarTint(
        name,
      )} ${className}`}
    >
      {getInitials(name)}
    </span>
  );
}

/**
 * Renders a changed field's value in plain language instead of dumping raw JSON.
 * Handles the shapes this app actually produces (documents checklists, *History
 * timelines) specifically, and falls back to a readable key/value list for any
 * other object or array so new fields don't regress to raw JSON either.
 */
function renderChangeValue(key: string, value: unknown): ReactNode {
  if (value === null || value === undefined)
    return <span className="text-muted-foreground">(empty)</span>;

  // documents: array of { kind, uploaded, uploadedAt }
  if (key === "documents" && Array.isArray(value)) {
    if (value.length === 0) return <span className="text-muted-foreground">(none)</span>;
    return (
      <ul className="space-y-1.5">
        {value.map((doc: any, i: number) => (
          <li key={i} className="flex items-center justify-between gap-3">
            <span>{DOC_LABELS[doc.kind] || humanizeKey(doc.kind || "Document")}</span>
            <span
              className={
                doc.uploaded
                  ? "inline-flex items-center gap-1 text-success"
                  : "inline-flex items-center gap-1 text-muted-foreground"
              }
            >
              <span
                className={`size-1.5 rounded-full ${doc.uploaded ? "bg-success" : "bg-muted-foreground/40"}`}
              />
              {doc.uploaded
                ? `Uploaded${doc.uploadedAt ? ` · ${formatPrimitive(doc.uploadedAt)}` : ""}`
                : "Not uploaded"}
            </span>
          </li>
        ))}
      </ul>
    );
  }

  // *History arrays: e.g. statusHistory -> { status, changedBy, changedAt }
  if (/history$/i.test(key) && Array.isArray(value)) {
    if (value.length === 0) return <span className="text-muted-foreground">(none)</span>;
    return (
      <ul className="space-y-1.5">
        {value.map((entry: any, i: number) => {
          const when = entry.changedAt || entry.at;
          const label = entry.status ? String(entry.status).replace(/_/g, " ") : humanizeKey(key);
          return (
            <li key={i} className="flex items-center justify-between gap-3">
              <span className="capitalize">{label}</span>
              {when && <span className="text-muted-foreground">{formatPrimitive(when)}</span>}
            </li>
          );
        })}
      </ul>
    );
  }

  // Generic array
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-muted-foreground">(none)</span>;
    if (typeof value[0] === "object" && value[0] !== null) {
      return (
        <ul className="space-y-2">
          {value.map((entry: any, i: number) => (
            <li key={i} className="rounded-lg border border-border/60 bg-background/60 p-2.5">
              {Object.entries(entry)
                .filter(([k, v]) => !(/by$/i.test(k) && looksLikeId(v)))
                .map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3 text-xs">
                    <span className="text-muted-foreground">{humanizeKey(k)}</span>
                    <span>{formatPrimitive(v)}</span>
                  </div>
                ))}
            </li>
          ))}
        </ul>
      );
    }
    return <span>{value.map((v) => formatPrimitive(v)).join(", ")}</span>;
  }

  // Generic object
  if (typeof value === "object") {
    return (
      <div className="space-y-1.5">
        {Object.entries(value as Record<string, unknown>)
          .filter(([k, v]) => !(/by$/i.test(k) && looksLikeId(v)))
          .map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3 text-xs">
              <span className="text-muted-foreground">{humanizeKey(k)}</span>
              <span>{formatPrimitive(v)}</span>
            </div>
          ))}
      </div>
    );
  }

  // Primitive (string / number / boolean / ISO date)
  return <span>{formatPrimitive(value)}</span>;
}

const STATUS_META: Record<
  ApprovalRequest["status"],
  { label: string; dot: string; text: string; ring: string }
> = {
  pending: {
    label: "Pending",
    dot: "bg-warning",
    text: "text-warning",
    ring: "ring-warning/20",
  },
  approved: {
    label: "Approved",
    dot: "bg-success",
    text: "text-success",
    ring: "ring-success/20",
  },
  changes_requested: {
    label: "Changes Requested",
    dot: "bg-warning",
    text: "text-warning",
    ring: "ring-warning/20",
  },
  rejected: {
    label: "Rejected",
    dot: "bg-destructive",
    text: "text-destructive",
    ring: "ring-destructive/20",
  },
};

const STATUS_ACCENT: Record<ApprovalRequest["status"], string> = {
  pending: "before:bg-warning",
  approved: "before:bg-success",
  changes_requested: "before:bg-warning",
  rejected: "before:bg-destructive",
};

function StatusPill({ status }: { status: ApprovalRequest["status"] }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${meta.ring}`}
    >
      <span className={`size-1.5 rounded-full ${meta.dot}`} />
      <span className={meta.text}>{meta.label}</span>
    </span>
  );
}

function ApprovalCardSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="absolute inset-y-0 left-0 w-1 bg-muted" />
      <div className="flex items-start justify-between gap-4 pl-2">
        <div className="flex-1 space-y-2.5">
          <div className="flex gap-2">
            <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
            <div className="h-5 w-24 animate-pulse rounded-full bg-muted" />
          </div>
          <div className="h-3 w-48 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-8 w-24 animate-pulse rounded-md bg-muted" />
      </div>
    </div>
  );
}

/** Shared reason-collecting dialog for Reject / Request Changes — same shape, different copy and requiredness. */
function ReasonDialog({
  trigger,
  title,
  placeholder,
  required,
  submitLabel,
  submitVariant = "outline",
  onSubmit,
}: {
  trigger: ReactNode;
  title: string;
  placeholder: string;
  required?: boolean;
  submitLabel: string;
  submitVariant?: "outline" | "destructive";
  onSubmit: (reason: string) => void;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            onSubmit((formData.get("reason") as string) || "");
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label>{required ? "Reason (required)" : "Reason (optional)"}</Label>
            <Textarea name="reason" placeholder={placeholder} required={required} />
          </div>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
            <DialogTrigger asChild>
              <Button type="button" variant="outline" className="w-full sm:w-auto">
                Cancel
              </Button>
            </DialogTrigger>
            <Button type="submit" variant={submitVariant} className="w-full sm:w-auto">
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ApprovalsPage() {
  const { session } = useAuth();
  const role = session?.role ?? "agent";
  const canAct = can(role, "approval_actions");
  const [items, setItems] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  // Store just the id, not a frozen snapshot — the dialog's data then stays
  // live as `items` refreshes (e.g. after posting a comment) instead of
  // going stale until the next full remount.
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
  }, []);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto refresh on focus, route change, or every 30 seconds
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

  const pendingCount = items.filter(
    (i) => i.status === "pending" || i.status === "changes_requested",
  ).length;

  return (
    <div className="space-y-6 print:hidden">
      <PageHeader
        title="Approvals"
        description="Unified queue for everything awaiting your decision"
        actions={
          <div className="flex items-center gap-3">
            {pendingCount > 0 && (
              <span className="hidden items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary sm:inline-flex">
                <span className="size-1.5 rounded-full bg-primary" />
                {pendingCount} awaiting decision
              </span>
            )}
            <Button variant="outline" onClick={loadData} disabled={isRefreshing} size="sm">
              {isRefreshing ? <Loader2 className="size-4 animate-spin" /> : null}
              Refresh
            </Button>
          </div>
        }
      />

      {/* Filters */}
      <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card/50 p-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by requester, module, or action…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={moduleFilter} onValueChange={setModuleFilter}>
          <SelectTrigger className="w-full sm:w-[190px]">
            <SelectValue placeholder="Module" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All modules</SelectItem>
            {MODULES.map((mod) => (
              <SelectItem key={mod} value={mod}>
                {mod.charAt(0).toUpperCase() + mod.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="changes_requested">Changes Requested</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!loading && items.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Showing <span className="font-medium text-foreground">{filteredItems.length}</span> of{" "}
          {items.length} {items.length === 1 ? "request" : "requests"}
        </p>
      )}

      {loading ? (
        <div className="grid gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <ApprovalCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <EmptyState
          icon={<Inbox className="size-6" />}
          title="All caught up"
          description="No pending approvals in this queue"
        />
      ) : (
        <div className="grid gap-3">
          {filteredItems.map((item) => (
            <Card
              key={item.id}
              className={`group relative overflow-hidden border-border/70 transition-all duration-150 before:absolute before:inset-y-0 before:left-0 before:w-1 before:content-[''] hover:border-border hover:shadow-md ${STATUS_ACCENT[item.status]}`}
            >
              <CardHeader className="pb-3 pl-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 flex-1 gap-3">
                    <Avatar name={item.requestedByName} className="mt-0.5 size-9 text-xs" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                          {item.module.charAt(0).toUpperCase() + item.module.slice(1)}
                        </span>
                        <StatusPill status={item.status} />
                      </div>
                      <div className="mt-1.5 text-sm">
                        <span className="font-medium text-foreground">{item.requestedByName}</span>
                        <span className="text-muted-foreground">
                          {" "}
                          requested to {item.actionType.toLowerCase()}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="size-3" />
                        {relative(item.createdAt)}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pl-12 sm:pl-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedItemId(item.id);
                        setShowDetailsDialog(true);
                      }}
                    >
                      View details
                    </Button>

                    {canAct && ["pending", "changes_requested"].includes(item.status) && (
                      <>
                        <Button
                          size="sm"
                          className="bg-success text-success-foreground shadow-sm hover:bg-success/90"
                          onClick={() => handleDecide(item.id, "approve")}
                        >
                          <Check className="size-4" />
                          <span className="hidden sm:inline">Approve</span>
                        </Button>
                        <ReasonDialog
                          trigger={
                            <Button size="sm" variant="outline">
                              <MessageSquare className="size-4" />
                              <span className="hidden sm:inline">Request Changes</span>
                            </Button>
                          }
                          title="Request Changes"
                          placeholder="Tell the requester what needs to be changed"
                          required
                          submitLabel="Request Changes"
                          onSubmit={(reason) => handleDecide(item.id, "request_changes", reason)}
                        />
                        <ReasonDialog
                          trigger={
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            >
                              <X className="size-4" />
                              <span className="hidden sm:inline">Reject</span>
                            </Button>
                          }
                          title="Reject Request"
                          placeholder="Enter a reason for rejection"
                          submitLabel="Reject"
                          submitVariant="destructive"
                          onSubmit={(reason) => handleDecide(item.id, "reject", reason)}
                        />
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      <Sheet
        open={showDetailsDialog}
        onOpenChange={(open) => {
          setShowDetailsDialog(open);
          if (!open) setSelectedItemId(null);
        }}
      >
        <SheetContent className="flex w-full flex-col overflow-hidden p-0 sm:max-w-4xl">
          <SheetHeader className="sticky top-0 z-10 border-b border-border bg-background/95 px-6 py-4 text-left shadow-sm backdrop-blur">
            <SheetTitle className="flex items-center gap-2">
              <FileDiff className="size-4.5 text-primary" />
              Approval Request Details
            </SheetTitle>
            <p className="text-sm text-muted-foreground">
              Review the changes before making a decision
            </p>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {selectedItem && (
              <ApprovalDetails
                approval={selectedItem}
                canAct={canAct}
                onDecide={handleDecide}
                onUpdate={handleUpdateRequest}
                onRefresh={loadData}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

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
    } catch (err) {
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
      // Re-fetch so this comment (and `approval`, which is now derived from
      // the live items list in the parent) reflects immediately instead of
      // waiting for the 30s auto-refresh or a tab-focus event.
      await onRefresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add comment");
    } finally {
      setAddingComment(false);
    }
  };

  const decisionMeta =
    approval.status === "approved"
      ? { label: "Approved by", by: approval.approvedByName, at: approval.approvedAt }
      : approval.status === "changes_requested"
        ? { label: "Requested by", by: approval.rejectedByName, at: approval.rejectedAt }
        : { label: "Rejected by", by: approval.rejectedByName, at: approval.rejectedAt };

  return (
    <div className="space-y-6">
      {/* Meta strip */}
      <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 p-4">
          <div className="flex items-center gap-3">
            <Avatar name={approval.requestedByName} className="size-10 text-sm" />
            <div>
              <div className="text-sm font-medium text-foreground">{approval.requestedByName}</div>
              <div className="text-xs text-muted-foreground">requested this change</div>
            </div>
          </div>
          <div className="hidden h-8 w-px bg-border sm:block" />
          <div className="space-y-0.5">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Module</div>
            <div className="text-sm font-medium capitalize text-foreground">{approval.module}</div>
          </div>
          <div className="space-y-0.5">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Action</div>
            <div className="text-sm font-medium capitalize text-foreground">
              {approval.actionType}
            </div>
          </div>
          <div className="space-y-0.5">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Requested</div>
            <div className="text-sm font-medium text-foreground">
              {new Date(approval.createdAt).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </div>
          </div>
          <div className="ml-auto">
            <StatusPill status={approval.status} />
          </div>
        </div>

        {(approval.status === "approved" ||
          approval.status === "rejected" ||
          approval.status === "changes_requested") && (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-border/70 bg-muted/30 px-4 py-3 text-sm">
            <div>
              <span className="text-muted-foreground">{decisionMeta.label}:</span>{" "}
              <span className="font-medium text-foreground">{decisionMeta.by}</span>
            </div>
            {decisionMeta.at && (
              <div>
                <span className="text-muted-foreground">At:</span>{" "}
                <span className="font-medium text-foreground">
                  {new Date(decisionMeta.at).toLocaleString()}
                </span>
              </div>
            )}
            {approval.rejectionReason && (
              <div className="basis-full text-sm">
                <span className="text-muted-foreground">Reason:</span>{" "}
                <span className="font-medium text-foreground">{approval.rejectionReason}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Changes */}
      <Card className="border-border/70">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <FileDiff className="size-4 text-primary" />
            Changes
            <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
              {changedFields.length}
            </span>
            {canEdit && (
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto"
                onClick={() => setEditing(!editing)}
              >
                {editing ? "Cancel" : "Edit"}
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {editing ? (
            <div className="space-y-3">
              <Label>Edit New Values (JSON)</Label>
              <Textarea
                value={newValues}
                onChange={(e) => setNewValues(e.target.value)}
                rows={10}
                className="font-mono text-xs"
              />
              <Button onClick={handleSaveEdit} className="w-full sm:w-auto">
                Save Changes & Re-submit
              </Button>
            </div>
          ) : changedFields.length === 0 ? (
            <div className="text-sm text-muted-foreground">No changes detected</div>
          ) : (
            <div className="divide-y divide-border/60">
              {changedFields.map(({ key, oldValue, newValue }) => (
                <div key={key} className="space-y-1.5 py-3 first:pt-0 last:pb-0">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {humanizeKey(key)}
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="flex items-center gap-1 text-xs font-normal text-muted-foreground">
                        <Minus className="size-3" /> Previous
                      </Label>
                      <div className="rounded-lg border border-destructive/25 bg-destructive/5 p-2.5 text-sm text-foreground">
                        {renderChangeValue(key, oldValue)}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="flex items-center gap-1 text-xs font-normal text-muted-foreground">
                        <Plus className="size-3" /> New
                      </Label>
                      <div className="rounded-lg border border-success/25 bg-success/5 p-2.5 text-sm text-foreground">
                        {renderChangeValue(key, newValue)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comments */}
      <Card className="border-border/70">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <MessageSquare className="size-4 text-primary" />
            Comments
            {approval.comments?.length > 0 && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
                {approval.comments.length}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {approval.comments && approval.comments.length > 0 ? (
            <div className="space-y-3">
              {approval.comments.map((comment: any) => (
                <div key={comment.id} className="flex gap-3">
                  <Avatar name={comment.userName} className="mt-0.5 size-7 text-[11px]" />
                  <div className="min-w-0 flex-1 rounded-lg border border-border/60 bg-muted/30 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-foreground">
                        {comment.userName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {relative(comment.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-foreground/90">{comment.text}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No comments yet</div>
          )}

          {/* Add Comment */}
          <div className="border-t border-border/70 pt-3">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment…"
                rows={2}
                className="flex-1"
              />
              <Button
                onClick={handleAddComment}
                disabled={!newComment.trim() || addingComment}
                className="sm:self-end"
              >
                {addingComment ? <Loader2 className="size-4 animate-spin" /> : "Add"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Decide buttons */}
      {canAct && ["pending", "changes_requested"].includes(approval.status) && (
        <div className="space-y-3 rounded-xl border border-border/70 bg-muted/20 p-4">
          <div className="space-y-1.5">
            <Label htmlFor="rejectionReason">
              Reason (required for Request Changes, optional otherwise)
            </Label>
            <Textarea
              id="rejectionReason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter a reason if requesting changes or rejecting"
              className="bg-background"
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => onDecide(approval.id, "reject", rejectionReason)}
            >
              <X className="size-4" /> Reject
            </Button>
            <Button
              variant="outline"
              onClick={() => onDecide(approval.id, "request_changes", rejectionReason)}
              disabled={!rejectionReason.trim()}
            >
              <MessageSquare className="size-4" /> Request Changes
            </Button>
            <Button
              className="bg-success text-success-foreground shadow-sm hover:bg-success/90"
              onClick={() => onDecide(approval.id, "approve")}
            >
              <Check className="size-4" /> Approve
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
