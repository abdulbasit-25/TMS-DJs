import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usd, fmtDate, relative } from "@/lib/format";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api-client";
import { can } from "@/lib/roles";
import {
  Check,
  Download,
  Edit,
  FileText,
  MessageSquare,
  Plus,
  X,
  MapPin,
  Truck,
  DollarSign,
  Building2,
  TrendingUp,
  TrendingDown,
  Lock,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/quotes")({
  component: QuotesPage,
});

type CustomerOption = {
  id: string;
  company: string;
};

type QuoteItem = {
  id: string;
  customerId: string;
  customerName: string;
  origin: string;
  destination: string;
  equipment: string;
  commodity: string;
  weight: number;
  pickupDate: string;
  customerRate: number;
  carrierEstimate: number;
  status: "pending_approval" | "approved" | "rejected" | "changes_requested";
  agentId: string;
  agentName: string;
  notes: string;
  reviewNotes: string;
  comments: Array<{ by: string; at: string; body: string }>;
  createdAt: string;
  pendingApproval?: boolean;
  requestedBy?: string;
  approvalRequestId?: string;
  approvalStatus?: string;
};

type QuoteApiResponse = {
  quotes: QuoteItem[];
  customers: CustomerOption[];
};

const STATUSES: QuoteItem["status"][] = [
  "pending_approval",
  "approved",
  "rejected",
  "changes_requested",
];

/* ------------------------------------------------------------------------ */
/* Shared approval badge — same visual language as leads/customers/loads.   */
/* ------------------------------------------------------------------------ */

function ApprovalStatusBadge({ status }: { status?: string }) {
  if (!status) return null;
  if (status === "rejected") {
    return (
      <span className="inline-flex items-center rounded-full border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
        Rejected
      </span>
    );
  }
  if (status === "changes_requested") {
    return (
      <span className="inline-flex items-center rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
        Changes Requested
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
      Pending Approval
    </span>
  );
}

/* ------------------------------------------------------------------------ */
/* Margin labeling — same pattern as the loads page's gross-margin chip.    */
/* ------------------------------------------------------------------------ */

function marginTone(margin: number) {
  if (margin > 0) {
    return {
      color: "text-emerald-600",
      bg: "bg-emerald-500/10",
      label: "Profit",
      Icon: TrendingUp,
    };
  }
  if (margin < 0) {
    return { color: "text-red-500", bg: "bg-red-500/10", label: "Loss", Icon: TrendingDown };
  }
  return { color: "text-muted-foreground", bg: "bg-muted", label: "Break-even", Icon: TrendingUp };
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

/* ------------------------------------------------------------------------ */
/* Read-only detail primitives — mirrors the leads/customers/loads pages so */
/* every detail sheet in the app feels the same.                            */
/* ------------------------------------------------------------------------ */

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
    <div className="rounded-lg border border-border bg-card p-4">
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
  icon,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
  span2?: boolean;
  icon?: ReactNode;
}) {
  return (
    <div className={span2 ? "sm:col-span-2" : undefined}>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className={`mt-0.5 flex items-start gap-1.5 ${mono ? "font-mono text-xs" : "text-sm"}`}>
        {icon && <span className="mt-0.5 text-muted-foreground">{icon}</span>}
        <span>{value || "—"}</span>
      </div>
    </div>
  );
}

