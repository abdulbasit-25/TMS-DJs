import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usd, fmtDate } from "@/lib/format";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import {
  Calendar,
  Clock,
  DollarSign,
  Download,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  TrendingDown,
  TrendingUp,
  User,
  Wallet,
  CheckCircle2,
  AlertTriangle,
  Package,
  X,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/commissions")({
  component: CommissionsPage,
});

// ─── Types ───────────────────────────────────────────────────────────────────

type CommissionStatus = "pending" | "processing" | "paid";

type CommissionItem = {
  id: string;
  loadId: string;
  loadRef: string;
  agentId: string;
  agentName: string;
  grossMarginAmount: number;
  commissionTier: string;
  commissionPercent: number;
  commissionAmount: number;
  payoutStatus: CommissionStatus;
  payoutDate?: string;
  month: number;
  year: number;
  createdAt: string;
  updatedAt: string;
};

type LoadOption = {
  id: string;
  ref: string;
};

type AgentOption = {
  id: string;
  name: string;
  email?: string;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_OPTIONS: Array<{
  label: string;
  value: CommissionStatus | "all";
  icon: typeof Clock;
}> = [
  { label: "All", value: "all", icon: Package },
  { label: "Pending", value: "pending", icon: Clock },
  { label: "Processing", value: "processing", icon: RefreshCcw },
  { label: "Paid", value: "paid", icon: CheckCircle2 },
];

const COMMISSION_TIERS = [
  { label: "Standard", percent: "10" },
  { label: "Senior", percent: "12" },
  { label: "Top Performer", percent: "15" },
  { label: "Custom", percent: "" },
] as const;

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DATE_PERIOD_OPTIONS = [
  { value: "all", label: "All Time" },
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
  { value: "this_quarter", label: "This Quarter" },
  { value: "this_year", label: "This Year" },
] as const;

// ─── Shared Primitives ───────────────────────────────────────────────────────

function marginTone(margin: number) {
  if (margin > 0)
    return {
      color: "text-emerald-600",
      bg: "bg-emerald-500/10",
      label: "Profit",
      Icon: TrendingUp,
    };
  if (margin < 0)
    return {
      color: "text-red-500",
      bg: "bg-red-500/10",
      label: "Loss",
      Icon: TrendingDown,
    };
  return {
    color: "text-muted-foreground",
    bg: "bg-muted",
    label: "Break-even",
    Icon: TrendingUp,
  };
}

function MarginChip({ margin }: { margin: number }) {
  const tone = marginTone(margin);
  const Icon = tone.Icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${tone.bg} ${tone.color}`}
    >
      <Icon className="size-3" /> {tone.label}
    </span>
  );
}

function DetailSection({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-card p-4">
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}

function DetailGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2">{children}</div>;
}

function DetailRow({
  label,
  value,
  mono,
  span2,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
  span2?: boolean;
}) {
  return (
    <div className={span2 ? "sm:col-span-2" : undefined}>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className={`mt-0.5 ${mono ? "font-mono text-xs" : "text-sm"}`}>{value ?? "—"}</div>
    </div>
  );
}

// ─── Commission Preview Calculator ───────────────────────────────────────────

function CommissionPreview({ margin, percent }: { margin: number; percent: number }) {
  const amount = margin * (percent / 100);
  return (
    <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
        <Sparkles className="size-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Commission Preview
        </div>
        <div className="flex items-center gap-1.5 text-sm">
          <span className="font-mono">{usd(margin)}</span>
          <span className="text-muted-foreground">×</span>
          <span className="font-mono">{percent}%</span>
          <ArrowRight className="size-3 text-muted-foreground" />
          <span className="font-bold font-mono text-primary">{usd(amount)}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

function CommissionsPage() {
  const { session } = useAuth();
  const role = session?.role ?? "agent";
  const canUpdate = role === "admin" || role === "accounting";

  // Data
  const [items, setItems] = useState<CommissionItem[]>([]);
  const [loadOptions, setLoadOptions] = useState<LoadOption[]>([]);
  const [agentOptions, setAgentOptions] = useState<AgentOption[]>([]);

  // Filters
  const [status, setStatus] = useState<CommissionStatus | "all">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [datePeriod, setDatePeriod] = useState<string>("all");

  // UI
  const [loading, setLoading] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);

  // Forms
  const emptyForm = {
    loadId: "",
    agentId: session?.id ?? "",
    grossMarginAmount: "",
    commissionTier: "Standard",
    commissionPercent: "10",
    payoutStatus: "pending" as CommissionStatus,
    payoutDate: "",
    month: String(new Date().getMonth() + 1),
    year: String(new Date().getFullYear()),
  };

  const [form, setForm] = useState({ ...emptyForm });
  const [editForm, setEditForm] = useState({ ...emptyForm });

  // ─── Computed ──────────────────────────────────────────────────────────

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: items.length };
    for (const item of items) {
      counts[item.payoutStatus] = (counts[item.payoutStatus] || 0) + 1;
    }
    return counts;
  }, [items]);

  const filtered = useMemo(() => {
    const now = new Date();
    return items.filter((item) => {
      // Status
      if (status !== "all" && item.payoutStatus !== status) return false;

      // Search
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const match =
          item.agentName.toLowerCase().includes(q) ||
          item.loadRef.toLowerCase().includes(q) ||
          item.id.toLowerCase().includes(q) ||
          item.commissionTier.toLowerCase().includes(q);
        if (!match) return false;
      }

      // Date period
      if (datePeriod !== "all") {
        const itemDate = new Date(item.year, item.month - 1, 1);
        switch (datePeriod) {
          case "this_month":
            if (
              itemDate.getMonth() !== now.getMonth() ||
              itemDate.getFullYear() !== now.getFullYear()
            )
              return false;
            break;
          case "last_month": {
            const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            if (
              itemDate.getMonth() !== lm.getMonth() ||
              itemDate.getFullYear() !== lm.getFullYear()
            )
              return false;
            break;
          }
          case "this_quarter": {
            const qStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
            if (itemDate < qStart) return false;
            break;
          }
          case "this_year":
            if (itemDate.getFullYear() !== now.getFullYear()) return false;
            break;
        }
      }

      return true;
    });
  }, [items, status, searchTerm, datePeriod]);

  const open = items.find((i) => i.id === openId) ?? null;

  const totals = useMemo(
    () => ({
      pending: items
        .filter((c) => c.payoutStatus === "pending")
        .reduce((s, c) => s + c.commissionAmount, 0),
      pendingCount: items.filter((c) => c.payoutStatus === "pending").length,
      processing: items
        .filter((c) => c.payoutStatus === "processing")
        .reduce((s, c) => s + c.commissionAmount, 0),
      processingCount: items.filter((c) => c.payoutStatus === "processing").length,
      paid: items
        .filter((c) => c.payoutStatus === "paid")
        .reduce((s, c) => s + c.commissionAmount, 0),
      paidCount: items.filter((c) => c.payoutStatus === "paid").length,
      accrued: items
        .filter((c) => c.payoutStatus !== "paid")
        .reduce((s, c) => s + c.commissionAmount, 0),
      totalCommission: items.reduce((s, c) => s + c.commissionAmount, 0),
    }),
    [items],
  );

  // Derive unique agents from commission data
  const derivedAgents = useMemo(() => {
    const map = new Map<string, AgentOption>();
    for (const item of items) {
      if (!map.has(item.agentId)) {
        map.set(item.agentId, {
          id: item.agentId,
          name: item.agentName,
        });
      }
    }
    return Array.from(map.values());
  }, [items]);

  const allAgents = useMemo(() => {
    if (agentOptions.length > 0) return agentOptions;
    return derivedAgents;
  }, [agentOptions, derivedAgents]);

  // ─── Data Loading ──────────────────────────────────────────────────────

  const loadCommissions = async () => {
    setLoading(true);
    try {
      const payload = await apiFetch<{ commissions: CommissionItem[] }>("/api/commissions");
      setItems(payload.data.commissions);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load commissions");
    } finally {
      setLoading(false);
    }
  };

  const loadReferenceData = async () => {
    try {
      const [loadsRes] = await Promise.all([
        apiFetch<{ loads: LoadOption[] }>("/api/loads"),
        // Try loading agents/users — fail gracefully
        apiFetch<{ users?: any[]; agents?: AgentOption[] }>("/api/users").catch(() => null),
      ]);
      setLoadOptions(loadsRes.data.loads);

      // Extract agents from users if available
      const usersRes = await apiFetch<{ users?: any[]; agents?: AgentOption[] }>(
        "/api/users",
      ).catch(() => null);
      if (usersRes?.data?.users) {
        setAgentOptions(
          usersRes.data.users.map((u: any) => ({
            id: u._id || u.id,
            name: u.name || u.fullName || u.email || "Unknown",
            email: u.email,
          })),
        );
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load reference data");
    }
  };

  useEffect(() => {
    loadReferenceData();
  }, []);

  useEffect(() => {
    loadCommissions();
  }, []);

  useEffect(() => {
    if (!open) {
      setEditing(false);
      setDeleteTarget(null);
      return;
    }
    setEditForm({
      loadId: open.loadId,
      agentId: open.agentId,
      grossMarginAmount: String(open.grossMarginAmount),
      commissionTier: open.commissionTier,
      commissionPercent: String(open.commissionPercent),
      payoutStatus: open.payoutStatus,
      payoutDate: open.payoutDate ? open.payoutDate.slice(0, 10) : "",
      month: String(open.month),
      year: String(open.year),
    });
  }, [open]);

  // ─── Handlers ──────────────────────────────────────────────────────────

  function handleTierChange(tierLabel: string, formType: "create" | "edit") {
    const tier = COMMISSION_TIERS.find((t) => t.label === tierLabel);
    const setter = formType === "create" ? setForm : setEditForm;
    setter((prev) => ({
      ...prev,
      commissionTier: tierLabel,
      commissionPercent: tier?.percent || prev.commissionPercent,
    }));
  }

  async function createCommission(event: React.FormEvent) {
    event.preventDefault();
    if (!form.loadId) {
      toast.error("Please select a load");
      return;
    }
    if (!form.agentId) {
      toast.error("Please select an agent");
      return;
    }
    if (!form.grossMarginAmount || Number(form.grossMarginAmount) === 0) {
      toast.error("Please enter a gross margin amount");
      return;
    }
    setCreating(true);
    try {
      const payload = await apiFetch<{ commission: CommissionItem }>("/api/commissions", {
        method: "POST",
        body: JSON.stringify({
          loadId: form.loadId,
          agentId: form.agentId,
          grossMarginAmount: Number(form.grossMarginAmount),
          commissionTier: form.commissionTier,
          commissionPercent: Number(form.commissionPercent),
          payoutStatus: form.payoutStatus,
          payoutDate: form.payoutDate || undefined,
          month: Number(form.month),
          year: Number(form.year),
        }),
      });
      setItems((prev) => [payload.data.commission, ...prev]);
      setForm({ ...emptyForm, agentId: session?.id ?? "" });
      setShowCreate(false);
      toast.success("Commission created successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to create commission");
    } finally {
      setCreating(false);
    }
  }

  async function saveCommission(event: React.FormEvent) {
    event.preventDefault();
    if (!open) return;
    setSaving(true);
    try {
      const payload = await apiFetch<{ commission: CommissionItem }>("/api/commissions", {
        method: "PATCH",
        body: JSON.stringify({
          commissionId: open.id,
          loadId: editForm.loadId,
          agentId: editForm.agentId,
          grossMarginAmount: Number(editForm.grossMarginAmount),
          commissionTier: editForm.commissionTier,
          commissionPercent: Number(editForm.commissionPercent),
          payoutStatus: editForm.payoutStatus,
          payoutDate: editForm.payoutDate || undefined,
          month: Number(editForm.month),
          year: Number(editForm.year),
        }),
      });
      setItems((prev) =>
        prev.map((item) => (item.id === open.id ? payload.data.commission : item)),
      );
      setOpenId(payload.data.commission.id);
      setEditing(false);
      toast.success("Commission saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save commission");
    } finally {
      setSaving(false);
    }
  }

  async function deleteCommission() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiFetch("/api/commissions", {
        method: "DELETE",
        body: JSON.stringify({ commissionId: deleteTarget }),
      });
      setItems((prev) => prev.filter((item) => item.id !== deleteTarget));
      setOpenId((prev) => (prev === deleteTarget ? null : prev));
      setDeleteTarget(null);
      toast.success("Commission deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete commission");
    } finally {
      setDeleting(false);
    }
  }

  async function quickStatusUpdate(commissionId: string, newStatus: CommissionStatus) {
    setStatusUpdating(commissionId);
    try {
      const payload = await apiFetch<{ commission: CommissionItem }>("/api/commissions", {
        method: "PATCH",
        body: JSON.stringify({
          commissionId,
          payoutStatus: newStatus,
          payoutDate: newStatus === "paid" ? new Date().toISOString().slice(0, 10) : undefined,
        }),
      });
      setItems((prev) =>
        prev.map((item) => (item.id === commissionId ? payload.data.commission : item)),
      );
      toast.success(
        `Marked as ${newStatus}${newStatus === "paid" ? " — payout date set to today" : ""}`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update status");
    } finally {
      setStatusUpdating(null);
    }
  }

  function exportCommissions(format: "csv" | "xlsx") {
    const rows = filtered;
    if (rows.length === 0) {
      toast.error("No commissions to export");
      return;
    }
    const data = rows.map((item) => ({
      ID: item.id,
      Load: item.loadRef,
      Agent: item.agentName,
      "Gross Margin": item.grossMarginAmount,
      Tier: item.commissionTier,
      "Rate (%)": item.commissionPercent,
      "Commission Amount": item.commissionAmount,
      Status: item.payoutStatus,
      "Payout Date": item.payoutDate ? fmtDate(item.payoutDate) : "",
      Period: `${MONTH_NAMES[item.month - 1] ?? item.month} ${item.year}`,
      Created: fmtDate(item.createdAt),
      Updated: fmtDate(item.updatedAt),
    }));

    if (format === "csv") {
      const header = Object.keys(data[0]);
      const csvContent = [
        header.join(","),
        ...data.map((row) =>
          header
            .map((f) => `"${String(row[f as keyof typeof row]).replace(/"/g, '""')}"`)
            .join(","),
        ),
      ].join("\n");
      const blob = new Blob([csvContent], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `commissions-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      import("xlsx").then((XLSX) => {
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Commissions");
        XLSX.writeFile(wb, `commissions-${new Date().toISOString().slice(0, 10)}.xlsx`);
      });
    }
    toast.success(`Exported ${rows.length} commissions`);
  }

  // ─── Render: KPI Cards ─────────────────────────────────────────────────

  const renderKpiCards = () => (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <div className="rounded-xl border border-border/50 bg-gradient-to-br from-card to-amber-500/5 p-4">
        <div className="flex items-center justify-between">
          <div className="flex size-9 items-center justify-center rounded-lg bg-amber-500/10">
            <Clock className="size-4 text-amber-600" />
          </div>
          <Badge
            variant="secondary"
            className="bg-amber-500/10 text-amber-600 text-[10px] font-semibold"
          >
            {totals.pendingCount}
          </Badge>
        </div>
        <div className="mt-3 text-xl font-bold tracking-tight tabular-nums">
          {usd(totals.pending)}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">Pending</p>
      </div>

      <div className="rounded-xl border border-border/50 bg-gradient-to-br from-card to-blue-500/5 p-4">
        <div className="flex items-center justify-between">
          <div className="flex size-9 items-center justify-center rounded-lg bg-blue-500/10">
            <RefreshCcw className="size-4 text-blue-600" />
          </div>
          <Badge
            variant="secondary"
            className="bg-blue-500/10 text-blue-600 text-[10px] font-semibold"
          >
            {totals.processingCount}
          </Badge>
        </div>
        <div className="mt-3 text-xl font-bold tracking-tight tabular-nums">
          {usd(totals.processing)}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">Processing</p>
      </div>

      <div className="rounded-xl border border-border/50 bg-gradient-to-br from-card to-emerald-500/5 p-4">
        <div className="flex items-center justify-between">
          <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/10">
            <CheckCircle2 className="size-4 text-emerald-600" />
          </div>
          <Badge
            variant="secondary"
            className="bg-emerald-500/10 text-emerald-600 text-[10px] font-semibold"
          >
            {totals.paidCount}
          </Badge>
        </div>
        <div className="mt-3 text-xl font-bold tracking-tight tabular-nums text-emerald-600">
          {usd(totals.paid)}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">Paid (lifetime)</p>
      </div>

      <div className="rounded-xl border border-border/50 bg-gradient-to-br from-card to-red-500/5 p-4">
        <div className="flex items-center justify-between">
          <div className="flex size-9 items-center justify-center rounded-lg bg-red-500/10">
            <AlertTriangle className="size-4 text-red-600" />
          </div>
          <span className="text-[10px] font-semibold text-muted-foreground">Outstanding</span>
        </div>
        <div className="mt-3 text-xl font-bold tracking-tight tabular-nums text-red-600">
          {usd(totals.accrued)}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">Unpaid accruals</p>
      </div>
    </div>
  );

  // ─── Render: Filters ───────────────────────────────────────────────────

  const renderFilters = () => (
    <div className="space-y-3">
      {/* Status pills */}
      <div className="flex flex-wrap gap-1.5">
        {STATUS_OPTIONS.map((opt) => {
          const count = statusCounts[opt.value] || 0;
          const isActive = status === opt.value;
          const Icon = opt.icon;
          return (
            <button
              key={opt.value}
              onClick={() => setStatus(opt.value)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="size-3" />
              {opt.label}
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${
                  isActive
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search + dropdowns */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by agent, load, or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
        <Select value={datePeriod} onValueChange={setDatePeriod}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <Calendar className="mr-2 size-3.5 text-muted-foreground" />
            <SelectValue placeholder="Period" />
          </SelectTrigger>
          <SelectContent>
            {DATE_PERIOD_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  // ─── Render: Table Actions ─────────────────────────────────────────────

  const RowActions = ({ item }: { item: CommissionItem }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8" onClick={(e) => e.stopPropagation()}>
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            setOpenId(item.id);
          }}
        >
          <Package className="mr-2 size-4" /> View Details
        </DropdownMenuItem>
        {canUpdate && (
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              setOpenId(item.id);
              setTimeout(() => setEditing(true), 0);
            }}
          >
            <Pencil className="mr-2 size-4" /> Edit
          </DropdownMenuItem>
        )}
        {canUpdate && item.payoutStatus === "pending" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                quickStatusUpdate(item.id, "processing");
              }}
              disabled={statusUpdating === item.id}
            >
              {statusUpdating === item.id ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <RefreshCcw className="mr-2 size-4" />
              )}
              Mark Processing
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                quickStatusUpdate(item.id, "paid");
              }}
              disabled={statusUpdating === item.id}
            >
              {statusUpdating === item.id ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 size-4" />
              )}
              Mark Paid
            </DropdownMenuItem>
          </>
        )}
        {canUpdate && item.payoutStatus === "processing" && (
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              quickStatusUpdate(item.id, "paid");
            }}
            disabled={statusUpdating === item.id}
          >
            {statusUpdating === item.id ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 size-4" />
            )}
            Mark Paid
          </DropdownMenuItem>
        )}
        {canUpdate && (
          <>
            <DropdownMenuSeparator />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <DropdownMenuItem
                  className="text-red-600 focus:text-red-600"
                  onSelect={(e) => e.preventDefault()}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Trash2 className="mr-2 size-4" /> Delete
                </DropdownMenuItem>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete commission?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently remove commission{" "}
                    <span className="font-semibold">{item.id}</span> for{" "}
                    <span className="font-semibold">{item.agentName}</span>. This action cannot be
                    undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-red-600 text-white hover:bg-red-700"
                    onClick={() => deleteCommission()}
                  >
                    {deleting ? "Deleting…" : "Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // ─── Render: Form Fields (shared between create & edit) ────────────────

  const renderFormFields = (f: typeof form, setF: typeof setForm, formType: "create" | "edit") => (
    <div className="space-y-5">
      {/* Load & Agent */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Package className="size-3.5" /> Load & Agent
        </div>
        <div className="grid gap-3 rounded-lg border border-border/60 bg-muted/20 p-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Load *</Label>
            <Select value={f.loadId} onValueChange={(v) => setF((p) => ({ ...p, loadId: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select a load" />
              </SelectTrigger>
              <SelectContent>
                {loadOptions.map((load) => (
                  <SelectItem key={load.id} value={load.id}>
                    {load.ref}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Agent *</Label>
            <Select value={f.agentId} onValueChange={(v) => setF((p) => ({ ...p, agentId: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select an agent" />
              </SelectTrigger>
              <SelectContent>
                {allAgents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    <div className="flex items-center gap-2">
                      <User className="size-3 text-muted-foreground" />
                      {agent.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Financials */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <DollarSign className="size-3.5" /> Financials
        </div>
        <div className="grid gap-3 rounded-lg border border-border/60 bg-muted/20 p-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Gross Margin ($) *</Label>
            <Input
              type="number"
              value={f.grossMarginAmount}
              onChange={(e) => setF((p) => ({ ...p, grossMarginAmount: e.target.value }))}
              placeholder="0.00"
              step="0.01"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Commission Tier</Label>
            <Select value={f.commissionTier} onValueChange={(v) => handleTierChange(v, formType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COMMISSION_TIERS.map((t) => (
                  <SelectItem key={t.label} value={t.label}>
                    {t.label}
                    {t.percent ? ` (${t.percent}%)` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Rate (%)</Label>
            <Input
              type="number"
              value={f.commissionPercent}
              onChange={(e) => setF((p) => ({ ...p, commissionPercent: e.target.value }))}
              placeholder="10"
              min="0"
              max="100"
              step="0.1"
            />
          </div>
        </div>

        {/* Live commission preview */}
        {Number(f.grossMarginAmount) !== 0 && Number(f.commissionPercent) > 0 && (
          <CommissionPreview
            margin={Number(f.grossMarginAmount) || 0}
            percent={Number(f.commissionPercent) || 0}
          />
        )}
      </div>

      {/* Payout Details */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Wallet className="size-3.5" /> Payout Details
        </div>
        <div className="grid gap-3 rounded-lg border border-border/60 bg-muted/20 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Payout Status</Label>
            <Select
              value={f.payoutStatus}
              onValueChange={(v) =>
                setF((p) => ({
                  ...p,
                  payoutStatus: v as CommissionStatus,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Payout Date</Label>
            <Input
              type="date"
              value={f.payoutDate}
              onChange={(e) => setF((p) => ({ ...p, payoutDate: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Month</Label>
            <Select value={f.month} onValueChange={(v) => setF((p) => ({ ...p, month: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTH_NAMES.map((name, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Year</Label>
            <Select value={f.year} onValueChange={(v) => setF((p) => ({ ...p, year: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[2024, 2025, 2026].map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );

  // ─── Main Render ───────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      <PageHeader
        title="Commissions"
        description="Track agent commissions, payout status, and accruals"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="mr-1.5 size-3.5" /> Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => exportCommissions("csv")}>
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportCommissions("xlsx")}>
                  Export as Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {canUpdate && (
              <Button size="sm" onClick={() => setShowCreate(true)}>
                <Plus className="mr-1.5 size-4" /> Add Commission
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => void loadCommissions()}
              disabled={loading}
            >
              <RefreshCcw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        }
      />

      {/* KPI Cards */}
      {!loading && renderKpiCards()}

      {/* Filters */}
      {renderFilters()}

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border/60 bg-card p-16">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Loading commissions…</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border/60 bg-card p-16">
          <div className="flex size-14 items-center justify-center rounded-full bg-muted/50">
            <Wallet className="size-6 text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="font-medium">
              {items.length === 0 ? "No commissions yet" : "No matching commissions"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {items.length === 0
                ? "Add your first commission to start tracking payouts"
                : "Try adjusting your search or filters"}
            </p>
          </div>
          {items.length === 0 && canUpdate && (
            <Button size="sm" onClick={() => setShowCreate(true)}>
              <Plus className="mr-1.5 size-4" /> Add Commission
            </Button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
          <DataTable
            rows={filtered}
            onRowClick={(item) => setOpenId(item.id)}
            columns={[
              {
                head: "Load",
                cell: (item) => (
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-medium">{item.loadRef}</span>
                  </div>
                ),
              },
              {
                head: "Agent",
                cell: (item) => (
                  <div>
                    <div className="font-medium">{item.agentName}</div>
                  </div>
                ),
              },
              {
                head: "Period",
                cell: (item) => (
                  <span className="text-sm text-muted-foreground">
                    {MONTH_NAMES[item.month - 1]?.slice(0, 3)} {item.year}
                  </span>
                ),
              },
              {
                head: "Gross Margin",
                cell: (item) => (
                  <span
                    className={`font-mono text-sm font-medium tabular-nums ${marginTone(item.grossMarginAmount).color}`}
                  >
                    {usd(item.grossMarginAmount)}
                  </span>
                ),
              },
              {
                head: "Tier",
                cell: (item) => (
                  <Badge variant="secondary" className="font-normal text-xs">
                    {item.commissionTier}
                  </Badge>
                ),
              },
              {
                head: "Rate",
                cell: (item) => (
                  <span className="font-mono text-xs tabular-nums">{item.commissionPercent}%</span>
                ),
              },
              {
                head: "Commission",
                cell: (item) => (
                  <span className="font-mono text-sm font-semibold tabular-nums">
                    {usd(item.commissionAmount)}
                  </span>
                ),
              },
              {
                head: "Status",
                cell: (item) => <StatusBadge value={item.payoutStatus} />,
              },
              {
                head: "",
                cell: (item) => <RowActions item={item} />,
              },
            ]}
          />
        </div>
      )}

      {/* ── Create Dialog ──────────────────────────────────────────────── */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Commission</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => createCommission(e)}>
            {renderFormFields(form, setForm, "create")}
            <DialogFooter className="pt-4 border-t border-border/60">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreate(false)}
                disabled={creating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={creating}>
                {creating && <Loader2 className="mr-2 size-4 animate-spin" />}
                Create Commission
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Detail Sheet ───────────────────────────────────────────────── */}
      <Sheet open={!!open} onOpenChange={(v) => !v && setOpenId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {open && (
            <>
              <SheetHeader>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <SheetTitle>Commission Details</SheetTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {open.loadRef} · {open.agentName}
                    </p>
                  </div>
                  {canUpdate && !editing && (
                    <div className="flex items-center gap-1.5">
                      <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                        <Pencil className="mr-1.5 size-3.5" /> Edit
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="destructive">
                            <Trash2 className="mr-1.5 size-3.5" /> Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete commission?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently remove commission{" "}
                              <span className="font-semibold">{open.id}</span> for {open.agentName}.
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-red-600 text-white hover:bg-red-700"
                              onClick={() => {
                                setDeleteTarget(open.id);
                                deleteCommission();
                              }}
                              disabled={deleting}
                            >
                              {deleting ? "Deleting…" : "Delete"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </div>

                {/* Quick-glance summary strip */}
                {!editing && (
                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <div className="rounded-md border border-border/60 bg-card/60 px-2.5 py-1.5">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Status
                      </div>
                      <div className="mt-0.5">
                        <StatusBadge value={open.payoutStatus} />
                      </div>
                    </div>
                    <div className="rounded-md border border-border/60 bg-card/60 px-2.5 py-1.5">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Gross Margin
                      </div>
                      <div
                        className={`mt-0.5 flex items-center gap-1 font-mono text-sm font-medium ${marginTone(open.grossMarginAmount).color}`}
                      >
                        {(() => {
                          const MIcon = marginTone(open.grossMarginAmount).Icon;
                          return <MIcon className="size-3" />;
                        })()}
                        {usd(open.grossMarginAmount)}
                      </div>
                    </div>
                    <div className="rounded-md border border-border/60 bg-card/60 px-2.5 py-1.5">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Rate
                      </div>
                      <div className="mt-0.5 font-mono text-sm">{open.commissionPercent}%</div>
                    </div>
                    <div className="rounded-md border border-border/60 bg-card/60 px-2.5 py-1.5">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Commission
                      </div>
                      <div className="mt-0.5 font-mono text-sm font-bold">
                        {usd(open.commissionAmount)}
                      </div>
                    </div>
                  </div>
                )}
              </SheetHeader>

              <div className="space-y-4 px-4 pb-6 pt-4">
                {editing ? (
                  <form onSubmit={saveCommission}>
                    {renderFormFields(editForm, setEditForm, "edit")}
                    <div className="flex items-center gap-2 pt-4 border-t border-border/60">
                      <Button type="submit" disabled={saving}>
                        {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
                        Save Changes
                      </Button>
                      <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  <>
                    <DetailSection icon={<Package className="size-4" />} title="Commission Summary">
                      <DetailGrid>
                        <DetailRow label="Load Reference" value={open.loadRef} mono />
                        <DetailRow label="Agent" value={open.agentName} />
                        <DetailRow label="Tier" value={open.commissionTier} />
                        <DetailRow
                          label="Status"
                          value={<StatusBadge value={open.payoutStatus} />}
                        />
                        <DetailRow
                          label="Period"
                          value={`${MONTH_NAMES[open.month - 1] ?? open.month} ${open.year}`}
                        />
                      </DetailGrid>
                    </DetailSection>

                    <DetailSection icon={<DollarSign className="size-4" />} title="Financials">
                      <DetailGrid>
                        <DetailRow
                          label="Gross Margin"
                          value={
                            <span
                              className={`font-mono font-medium ${marginTone(open.grossMarginAmount).color}`}
                            >
                              {usd(open.grossMarginAmount)}
                            </span>
                          }
                        />
                        <DetailRow
                          label="Commission Rate"
                          value={`${open.commissionPercent}%`}
                          mono
                        />
                        <DetailRow
                          label="Commission Amount"
                          value={
                            <span className="font-mono font-bold">
                              {usd(open.commissionAmount)}
                            </span>
                          }
                        />
                        <DetailRow
                          label="Margin Type"
                          value={<MarginChip margin={open.grossMarginAmount} />}
                        />
                      </DetailGrid>
                    </DetailSection>

                    <DetailSection icon={<Calendar className="size-4" />} title="Payout">
                      <DetailGrid>
                        <DetailRow
                          label="Payout Date"
                          value={open.payoutDate ? fmtDate(open.payoutDate) : "Not set"}
                          mono
                        />
                        <DetailRow
                          label="Period"
                          value={`${MONTH_NAMES[open.month - 1] ?? open.month} ${open.year}`}
                        />
                      </DetailGrid>
                    </DetailSection>

                    <DetailSection icon={<Clock className="size-4" />} title="Timestamps">
                      <DetailGrid>
                        <DetailRow label="Created" value={fmtDate(open.createdAt)} mono />
                        <DetailRow label="Last Updated" value={fmtDate(open.updatedAt)} mono />
                      </DetailGrid>
                    </DetailSection>
                  </>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
