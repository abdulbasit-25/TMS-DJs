import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { usd, fmtDate } from "@/lib/format";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api-client";
import { can } from "@/lib/roles";
import {
  Building2,
  Check,
  Download,
  Edit,
  Plus,
  Search,
  Trash2,
  X,
  User,
  Mail,
  Phone,
  DollarSign,
  StickyNote,
  MessageSquare,
  ClipboardList,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/_app/customers")({
  component: CustomersPage,
});

type CustomerItem = {
  id: string;
  company: string;
  contact: string;
  email: string;
  phone: string;
  creditLimit: number;
  creditStatus: "pending" | "approved" | "rejected";
  status: "submitted" | "review" | "approved" | "rejected";
  agentId: string;
  agentName: string;
  notes: string;
  shippingNotes: string;
  createdAt: string;
  pendingApproval?: boolean;
  requestedBy?: string;
  approvalRequestId?: string;
  approvalStatus?: string;
  approvalComments?: any[];
};

type CustomerApiResponse = {
  customers: CustomerItem[];
};

const STEPS = ["submitted", "review", "approved"] as const;

/* ------------------------------------------------------------------------ */
/* Shared approval badge — same visual language as leads/loads/carriers.    */
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
  if (status === "approved") {
    return (
      <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600">
        Approved
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
/* Credit status labeling — colored chip, same pattern as margin/priority   */
/* labeling on the loads and follow-ups pages.                              */
/* ------------------------------------------------------------------------ */

function creditTone(status: CustomerItem["creditStatus"]) {
  if (status === "approved") {
    return { color: "text-emerald-600", bg: "bg-emerald-500/10", Icon: CheckCircle2 };
  }
  if (status === "rejected") {
    return { color: "text-red-500", bg: "bg-red-500/10", Icon: XCircle };
  }
  return { color: "text-amber-600", bg: "bg-amber-500/10", Icon: Clock };
}

function CreditStatusChip({ status }: { status: CustomerItem["creditStatus"] }) {
  const tone = creditTone(status);
  const Icon = tone.Icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${tone.bg} ${tone.color}`}
    >
      <Icon className="size-3" /> {status}
    </span>
  );
}

/* ------------------------------------------------------------------------ */
/* Read-only detail primitives — mirrors the leads/carriers/loads pages so  */
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

/** Onboarding-workflow stepper, same look as the pipeline stepper on the leads page. */
function OnboardingStepper({ status }: { status: CustomerItem["status"] }) {
  return (
    <div className="flex items-center">
      {STEPS.map((s, i) => {
        const reached = status === "rejected" ? i === 0 : STEPS.indexOf(status as any) >= i;
        return (
          <div key={s} className="flex flex-1 items-center">
            <div
              className={`grid size-7 shrink-0 place-items-center rounded-full border text-xs ${
                reached
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border text-muted-foreground"
              }`}
            >
              {i + 1}
            </div>
            <div className="ml-2 flex-1">
              <div className="text-xs font-medium capitalize">{s}</div>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`mx-1 h-px flex-1 ${reached ? "bg-primary/50" : "bg-border"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function CustomersPage() {
  const { session } = useAuth();
  const role = session?.role ?? "agent";
  const canApprove = can(role, "approval_actions");
  const canEdit =
    role === "admin" || role === "ops_manager" || role === "team_manager" || role === "agent";
  const [items, setItems] = useState<CustomerItem[]>([]);
  const [agents, setAgents] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [form, setForm] = useState({
    company: "",
    contact: "",
    email: "",
    phone: "",
    creditLimit: "",
    creditStatus: "pending" as CustomerItem["creditStatus"],
    status: "submitted" as CustomerItem["status"],
    notes: "",
    shippingNotes: "",
  });
  const [editForm, setEditForm] = useState({
    company: "",
    contact: "",
    email: "",
    phone: "",
    creditLimit: "",
    creditStatus: "pending" as CustomerItem["creditStatus"],
    status: "submitted" as CustomerItem["status"],
    notes: "",
    shippingNotes: "",
  });
  const [editingApprovalRequestId, setEditingApprovalRequestId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadCustomers() {
      try {
        const payload = await apiFetch<CustomerApiResponse>("/api/customers");
        if (!active) return;
        setItems(payload.data.customers);
        setAgents(
          payload.data.customers.reduce<Array<{ id: string; name: string }>>((acc, customer) => {
            if (!acc.some((entry) => entry.id === customer.agentId)) {
              acc.push({ id: customer.agentId, name: customer.agentName });
            }
            return acc;
          }, []),
        );
      } catch (error) {
        console.error(error);
        if (active) {
          setItems([]);
          setAgents([]);
          toast.error("Unable to load customers");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadCustomers();
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(
    () =>
      items.filter(
        (c) => !q || `${c.company} ${c.contact} ${c.email}`.toLowerCase().includes(q.toLowerCase()),
      ),
    [items, q],
  );
  const open = items.find((i) => i.id === openId) ?? null;
  const canDeleteCustomer = (item: CustomerItem | null) =>
    Boolean(item && (role === "admin" || role === "ops_manager" || item.agentId === session?.id));

  async function createCustomer(event: FormEvent) {
    event.preventDefault();
    if (!form.company.trim() || !form.contact.trim()) {
      toast.error("Company and contact are required");
      return;
    }

    setCreating(true);
    try {
      const payload = await apiFetch<{ customer: CustomerItem }>("/api/customers", {
        method: "POST",
        body: JSON.stringify({
          companyName: form.company.trim(),
          contactName: form.contact.trim(),
          contactEmail: form.email.trim(),
          contactPhone: form.phone.trim(),
          creditLimit: Number(form.creditLimit || 0),
          creditStatus: form.creditStatus,
          status: form.status,
          notes: form.notes.trim(),
          shippingNotes: form.shippingNotes.trim(),
        }),
      });

      setItems((prev) => [payload.data.customer, ...prev]);
      setForm({
        company: "",
        contact: "",
        email: "",
        phone: "",
        creditLimit: "",
        creditStatus: "pending",
        status: "submitted",
        notes: "",
        shippingNotes: "",
      });
      setShowCreate(false);
      toast.success("Customer created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to create customer");
    } finally {
      setCreating(false);
    }
  }

  async function updateCustomer(event: FormEvent) {
    event.preventDefault();
    if (!open || !editForm.company.trim() || !editForm.contact.trim()) {
      toast.error("Company and contact are required");
      return;
    }

    setUpdating(true);
    try {
      const payload = await apiFetch<{ customer: CustomerItem }>(`/api/customers`, {
        method: "PATCH",
        body: JSON.stringify({
          customerId: open.id,
          approvalRequestId: editingApprovalRequestId,
          companyName: editForm.company.trim(),
          contactName: editForm.contact.trim(),
          contactEmail: editForm.email.trim(),
          contactPhone: editForm.phone.trim(),
          creditLimit: Number(editForm.creditLimit || 0),
          creditStatus: editForm.creditStatus,
          status: editForm.status,
          notes: editForm.notes.trim(),
          shippingNotes: editForm.shippingNotes.trim(),
        }),
      });

      setItems((prev) =>
        prev.map((customer) => (customer.id === open.id ? payload.data.customer : customer)),
      );
      setOpenId(payload.data.customer.id);
      setEditing(false);
      setEditingApprovalRequestId(null);
      toast.success("Customer updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update customer");
    } finally {
      setUpdating(false);
    }
  }

  async function removeCustomer(id: string) {
    try {
      await apiFetch(`/api/customers`, {
        method: "DELETE",
        body: JSON.stringify({ customerId: id }),
      });
      setItems((prev) => prev.filter((customer) => customer.id !== id));
      setOpenId(null);
      toast.success("Customer deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete customer");
    }
  }

  function startEdit() {
    if (!open) return;
    setEditForm({
      company: open.company,
      contact: open.contact,
      email: open.email,
      phone: open.phone,
      creditLimit: String(open.creditLimit),
      creditStatus: open.creditStatus,
      status: open.status,
      notes: open.notes,
      shippingNotes: open.shippingNotes,
    });
    if (open.approvalRequestId) {
      setEditingApprovalRequestId(open.approvalRequestId);
    } else {
      setEditingApprovalRequestId(null);
    }
    setEditing(true);
  }

  async function decide(id: string, approve: boolean) {
    const customer = items.find((item) => item.id === id);
    if (!customer) return;
    try {
      const payload = await apiFetch<{ customer: CustomerItem }>("/api/customers", {
        method: "PATCH",
        body: JSON.stringify({
          customerId: id,
          companyName: customer.company,
          contactName: customer.contact,
          contactEmail: customer.email,
          contactPhone: customer.phone,
          creditLimit: customer.creditLimit,
          creditStatus: approve ? "approved" : "rejected",
          status: approve ? "approved" : "rejected",
          notes: customer.notes,
          shippingNotes: customer.shippingNotes,
        }),
      });
      setItems((prev) => prev.map((item) => (item.id === id ? payload.data.customer : item)));
      toast.success(approve ? "Customer approved" : "Customer rejected");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update customer");
    }
  }

  function exportCustomers(format: "csv" | "xlsx") {
    const rows = filtered.length > 0 ? filtered : items;
    if (rows.length === 0) {
      toast.error("No customers to export");
      return;
    }

    const data = rows.map((customer) => ({
      Company: customer.company,
      Contact: customer.contact,
      Email: customer.email,
      Phone: customer.phone,
      "Credit limit": usd(customer.creditLimit),
      "Credit status": customer.creditStatus,
      "Onboarding status": customer.status,
      Agent: customer.agentName,
      Created: fmtDate(customer.createdAt),
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
      link.download = "customers.csv";
      link.click();
      URL.revokeObjectURL(url);
    } else {
      import("xlsx").then((XLSX) => {
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Customers");
        XLSX.writeFile(workbook, "customers.xlsx");
      });
    }
    toast.success("Customers exported");
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Customers"
        description="Customer onboarding, credit approval, and ongoing relationships."
        actions={
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="size-4" /> Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => exportCustomers("csv")}>CSV</DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportCustomers("xlsx")}>XLSX</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="sm" onClick={() => setShowCreate((prev) => !prev)}>
              <Plus className="size-4" /> New customer
            </Button>
          </>
        }
      />

      {showCreate && (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">Add a customer</div>
              <div className="text-xs text-muted-foreground">
                This saves the record into the database.
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
          </div>
          <form className="grid gap-3 md:grid-cols-2" onSubmit={createCustomer}>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="customer-company">Company</Label>
              <Input
                id="customer-company"
                value={form.company}
                onChange={(e) => setForm((prev) => ({ ...prev, company: e.target.value }))}
                placeholder="Company name"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="customer-contact">Contact</Label>
              <Input
                id="customer-contact"
                value={form.contact}
                onChange={(e) => setForm((prev) => ({ ...prev, contact: e.target.value }))}
                placeholder="Contact name"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="customer-email">Email</Label>
              <Input
                id="customer-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="name@email.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="customer-phone">Phone</Label>
              <Input
                id="customer-phone"
                value={form.phone}
                onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="(555) 000-0000"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="customer-credit-limit">Credit limit</Label>
              <Input
                id="customer-credit-limit"
                type="number"
                value={form.creditLimit}
                onChange={(e) => setForm((prev) => ({ ...prev, creditLimit: e.target.value }))}
                placeholder="50000"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="customer-credit-status">Credit status</Label>
              <Select
                value={form.creditStatus}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    creditStatus: value as CustomerItem["creditStatus"],
                  }))
                }
              >
                <SelectTrigger id="customer-credit-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">pending</SelectItem>
                  <SelectItem value="approved">approved</SelectItem>
                  <SelectItem value="rejected">rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="customer-status">Onboarding status</Label>
              <Select
                value={form.status}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, status: value as CustomerItem["status"] }))
                }
              >
                <SelectTrigger id="customer-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="submitted">submitted</SelectItem>
                  <SelectItem value="review">review</SelectItem>
                  <SelectItem value="approved">approved</SelectItem>
                  <SelectItem value="rejected">rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="customer-notes">Notes</Label>
              <Textarea
                id="customer-notes"
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Notes for the team"
                rows={3}
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="customer-shipping-notes">Shipping notes</Label>
              <Textarea
                id="customer-shipping-notes"
                value={form.shippingNotes}
                onChange={(e) => setForm((prev) => ({ ...prev, shippingNotes: e.target.value }))}
                placeholder="Lane or routing details"
                rows={2}
              />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button type="submit" disabled={creating}>
                {creating ? "Saving…" : "Save customer"}
              </Button>
            </div>
          </form>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search customer or contact…"
            className="pl-8"
          />
        </div>
        <span className="ml-auto text-xs text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? "customer" : "customers"}
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <DataTable
          empty={
            <EmptyState
              icon={<Building2 className="size-6" />}
              title="No customers found"
              description="Try creating a customer or adjust your search."
            />
          }
          rows={filtered}
          onRowClick={(c) => setOpenId(c.id)}
          columns={[
            {
              head: "Company",
              cell: (c) => (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{c.company}</span>
                  {c.pendingApproval && <ApprovalStatusBadge status={c.approvalStatus} />}
                </div>
              ),
            },
            {
              head: "Contact",
              cell: (c) => (
                <div>
                  <div className="text-sm">{c.contact}</div>
                  <div className="text-xs text-muted-foreground">{c.email}</div>
                </div>
              ),
            },
            {
              head: "Credit limit",
              cell: (c) => <span className="font-mono text-sm">{usd(c.creditLimit)}</span>,
            },
            { head: "Credit", cell: (c) => <CreditStatusChip status={c.creditStatus} /> },
            { head: "Onboarding", cell: (c) => <StatusBadge value={c.status} /> },
            { head: "Agent", cell: (c) => <span className="text-sm">{c.agentName}</span> },
            {
              head: "Created",
              cell: (c) => (
                <span className="text-xs text-muted-foreground">{fmtDate(c.createdAt)}</span>
              ),
            },
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
                      <SheetTitle>{editing ? "Edit customer" : open.company}</SheetTitle>
                      {open.pendingApproval && <ApprovalStatusBadge status={open.approvalStatus} />}
                    </div>
                    {!editing && (
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span>{open.contact}</span>
                        <span>·</span>
                        <span>Agent {open.agentName}</span>
                      </div>
                    )}
                  </div>
                  {!editing && (
                    <div className="flex items-center gap-2">
                      {canDeleteCustomer(open) && !open.pendingApproval && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Trash2 className="size-4" /> Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete {open.company}?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => void removeCustomer(open.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                      {canEdit &&
                        (open.pendingApproval
                          ? open.requestedBy === session?.name || open.agentId === session?.id
                          : true) && (
                          <Button variant="ghost" size="sm" onClick={startEdit}>
                            <Edit className="size-4" /> Edit
                          </Button>
                        )}
                    </div>
                  )}
                </div>

                {/* Quick-glance summary strip — key facts visible without scrolling */}
                {!editing && (
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <div className="rounded-md border border-border bg-card/60 px-2.5 py-1.5">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Credit status
                      </div>
                      <div className="mt-0.5">
                        <CreditStatusChip status={open.creditStatus} />
                      </div>
                    </div>
                    <div className="rounded-md border border-border bg-card/60 px-2.5 py-1.5">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Onboarding
                      </div>
                      <div className="mt-0.5">
                        <StatusBadge value={open.status} />
                      </div>
                    </div>
                    <div className="rounded-md border border-border bg-card/60 px-2.5 py-1.5">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Credit limit
                      </div>
                      <div className="mt-0.5 font-mono text-sm">{usd(open.creditLimit)}</div>
                    </div>
                    <div className="rounded-md border border-border bg-card/60 px-2.5 py-1.5">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Created
                      </div>
                      <div className="mt-0.5 text-sm">{fmtDate(open.createdAt)}</div>
                    </div>
                  </div>
                )}
              </SheetHeader>

              <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
                {editing ? (
                  <form className="space-y-4" onSubmit={updateCustomer}>
                    <div className="rounded-xl border border-border/70 bg-card/60 p-4 shadow-sm">
                      <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
                        <Building2 className="size-4 text-muted-foreground" /> Company & contact
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5 sm:col-span-2">
                          <Label htmlFor="edit-customer-company">Company</Label>
                          <Input
                            id="edit-customer-company"
                            value={editForm.company}
                            onChange={(e) =>
                              setEditForm((prev) => ({ ...prev, company: e.target.value }))
                            }
                            placeholder="Company name"
                            required
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="edit-customer-contact">Contact</Label>
                          <Input
                            id="edit-customer-contact"
                            value={editForm.contact}
                            onChange={(e) =>
                              setEditForm((prev) => ({ ...prev, contact: e.target.value }))
                            }
                            placeholder="Contact name"
                            required
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="edit-customer-email">Email</Label>
                          <Input
                            id="edit-customer-email"
                            type="email"
                            value={editForm.email}
                            onChange={(e) =>
                              setEditForm((prev) => ({ ...prev, email: e.target.value }))
                            }
                            placeholder="name@email.com"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="edit-customer-phone">Phone</Label>
                          <Input
                            id="edit-customer-phone"
                            value={editForm.phone}
                            onChange={(e) =>
                              setEditForm((prev) => ({ ...prev, phone: e.target.value }))
                            }
                            placeholder="(555) 000-0000"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-border/70 bg-card/60 p-4 shadow-sm">
                      <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
                        <DollarSign className="size-4 text-muted-foreground" /> Credit & onboarding
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label htmlFor="edit-customer-credit-limit">Credit limit</Label>
                          <Input
                            id="edit-customer-credit-limit"
                            type="number"
                            value={editForm.creditLimit}
                            onChange={(e) =>
                              setEditForm((prev) => ({ ...prev, creditLimit: e.target.value }))
                            }
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="edit-customer-credit-status">Credit status</Label>
                          <Select
                            value={editForm.creditStatus}
                            onValueChange={(value) =>
                              setEditForm((prev) => ({
                                ...prev,
                                creditStatus: value as CustomerItem["creditStatus"],
                              }))
                            }
                          >
                            <SelectTrigger id="edit-customer-credit-status">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">pending</SelectItem>
                              <SelectItem value="approved">approved</SelectItem>
                              <SelectItem value="rejected">rejected</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5 sm:col-span-2">
                          <Label htmlFor="edit-customer-status">Onboarding status</Label>
                          <Select
                            value={editForm.status}
                            onValueChange={(value) =>
                              setEditForm((prev) => ({
                                ...prev,
                                status: value as CustomerItem["status"],
                              }))
                            }
                          >
                            <SelectTrigger id="edit-customer-status">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="submitted">submitted</SelectItem>
                              <SelectItem value="review">review</SelectItem>
                              <SelectItem value="approved">approved</SelectItem>
                              <SelectItem value="rejected">rejected</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-border/70 bg-card/60 p-4 shadow-sm">
                      <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
                        <StickyNote className="size-4 text-muted-foreground" /> Notes
                      </div>
                      <div className="grid gap-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="edit-customer-notes">Notes</Label>
                          <Textarea
                            id="edit-customer-notes"
                            value={editForm.notes}
                            onChange={(e) =>
                              setEditForm((prev) => ({ ...prev, notes: e.target.value }))
                            }
                            rows={3}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="edit-customer-shipping-notes">Shipping notes</Label>
                          <Textarea
                            id="edit-customer-shipping-notes"
                            value={editForm.shippingNotes}
                            onChange={(e) =>
                              setEditForm((prev) => ({ ...prev, shippingNotes: e.target.value }))
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
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setEditing(false);
                          setEditingApprovalRequestId(null);
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  <>
                    <DetailSection icon={<User className="size-4" />} title="Contact">
                      <DetailGrid>
                        <DetailRow label="Contact" value={open.contact} />
                        <DetailRow label="Agent" value={open.agentName} />
                        <DetailRow
                          label="Email"
                          value={open.email}
                          icon={<Mail className="size-3.5" />}
                          mono
                        />
                        <DetailRow
                          label="Phone"
                          value={open.phone}
                          icon={<Phone className="size-3.5" />}
                          mono
                        />
                      </DetailGrid>
                    </DetailSection>

                    <DetailSection icon={<DollarSign className="size-4" />} title="Credit">
                      <DetailGrid>
                        <DetailRow label="Credit limit" value={usd(open.creditLimit)} mono />
                        <DetailRow
                          label="Credit status"
                          value={<CreditStatusChip status={open.creditStatus} />}
                        />
                      </DetailGrid>
                    </DetailSection>

                    <DetailSection
                      icon={<ClipboardList className="size-4" />}
                      title="Onboarding workflow"
                    >
                      <OnboardingStepper status={open.status} />
                      {open.status === "rejected" && (
                        <p className="mt-2 text-xs text-destructive">
                          Customer rejected. Available for re-submission.
                        </p>
                      )}
                    </DetailSection>

                    {(open.notes || open.shippingNotes) && (
                      <DetailSection icon={<StickyNote className="size-4" />} title="Notes">
                        <div className="space-y-3">
                          {open.notes && (
                            <div>
                              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                Notes
                              </div>
                              <p className="mt-0.5 whitespace-pre-wrap text-sm">{open.notes}</p>
                            </div>
                          )}
                          {open.shippingNotes && (
                            <div>
                              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                Shipping notes
                              </div>
                              <p className="mt-0.5 whitespace-pre-wrap text-sm">
                                {open.shippingNotes}
                              </p>
                            </div>
                          )}
                        </div>
                      </DetailSection>
                    )}

                    {open.pendingApproval &&
                      open.approvalComments &&
                      open.approvalComments.length > 0 && (
                        <DetailSection
                          icon={<MessageSquare className="size-4" />}
                          title="Conversation"
                        >
                          <div className="overflow-x-auto rounded-md border border-border">
                            <table className="w-full min-w-[420px] text-sm">
                              <thead>
                                <tr className="border-b border-border bg-muted/50 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                  <th className="px-3 py-2">Date</th>
                                  <th className="px-3 py-2">By</th>
                                  <th className="px-3 py-2">Comment</th>
                                </tr>
                              </thead>
                              <tbody>
                                {open.approvalComments.map((comment: any, index: number) => (
                                  <tr
                                    key={comment.id ?? index}
                                    className={`border-b border-border last:border-b-0 align-top ${
                                      index % 2 === 0 ? "bg-background" : "bg-card/60"
                                    }`}
                                  >
                                    <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                                      {fmtDate(comment.createdAt)}
                                    </td>
                                    <td className="px-3 py-2 font-medium">{comment.userName}</td>
                                    <td className="px-3 py-2">{comment.text}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </DetailSection>
                      )}

                    {canApprove &&
                      (open.status === "submitted" || open.status === "review") &&
                      !open.pendingApproval && (
                        <div className="flex gap-2">
                          <Button onClick={() => decide(open.id, true)} className="flex-1">
                            <Check className="size-4" /> Approve
                          </Button>
                          <Button
                            onClick={() => decide(open.id, false)}
                            variant="outline"
                            className="flex-1"
                          >
                            <X className="size-4" /> Reject
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
