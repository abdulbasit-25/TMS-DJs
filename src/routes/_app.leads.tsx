import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/empty-state";
import { DataTable } from "@/components/data-table";
import { relative, fmtDateTime } from "@/lib/format";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api-client";
import {
  Download,
  Plus,
  Search,
  Phone,
  Mail,
  FileText,
  Bell,
  ClipboardList,
  Edit,
  Trash2,
  Building2,
  User,
  MessageSquare,
  Clock,
  StickyNote,
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
import { exportRowsToFile, formatExportFilename } from "@/lib/export";

export const Route = createFileRoute("/_app/leads")({
  component: LeadsPage,
});

type LeadStatus = "new" | "contacted" | "qualified" | "prospect" | "customer" | "lost";

type LeadItem = {
  id: string;
  company: string;
  contact: string;
  email: string;
  phone: string;
  status: LeadStatus;
  agentId: string;
  agentName: string;
  lastActivity: string;
  notes: string;
  shippingNotes: string;
  activities: Array<{
    id: string;
    kind: "call" | "note" | "followup" | "task" | "edit";
    body: string;
    by: string;
    at: string;
  }>;
  pendingApproval?: boolean;
  approvalStatus?: "pending" | "approved" | "rejected" | "changes_requested";
  comments?: Array<{ by: string; at: string; body: string }>;
  requestedBy?: string;
};

type LeadApiResponse = {
  leads: LeadItem[];
};

const PIPELINE: LeadStatus[] = ["new", "contacted", "qualified", "prospect", "customer", "lost"];

const ACTIVITY_ICON: Record<string, typeof Phone> = {
  call: Phone,
  note: FileText,
  followup: Bell,
  task: ClipboardList,
  edit: Edit,
};

/* ------------------------------------------------------------------------ */
/* Shared approval badge — same visual language as the carriers/loads pages */
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
/* Read-only detail primitives — mirrors the carriers/loads pages so every  */
/* detail sheet in the app feels the same: bordered cards with icon         */
/* headers, key/value grids, and pills for list-like values.                */
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

/** Compact pipeline progress bar for the leads table row — quick visual read of stage. */
function PipelineProgress({ status }: { status: LeadStatus }) {
  const idx = PIPELINE.indexOf(status);
  const isLost = status === "lost";
  return (
    <div className="flex w-28 items-center gap-1.5">
      <div className="flex h-1.5 flex-1 gap-0.5">
        {PIPELINE.filter((s) => s !== "lost").map((s, i) => (
          <span
            key={s}
            className={`h-full flex-1 rounded-full ${
              isLost ? "bg-destructive/40" : i <= idx ? "bg-primary" : "bg-muted"
            }`}
          />
        ))}
      </div>
      <span className="text-[10px] text-muted-foreground">
        {isLost ? "Lost" : `${idx + 1}/${PIPELINE.length - 1}`}
      </span>
    </div>
  );
}

/** Full pipeline stepper used inside the detail sheet. */
function PipelineStepper({ status }: { status: LeadStatus }) {
  const idx = PIPELINE.indexOf(status);
  return (
    <div className="flex flex-wrap gap-1.5">
      {PIPELINE.map((s) => {
        const reached = status !== "lost" && PIPELINE.indexOf(s) <= idx && s !== "lost";
        const isCurrent = s === status;
        return (
          <span
            key={s}
            className={`rounded-md border px-2 py-1 text-xs capitalize ${
              isCurrent && s === "lost"
                ? "border-destructive/40 bg-destructive/10 text-destructive"
                : reached
                  ? "border-primary/40 bg-primary/10 text-foreground"
                  : "border-border text-muted-foreground"
            } ${isCurrent ? "font-semibold" : ""}`}
          >
            {s}
          </span>
        );
      })}
    </div>
  );
}

function LeadsPage() {
  const { session } = useAuth();
  const role = session?.role ?? "agent";

  const [items, setItems] = useState<LeadItem[]>([]);
  const [agents, setAgents] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [agent, setAgent] = useState<string>("all");
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
    status: "new" as LeadStatus,
    notes: "",
    shippingNotes: "",
  });
  const [editForm, setEditForm] = useState({
    company: "",
    contact: "",
    email: "",
    phone: "",
    status: "new" as LeadStatus,
    notes: "",
    shippingNotes: "",
  });

  useEffect(() => {
    let active = true;

    async function loadLeads() {
      try {
        const payload = await apiFetch<LeadApiResponse>("/api/leads");
        if (!active) return;
        setItems(payload.data.leads);
        setAgents(
          payload.data.leads.reduce<Array<{ id: string; name: string }>>((acc, lead) => {
            if (!acc.some((entry) => entry.id === lead.agentId)) {
              acc.push({ id: lead.agentId, name: lead.agentName });
            }
            return acc;
          }, []),
        );
      } catch (error) {
        console.error(error);
        if (active) {
          setItems([]);
          setAgents([]);
          toast.error("Unable to load leads");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadLeads();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (role === "agent" || role === "trainee") {
      setAgent("all");
    }
  }, [role]);

  useEffect(() => {
    setEditing(false);
  }, [openId]);

  const filtered = useMemo(
    () =>
      items.filter((l) => {
        if (status !== "all" && l.status !== status) return false;
        if (agent !== "all" && l.agentId !== agent) return false;
        if (q && !`${l.company} ${l.contact} ${l.email}`.toLowerCase().includes(q.toLowerCase()))
          return false;
        return true;
      }),
    [items, q, status, agent],
  );

  const open = items.find((l) => l.id === openId) ?? null;
  const canDeleteLead = (item: LeadItem | null) =>
    Boolean(item && (role === "admin" || role === "ops_manager" || item.agentId === session?.id));

  async function createLead(event: FormEvent) {
    event.preventDefault();
    if (!form.company.trim() || !form.contact.trim()) {
      toast.error("Company and contact are required");
      return;
    }

    setCreating(true);
    try {
      const payload = await apiFetch<{ lead: LeadItem }>("/api/leads", {
        method: "POST",
        body: JSON.stringify({
          companyName: form.company.trim(),
          contactName: form.contact.trim(),
          contactEmail: form.email.trim(),
          contactPhone: form.phone.trim(),
          status: form.status,
          notes: form.notes.trim(),
          shippingNotes: form.shippingNotes.trim(),
        }),
      });

      setItems((prev) => [payload.data.lead, ...prev]);
      setForm({
        company: "",
        contact: "",
        email: "",
        phone: "",
        status: "new",
        notes: "",
        shippingNotes: "",
      });
      setShowCreate(false);
      toast.success("Lead created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to create lead");
    } finally {
      setCreating(false);
    }
  }

  function exportLeads(format: "csv" | "xlsx") {
    const rows = filtered.length > 0 ? filtered : items;
    const exported = exportRowsToFile(
      rows,
      [
        { label: "Company", getValue: (lead) => lead.company },
        { label: "Contact", getValue: (lead) => lead.contact },
        { label: "Email", getValue: (lead) => lead.email },
        { label: "Phone", getValue: (lead) => lead.phone },
        { label: "Status", getValue: (lead) => lead.status },
        { label: "Agent", getValue: (lead) => lead.agentName },
        {
          label: "Last Activity",
          getValue: (lead) =>
            lead.lastActivity ? new Date(lead.lastActivity).toLocaleString() : "",
        },
      ],
      formatExportFilename("leads", format),
      format,
      "Leads",
    );

    if (exported) {
      toast.success("Leads exported");
    }
  }

  function addActivity(kind: "call" | "note" | "followup" | "task", body: string) {
    if (!open || !body.trim()) return;
    setItems((prev) =>
      prev.map((l) =>
        l.id === open.id
          ? {
              ...l,
              lastActivity: new Date().toISOString(),
              activities: [
                {
                  id: `act-${Date.now()}`,
                  kind,
                  body,
                  by: session?.name ?? "Agent",
                  at: new Date().toISOString(),
                },
                ...l.activities,
              ],
            }
          : l,
      ),
    );
    toast.success(`${kind === "followup" ? "Follow-up" : kind} added`);
  }

  async function updateLead(event: FormEvent) {
    event.preventDefault();
    if (!open || !editForm.company.trim() || !editForm.contact.trim()) {
      toast.error("Company and contact are required");
      return;
    }

    setUpdating(true);
    try {
      const payload = await apiFetch<{ lead: LeadItem }>(`/api/leads`, {
        method: "PATCH",
        body: JSON.stringify({
          leadId: open.id,
          companyName: editForm.company.trim(),
          contactName: editForm.contact.trim(),
          contactEmail: editForm.email.trim(),
          contactPhone: editForm.phone.trim(),
          status: editForm.status,
          notes: editForm.notes.trim(),
          shippingNotes: editForm.shippingNotes.trim(),
        }),
      });

      setItems((prev) => prev.map((l) => (l.id === open.id ? payload.data.lead : l)));
      setOpenId(payload.data.lead.id);
      setEditing(false);
      toast.success("Lead updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update lead");
    } finally {
      setUpdating(false);
    }
  }

  async function removeLead(id: string) {
    try {
      await apiFetch(`/api/leads`, {
        method: "DELETE",
        body: JSON.stringify({ leadId: id }),
      });
      setItems((prev) => prev.filter((lead) => lead.id !== id));
      setOpenId(null);
      toast.success("Lead deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete lead");
    }
  }

  function startEdit() {
    if (!open) return;
    setEditForm({
      company: open.company,
      contact: open.contact,
      email: open.email,
      phone: open.phone,
      status: open.status,
      notes: open.notes,
      shippingNotes: open.shippingNotes,
    });
    setEditing(true);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Leads"
        description="Manage and track your leads."
        actions={
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="size-4" /> Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => exportLeads("csv")}>CSV</DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportLeads("xlsx")}>XLSX</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="sm" onClick={() => setShowCreate((prev) => !prev)}>
              <Plus className="size-4" /> New lead
            </Button>
          </>
        }
      />

      {showCreate && (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">Add a lead</div>
              <div className="text-xs text-muted-foreground">
                This saves the record into the database.
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
          </div>
          <form className="grid gap-3 md:grid-cols-2" onSubmit={createLead}>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                value={form.company}
                onChange={(e) => setForm((prev) => ({ ...prev, company: e.target.value }))}
                placeholder="Company name"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact">Contact</Label>
              <Input
                id="contact"
                value={form.contact}
                onChange={(e) => setForm((prev) => ({ ...prev, contact: e.target.value }))}
                placeholder="Contact name"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="name@email.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="(555) 000-0000"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lead-status">Status</Label>
              <Select
                value={form.status}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, status: value as LeadStatus }))
                }
              >
                <SelectTrigger id="lead-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PIPELINE.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="What else should the team know?"
                rows={3}
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="shippingNotes">Shipping notes</Label>
              <Textarea
                id="shippingNotes"
                value={form.shippingNotes}
                onChange={(e) => setForm((prev) => ({ ...prev, shippingNotes: e.target.value }))}
                placeholder="Lane, equipment, or urgency details"
                rows={2}
              />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button type="submit" disabled={creating}>
                {creating ? "Saving…" : "Save lead"}
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
            placeholder="Search company, contact, email…"
            className="pl-8"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {PIPELINE.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {role !== "agent" && role !== "trainee" && (
          <Select value={agent} onValueChange={setAgent}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Agent" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All agents</SelectItem>
              {agents.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <span className="ml-auto text-xs text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? "lead" : "leads"}
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <DataTable
          empty={
            <EmptyState
              icon={<ClipboardList className="size-6" />}
              title="No leads match your filters"
              description="Try clearing filters or create a new lead."
            />
          }
          rows={filtered}
          columns={[
            {
              head: "Company",
              cell: (l) => (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{l.company}</span>
                  {l.pendingApproval && <ApprovalStatusBadge status={l.approvalStatus} />}
                </div>
              ),
            },
            {
              head: "Contact",
              cell: (l) => (
                <div>
                  <div className="text-sm">{l.contact}</div>
                  <div className="text-xs text-muted-foreground">{l.email}</div>
                </div>
              ),
            },
            { head: "Phone", cell: (l) => <span className="font-mono text-xs">{l.phone}</span> },
            { head: "Status", cell: (l) => <StatusBadge value={l.status} /> },
            { head: "Pipeline", cell: (l) => <PipelineProgress status={l.status} /> },
            { head: "Agent", cell: (l) => <span className="text-sm">{l.agentName}</span> },
            {
              head: "Last activity",
              cell: (l) => (
                <span className="text-xs text-muted-foreground">{relative(l.lastActivity)}</span>
              ),
            },
          ]}
          onRowClick={(l) => setOpenId(l.id)}
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
                      <SheetTitle>{editing ? "Edit lead" : open.company}</SheetTitle>
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
                  {!editing && !open.pendingApproval && (
                    <div className="flex items-center gap-2">
                      {canDeleteLead(open) && (
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
                              <AlertDialogAction onClick={() => void removeLead(open.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                      <Button variant="ghost" size="sm" onClick={startEdit}>
                        <Edit className="size-4" /> Edit
                      </Button>
                    </div>
                  )}
                </div>

                {/* Quick-glance summary strip — key facts visible without opening a tab */}
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
                        Pipeline
                      </div>
                      <div className="mt-0.5 text-sm font-medium">
                        {open.status === "lost"
                          ? "Lost"
                          : `${PIPELINE.indexOf(open.status) + 1} / ${PIPELINE.length - 1}`}
                      </div>
                    </div>
                    <div className="rounded-md border border-border bg-card/60 px-2.5 py-1.5">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Activities
                      </div>
                      <div className="mt-0.5 text-sm font-medium">{open.activities.length}</div>
                    </div>
                    <div className="rounded-md border border-border bg-card/60 px-2.5 py-1.5">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Last activity
                      </div>
                      <div className="mt-0.5 text-sm font-medium">
                        {relative(open.lastActivity)}
                      </div>
                    </div>
                  </div>
                )}
              </SheetHeader>

              <div className="flex-1 overflow-y-auto px-6 py-5">
                {editing ? (
                  <form className="space-y-4" onSubmit={updateLead}>
                    <div className="rounded-xl border border-border/70 bg-card/60 p-4 shadow-sm">
                      <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
                        <Building2 className="size-4 text-muted-foreground" /> Company & contact
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5 sm:col-span-2">
                          <Label htmlFor="edit-company">Company</Label>
                          <Input
                            id="edit-company"
                            value={editForm.company}
                            onChange={(e) =>
                              setEditForm((prev) => ({ ...prev, company: e.target.value }))
                            }
                            placeholder="Company name"
                            required
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="edit-contact">Contact</Label>
                          <Input
                            id="edit-contact"
                            value={editForm.contact}
                            onChange={(e) =>
                              setEditForm((prev) => ({ ...prev, contact: e.target.value }))
                            }
                            placeholder="Contact name"
                            required
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="edit-status">Status</Label>
                          <Select
                            value={editForm.status}
                            onValueChange={(value) =>
                              setEditForm((prev) => ({ ...prev, status: value as LeadStatus }))
                            }
                          >
                            <SelectTrigger id="edit-status">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {PIPELINE.map((status) => (
                                <SelectItem key={status} value={status}>
                                  {status}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="edit-email">Email</Label>
                          <Input
                            id="edit-email"
                            type="email"
                            value={editForm.email}
                            onChange={(e) =>
                              setEditForm((prev) => ({ ...prev, email: e.target.value }))
                            }
                            placeholder="name@email.com"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="edit-phone">Phone</Label>
                          <Input
                            id="edit-phone"
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
                        <StickyNote className="size-4 text-muted-foreground" /> Notes
                      </div>
                      <div className="grid gap-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="edit-notes">Notes</Label>
                          <Textarea
                            id="edit-notes"
                            value={editForm.notes}
                            onChange={(e) =>
                              setEditForm((prev) => ({ ...prev, notes: e.target.value }))
                            }
                            placeholder="What else should the team know?"
                            rows={3}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="edit-shippingNotes">Shipping notes</Label>
                          <Textarea
                            id="edit-shippingNotes"
                            value={editForm.shippingNotes}
                            onChange={(e) =>
                              setEditForm((prev) => ({ ...prev, shippingNotes: e.target.value }))
                            }
                            placeholder="Lane, equipment, or urgency details"
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
                  <Tabs defaultValue="overview">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="overview">Overview</TabsTrigger>
                      <TabsTrigger value="activity">Activity</TabsTrigger>
                    </TabsList>

                    {/* ---------------------------------------------------------- */}
                    {/* Overview — contact info, pipeline, notes, then approval     */}
                    {/* comments, matching the carriers/loads sectioned layout.     */}
                    {/* ---------------------------------------------------------- */}
                    <TabsContent value="overview" className="space-y-4 pt-4">
                      <DetailSection icon={<User className="size-4" />} title="Contact">
                        <DetailGrid>
                          <DetailRow label="Contact" value={open.contact} />
                          <DetailRow label="Assigned agent" value={open.agentName} />
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

                      <DetailSection icon={<ClipboardList className="size-4" />} title="Pipeline">
                        <div className="flex items-center justify-between gap-3">
                          <PipelineStepper status={open.status} />
                          <span className="shrink-0 text-xs text-muted-foreground">
                            Last activity {relative(open.lastActivity)}
                          </span>
                        </div>
                      </DetailSection>

                      <DetailSection icon={<StickyNote className="size-4" />} title="Notes">
                        <div className="space-y-3">
                          <div>
                            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                              Notes
                            </div>
                            <p className="mt-0.5 whitespace-pre-wrap text-sm">
                              {open.notes || "—"}
                            </p>
                          </div>
                          <div>
                            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                              Shipping notes
                            </div>
                            <p className="mt-0.5 whitespace-pre-wrap text-sm">
                              {open.shippingNotes || "—"}
                            </p>
                          </div>
                        </div>
                      </DetailSection>

                      {open.pendingApproval && open.comments && open.comments.length > 0 && (
                        <DetailSection
                          icon={<MessageSquare className="size-4" />}
                          title="Approval comments"
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
                                {open.comments.map((comment, index) => (
                                  <tr
                                    key={index}
                                    className={`border-b border-border last:border-b-0 align-top ${
                                      index % 2 === 0 ? "bg-background" : "bg-card/60"
                                    }`}
                                  >
                                    <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                                      {relative(comment.at)}
                                    </td>
                                    <td className="px-3 py-2 font-medium">{comment.by}</td>
                                    <td className="px-3 py-2">{comment.body}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </DetailSection>
                      )}
                    </TabsContent>

                    {/* ---------------------------------------------------------- */}
                    {/* Activity — add form + timeline, each in its own section     */}
                    {/* ---------------------------------------------------------- */}
                    <TabsContent value="activity" className="space-y-4 pt-4">
                      <DetailSection icon={<Plus className="size-4" />} title="Log activity">
                        <AddActivityForm onAdd={addActivity} disabled={role === "trainee"} />
                      </DetailSection>

                      <DetailSection icon={<Clock className="size-4" />} title="Timeline">
                        {open.activities.length > 0 ? (
                          <ul className="space-y-2.5">
                            {open.activities.map((a) => {
                              const Icon = ACTIVITY_ICON[a.kind] ?? FileText;
                              return (
                                <li
                                  key={a.id}
                                  className="rounded-md border border-border bg-card/50 p-3"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                      <Icon className="size-3" />
                                      {a.kind}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">
                                      {relative(a.at)}
                                    </span>
                                  </div>
                                  <p className="mt-1.5 whitespace-pre-wrap text-sm">{a.body}</p>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {a.kind === "edit" ? (
                                      <>
                                        by {a.by} (lead owner: {open.agentName})
                                      </>
                                    ) : (
                                      <>by {a.by}</>
                                    )}
                                  </p>
                                </li>
                              );
                            })}
                          </ul>
                        ) : (
                          <p className="text-sm text-muted-foreground">No activity logged yet.</p>
                        )}
                      </DetailSection>
                    </TabsContent>
                  </Tabs>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function AddActivityForm({
  onAdd,
  disabled,
}: {
  onAdd: (k: "call" | "note" | "followup" | "task", b: string) => void;
  disabled?: boolean;
}) {
  const [kind, setKind] = useState<"call" | "note" | "followup" | "task">("note");
  const [body, setBody] = useState("");
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {(["call", "note", "followup", "task"] as const).map((k) => (
          <Button
            key={k}
            type="button"
            size="sm"
            variant={kind === k ? "default" : "outline"}
            onClick={() => setKind(k)}
          >
            {k === "call" && <Phone className="size-3.5" />}
            {k === "note" && <FileText className="size-3.5" />}
            {k === "followup" && <Bell className="size-3.5" />}
            {k === "task" && <ClipboardList className="size-3.5" />}
            {k}
          </Button>
        ))}
      </div>
      <Label className="sr-only" htmlFor="body">
        Activity
      </Label>
      <Textarea
        id="body"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Add details…"
        rows={3}
        disabled={disabled}
      />
      <div className="flex justify-end">
        <Button
          onClick={() => {
            onAdd(kind, body);
            setBody("");
          }}
          disabled={disabled || !body.trim()}
          size="sm"
        >
          Add activity
        </Button>
      </div>
      {disabled && <p className="text-xs text-muted-foreground">Read-only — trainee role.</p>}
    </div>
  );
}