function QuotesPage() {
  const { session } = useAuth();
  const role = session?.role ?? "agent";
  const canApprove = can(role, "approval_actions");
  const canEdit =
    role === "admin" || role === "ops_manager" || role === "team_manager" || role === "agent";
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [status, setStatus] = useState<string>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [form, setForm] = useState({
    customerId: "",
    origin: "",
    destination: "",
    equipmentType: "",
    commodity: "",
    customerRate: "",
    carrierCost: "",
    notes: "",
    status: "pending_approval" as QuoteItem["status"],
  });
  const [editForm, setEditForm] = useState({
    customerId: "",
    origin: "",
    destination: "",
    equipmentType: "",
    commodity: "",
    customerRate: "",
    carrierCost: "",
    notes: "",
    status: "pending_approval" as QuoteItem["status"],
  });
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [addingCustomer, setAddingCustomer] = useState(false);
  const [editingApprovalRequestId, setEditingApprovalRequestId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function loadQuotes() {
      try {
        const payload = await apiFetch<QuoteApiResponse>("/api/quotes");
        if (!active) return;
        setItems(payload.data.quotes);
        setCustomers(payload.data.customers || []);
      } catch (error) {
        console.error(error);
        if (active) {
          setItems([]);
          setCustomers([]);
          toast.error("Unable to load quotes");
        }
      }
    }

    loadQuotes();
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(
    () => items.filter((q) => status === "all" || q.status === status),
    [items, status],
  );
  const open = items.find((i) => i.id === openId) ?? null;

  async function createQuote(event: FormEvent) {
    event.preventDefault();
    if (
      !form.origin.trim() ||
      !form.destination.trim() ||
      !form.equipmentType.trim() ||
      !form.commodity.trim()
    ) {
      toast.error("Origin, destination, equipment, and commodity are required");
      return;
    }

    setCreating(true);
    try {
      const payload = await apiFetch<{ quote: QuoteItem }>("/api/quotes", {
        method: "POST",
        body: JSON.stringify({
          customerId: form.customerId || undefined,
          origin: form.origin.trim(),
          destination: form.destination.trim(),
          equipmentType: form.equipmentType.trim(),
          commodity: form.commodity.trim(),
          customerRate: Number(form.customerRate || 0),
          carrierCost: Number(form.carrierCost || 0),
          notes: form.notes.trim(),
          status: form.status,
        }),
      });

      setItems((prev) => [payload.data.quote, ...prev]);
      setForm({
        customerId: "",
        origin: "",
        destination: "",
        equipmentType: "",
        commodity: "",
        customerRate: "",
        carrierCost: "",
        notes: "",
        status: "pending_approval",
      });
      setShowCreate(false);
      toast.success("Quote created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to create quote");
    } finally {
      setCreating(false);
    }
  }

  async function updateQuote(event: FormEvent) {
    event.preventDefault();
    if (!open || !editForm.origin.trim() || !editForm.destination.trim()) {
      toast.error("Origin and destination are required");
      return;
    }

    setUpdating(true);
    try {
      const payload = await apiFetch<{ quote: QuoteItem }>(`/api/quotes`, {
        method: "PATCH",
        body: JSON.stringify({
          quoteId: open.id,
          approvalRequestId: editingApprovalRequestId,
          customerId: editForm.customerId || undefined,
          origin: editForm.origin.trim(),
          destination: editForm.destination.trim(),
          equipmentType: editForm.equipmentType.trim(),
          commodity: editForm.commodity.trim(),
          customerRate: Number(editForm.customerRate || 0),
          carrierCost: Number(editForm.carrierCost || 0),
          notes: editForm.notes,
          status: editForm.status,
        }),
      });

      setItems((prev) => prev.map((quote) => (quote.id === open.id ? payload.data.quote : quote)));
      setOpenId(payload.data.quote.id);
      setEditing(false);
      setEditingApprovalRequestId(null);
      toast.success("Quote updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update quote");
    } finally {
      setUpdating(false);
    }
  }

  async function createCustomer() {
    if (!newCustomerName.trim()) {
      toast.error("Customer name is required");
      return;
    }
    setAddingCustomer(true);
    try {
      const payload = await apiFetch<{ customer: CustomerOption }>("/api/customers", {
        method: "POST",
        body: JSON.stringify({
          companyName: newCustomerName.trim(),
          contactName: newCustomerName.trim(),
        }),
      });
      setCustomers((prev) => [payload.data.customer, ...prev]);
      setForm((prev) => ({ ...prev, customerId: payload.data.customer.id }));
      setEditForm((prev) => ({ ...prev, customerId: payload.data.customer.id }));
      setNewCustomerName("");
      setShowAddCustomer(false);
      toast.success("Customer created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to create customer");
    } finally {
      setAddingCustomer(false);
    }
  }

  function startEdit() {
    if (!open) return;
    setEditForm({
      customerId: open.customerId,
      origin: open.origin,
      destination: open.destination,
      equipmentType: open.equipment,
      commodity: open.commodity,
      customerRate: String(open.customerRate),
      carrierCost: String(open.carrierEstimate),
      notes: open.notes,
      status: open.status,
    });
    if (open.approvalRequestId) {
      setEditingApprovalRequestId(open.approvalRequestId);
    } else {
      setEditingApprovalRequestId(null);
    }
    setEditing(true);
  }

  function exportQuotes(format: "csv" | "xlsx") {
    const rows = filtered.length > 0 ? filtered : items;
    if (rows.length === 0) {
      toast.error("No quotes to export");
      return;
    }

    const data = rows.map((quote) => ({
      Quote: quote.id,
      Customer: quote.customerName,
      Origin: quote.origin,
      Destination: quote.destination,
      Equipment: quote.equipment,
      Commodity: quote.commodity,
      "Customer rate": usd(quote.customerRate),
      "Carrier estimate": usd(quote.carrierEstimate),
      Status: quote.status.replace(/_/g, " "),
      Agent: quote.agentName,
      Created: fmtDate(quote.createdAt),
    }));

    if (format === "csv") {
      const header = Object.keys(data[0]);
      const csvContent = [
        header.join(","),
        ...data.map((row) =>
          header
            .map((fieldName) => escapeCsv(String(row[fieldName as keyof typeof row])))
            .join(","),
        ),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "quotes.csv";
      link.click();
      URL.revokeObjectURL(url);
    } else {
      import("xlsx").then((XLSX) => {
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Quotes");
        XLSX.writeFile(workbook, "quotes.xlsx");
      });
    }
    toast.success("Quotes exported");
  }

  async function decide(id: string, next: QuoteItem["status"], body?: string) {
    const quote = items.find((item) => item.id === id);
    if (!quote) return;
    try {
      const payload = await apiFetch<{ quote: QuoteItem }>("/api/quotes", {
        method: "PATCH",
        body: JSON.stringify({ quoteId: id, status: next, reviewNotes: body ?? quote.reviewNotes }),
      });
      setItems((prev) => prev.map((item) => (item.id === id ? payload.data.quote : item)));
      setComment("");
      toast.success(`Quote ${next.replace("_", " ")}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update quote");
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Quotes"
        description="Quote requests, approvals, and customer pricing decisions."
        actions={
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="size-4" /> Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => exportQuotes("csv")}>CSV</DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportQuotes("xlsx")}>XLSX</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="sm" onClick={() => setShowCreate((prev) => !prev)}>
              <Plus className="size-4" /> New quote
            </Button>
          </>
        }
      />

      {showCreate && (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">Add a quote</div>
              <div className="text-xs text-muted-foreground">
                This saves the record into the database.
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
          </div>
          <form className="grid gap-3 md:grid-cols-2" onSubmit={createQuote}>
            <div className="space-y-1.5 md:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="quote-customer">Customer</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddCustomer(!showAddCustomer)}
                >
                  {showAddCustomer ? "Select existing" : "Add new"}
                </Button>
              </div>
              {showAddCustomer ? (
                <div className="flex gap-2">
                  <Input
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    placeholder="Enter new customer name"
                  />
                  <Button type="button" onClick={createCustomer} disabled={addingCustomer}>
                    {addingCustomer ? "Adding..." : "Add"}
                  </Button>
                </div>
              ) : (
                <Select
                  value={form.customerId}
                  onValueChange={(val) => setForm((prev) => ({ ...prev, customerId: val }))}
                >
                  <SelectTrigger id="quote-customer">
                    <SelectValue placeholder="Select a customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.company}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="quote-origin">Origin</Label>
              <Input
                id="quote-origin"
                value={form.origin}
                onChange={(e) => setForm((prev) => ({ ...prev, origin: e.target.value }))}
                placeholder="Origin"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="quote-destination">Destination</Label>
              <Input
                id="quote-destination"
                value={form.destination}
                onChange={(e) => setForm((prev) => ({ ...prev, destination: e.target.value }))}
                placeholder="Destination"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="quote-equipment">Equipment</Label>
              <Input
                id="quote-equipment"
                value={form.equipmentType}
                onChange={(e) => setForm((prev) => ({ ...prev, equipmentType: e.target.value }))}
                placeholder="Dry Van"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="quote-commodity">Commodity</Label>
              <Input
                id="quote-commodity"
                value={form.commodity}
                onChange={(e) => setForm((prev) => ({ ...prev, commodity: e.target.value }))}
                placeholder="Commodity"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="quote-customer-rate">Customer rate</Label>
              <Input
                id="quote-customer-rate"
                type="number"
                value={form.customerRate}
                onChange={(e) => setForm((prev) => ({ ...prev, customerRate: e.target.value }))}
                placeholder="2200"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="quote-carrier-cost">Carrier estimate</Label>
              <Input
                id="quote-carrier-cost"
                type="number"
                value={form.carrierCost}
                onChange={(e) => setForm((prev) => ({ ...prev, carrierCost: e.target.value }))}
                placeholder="1700"
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="quote-notes">Notes</Label>
              <Textarea
                id="quote-notes"
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Notes for the team"
                rows={3}
              />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button type="submit" disabled={creating}>
                {creating ? "Saving…" : "Save quote"}
              </Button>
            </div>
          </form>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s.replace("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="ml-auto text-xs text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? "quote" : "quotes"}
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <DataTable
          empty={
            <EmptyState
              icon={<FileText className="size-6" />}
              title="No quotes"
              description="Try creating a quote or adjusting your filters."
            />
          }
          rows={filtered}
          onRowClick={(q) => setOpenId(q.id)}
          columns={[
            {
              head: "Quote",
              cell: (q) => <span className="font-mono text-xs">{q.id.toUpperCase()}</span>,
            },
            {
              head: "Customer",
              cell: (q) => (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{q.customerName || q.customerId}</span>
                  {q.pendingApproval && <ApprovalStatusBadge status={q.approvalStatus} />}
                </div>
              ),
            },
            {
              head: "Lane",
              cell: (q) => (
                <div className="text-sm">
                  {q.origin} <span className="text-muted-foreground">→</span> {q.destination}
                </div>
              ),
            },
            {
              head: "Equipment",
              cell: (q) => <span className="text-xs text-muted-foreground">{q.equipment}</span>,
            },
            {
              head: "Pickup",
              cell: (q) => <span className="text-xs">{fmtDate(q.pickupDate)}</span>,
            },
            {
              head: "Cust rate",
              cell: (q) => <span className="font-mono text-sm">{usd(q.customerRate)}</span>,
            },
            {
              head: "Margin",
              cell: (q) => {
                const margin = q.customerRate - q.carrierEstimate;
                return (
                  <div className="flex items-center gap-1.5">
                    <span className={`font-mono text-sm font-medium ${marginTone(margin).color}`}>
                      {usd(margin)}
                    </span>
                  </div>
                );
              },
            },
            { head: "Status", cell: (q) => <StatusBadge value={q.status} /> },
          ]}
        />
      </div>

      <Sheet open={!!open} onOpenChange={(v) => !v && setOpenId(null)}>
        <SheetContent className="flex w-full flex-col overflow-y-auto p-0 sm:max-w-xl">
          {open && (
            <>
              <SheetHeader className="sticky top-0 z-10 border-b border-border bg-background/95 px-6 py-4 backdrop-blur">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <SheetTitle>Quote {open.id.toUpperCase()}</SheetTitle>
                      {open.pendingApproval && <ApprovalStatusBadge status={open.approvalStatus} />}
                    </div>
                    {!editing && (
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span>{open.customerName || open.customerId}</span>
                        <span>·</span>
                        <span>Agent {open.agentName}</span>
                      </div>
                    )}
                  </div>
                  {!editing && canEdit && (
                    <Button variant="ghost" size="sm" onClick={startEdit}>
                      <Edit className="size-4" /> Edit
                    </Button>
                  )}
                </div>

                {/* Quick-glance summary strip */}
                {!editing && (
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <div className="rounded-md border border-border bg-card/60 px-2.5 py-1.5">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Status
                      </div>
                      <div className="mt-0.5">
                        <StatusBadge value={open.status} />
                      </div>
                    </div>
                    <div className="rounded-md border border-border bg-card/60 px-2.5 py-1.5">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Pickup
                      </div>
                      <div className="mt-0.5 text-sm font-medium">{fmtDate(open.pickupDate)}</div>
                    </div>
                    <div className="rounded-md border border-border bg-card/60 px-2.5 py-1.5">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Customer rate
                      </div>
                      <div className="mt-0.5 font-mono text-sm">{usd(open.customerRate)}</div>
                    </div>
                    <div className="rounded-md border border-border bg-card/60 px-2.5 py-1.5">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Margin
                      </div>
                      <div
                        className={`mt-0.5 flex items-center gap-1 font-mono text-sm font-medium ${
                          marginTone(open.customerRate - open.carrierEstimate).color
                        }`}
                      >
                        {(() => {
                          const MarginIcon = marginTone(
                            open.customerRate - open.carrierEstimate,
                          ).Icon;
                          return <MarginIcon className="size-3" />;
                        })()}
                        {usd(open.customerRate - open.carrierEstimate)}
                      </div>
                    </div>
                  </div>
                )}
              </SheetHeader>

              <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
                {editing ? (
                  <form className="space-y-4" onSubmit={updateQuote}>
                    <div className="rounded-xl border border-border/70 bg-card/60 p-4 shadow-sm">
                      <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
                        <Building2 className="size-4 text-muted-foreground" /> Customer
                      </div>
                      <div className="space-y-1.5">
                        <div className="mb-2 flex items-center justify-between">
                          <Label htmlFor="edit-quote-customer">Customer</Label>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowAddCustomer(!showAddCustomer)}
                          >
                            {showAddCustomer ? "Select existing" : "Add new"}
                          </Button>
                        </div>
                        {showAddCustomer ? (
                          <div className="flex gap-2">
                            <Input
                              value={newCustomerName}
                              onChange={(e) => setNewCustomerName(e.target.value)}
                              placeholder="Enter new customer name"
                            />
                            <Button
                              type="button"
                              onClick={createCustomer}
                              disabled={addingCustomer}
                            >
                              {addingCustomer ? "Adding..." : "Add"}
                            </Button>
                          </div>
                        ) : (
                          <Select
                            value={editForm.customerId}
                            onValueChange={(val) =>
                              setEditForm((prev) => ({ ...prev, customerId: val }))
                            }
                          >
                            <SelectTrigger id="edit-quote-customer">
                              <SelectValue placeholder="Select a customer" />
                            </SelectTrigger>
                            <SelectContent>
                              {customers.map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.company}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl border border-border/70 bg-card/60 p-4 shadow-sm">
                      <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
                        <MapPin className="size-4 text-muted-foreground" /> Lane & freight
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label htmlFor="edit-quote-origin">Origin</Label>
                          <Input
                            id="edit-quote-origin"
                            value={editForm.origin}
                            onChange={(e) =>
                              setEditForm((prev) => ({ ...prev, origin: e.target.value }))
                            }
                            required
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="edit-quote-destination">Destination</Label>
                          <Input
                            id="edit-quote-destination"
                            value={editForm.destination}
                            onChange={(e) =>
                              setEditForm((prev) => ({ ...prev, destination: e.target.value }))
                            }
                            required
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="edit-quote-equipment">Equipment</Label>
                          <Input
                            id="edit-quote-equipment"
                            value={editForm.equipmentType}
                            onChange={(e) =>
                              setEditForm((prev) => ({ ...prev, equipmentType: e.target.value }))
                            }
                            required
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="edit-quote-commodity">Commodity</Label>
                          <Input
                            id="edit-quote-commodity"
                            value={editForm.commodity}
                            onChange={(e) =>
                              setEditForm((prev) => ({ ...prev, commodity: e.target.value }))
                            }
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-border/70 bg-card/60 p-4 shadow-sm">
                      <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
                        <DollarSign className="size-4 text-muted-foreground" /> Pricing & status
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label htmlFor="edit-quote-customer-rate">Customer rate</Label>
                          <Input
                            id="edit-quote-customer-rate"
                            type="number"
                            value={editForm.customerRate}
                            onChange={(e) =>
                              setEditForm((prev) => ({ ...prev, customerRate: e.target.value }))
                            }
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="edit-quote-carrier-cost">Carrier estimate</Label>
                          <Input
                            id="edit-quote-carrier-cost"
                            type="number"
                            value={editForm.carrierCost}
                            onChange={(e) =>
                              setEditForm((prev) => ({ ...prev, carrierCost: e.target.value }))
                            }
                          />
                        </div>
                        <div className="space-y-1.5 sm:col-span-2">
                          <Label>Calculated margin</Label>
                          <div className="flex items-center justify-between rounded-md border border-border bg-muted p-2 text-xs">
                            <span
                              className={`font-mono font-medium ${
                                marginTone(
                                  Number(editForm.customerRate || 0) -
                                    Number(editForm.carrierCost || 0),
                                ).color
                              }`}
                            >
                              {usd(
                                Number(editForm.customerRate || 0) -
                                  Number(editForm.carrierCost || 0),
                              )}
                            </span>
                            <MarginChip
                              margin={
                                Number(editForm.customerRate || 0) -
                                Number(editForm.carrierCost || 0)
                              }
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="edit-quote-status">Status</Label>
                          <Select
                            value={editForm.status}
                            onValueChange={(value) =>
                              setEditForm((prev) => ({
                                ...prev,
                                status: value as QuoteItem["status"],
                              }))
                            }
                          >
                            <SelectTrigger id="edit-quote-status">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {STATUSES.map((s) => (
                                <SelectItem key={s} value={s}>
                                  {s.replace("_", " ")}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5 sm:col-span-2">
                          <Label htmlFor="edit-quote-notes">Review notes</Label>
                          <Textarea
                            id="edit-quote-notes"
                            value={editForm.notes}
                            onChange={(e) =>
                              setEditForm((prev) => ({ ...prev, notes: e.target.value }))
                            }
                            rows={2}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="sticky bottom-0 -mx-6 flex flex-wrap items-center gap-2 border-t border-border bg-background/95 px-6 py-4 backdrop-blur">
                      <Button type="submit" disabled={updating}>
                        {updating ? "Saving…" : "Save changes"}
                      </Button>
                      <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  <>
                    <DetailSection icon={<MapPin className="size-4" />} title="Lane & freight">
                      <DetailGrid>
                        <DetailRow label="Origin" value={open.origin} />
                        <DetailRow label="Destination" value={open.destination} />
                        <DetailRow
                          label="Equipment"
                          value={open.equipment}
                          icon={<Truck className="size-3.5" />}
                        />
                        <DetailRow label="Commodity" value={open.commodity} />
                        <DetailRow label="Weight" value={`${open.weight.toLocaleString()} lbs`} />
                        <DetailRow label="Pickup" value={fmtDate(open.pickupDate)} />
                      </DetailGrid>
                    </DetailSection>

                    <DetailSection icon={<DollarSign className="size-4" />} title="Pricing">
                      <DetailGrid>
                        <DetailRow label="Customer rate" value={usd(open.customerRate)} mono />
                        <DetailRow
                          label="Carrier estimate"
                          value={usd(open.carrierEstimate)}
                          mono
                        />
                      </DetailGrid>
                      <div className="mt-3 flex items-center justify-between rounded-md border border-border bg-muted p-3">
                        <div>
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Margin
                          </div>
                          <div
                            className={`font-mono text-sm font-medium ${
                              marginTone(open.customerRate - open.carrierEstimate).color
                            }`}
                          >
                            {usd(open.customerRate - open.carrierEstimate)}
                          </div>
                        </div>
                        <MarginChip margin={open.customerRate - open.carrierEstimate} />
                      </div>
                    </DetailSection>

                    {open.status !== "approved" && role !== "trainee" && (
                      <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
                        <Lock className="size-3.5 shrink-0" />
                        Booking is locked until this quote is approved.
                      </div>
                    )}

                    <DetailSection icon={<MessageSquare className="size-4" />} title="Comments">
                      <ul className="space-y-2">
                        {open.comments.length === 0 && (
                          <li className="text-xs text-muted-foreground">No comments yet.</li>
                        )}
                        {open.comments.map((c, i) => (
                          <li
                            key={i}
                            className="rounded-md border border-border bg-card/50 p-2.5 text-sm"
                          >
                            <div className="text-xs text-muted-foreground">
                              {c.by} · {relative(c.at)}
                            </div>
                            <div className="mt-1">{c.body}</div>
                          </li>
                        ))}
                      </ul>
                      <Textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Leave a comment…"
                        rows={2}
                        className="mt-2"
                      />
                    </DetailSection>

                    {canApprove && !open.pendingApproval && (
                      <div className="flex flex-wrap gap-2">
                        <Button onClick={() => void decide(open.id, "approved", comment)}>
                          <Check className="size-4" /> Approve
                        </Button>
                        <Button
                          onClick={() => void decide(open.id, "rejected", comment)}
                          variant="outline"
                        >
                          <X className="size-4" /> Reject
                        </Button>
                        <Button
                          onClick={() => void decide(open.id, "changes_requested", comment)}
                          variant="outline"
                        >
                          Request changes
                        </Button>
                      </div>
                    )}
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

function escapeCsv(value: string) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}
