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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/empty-state";
import { DataTable } from "@/components/data-table";
import { relative } from "@/lib/format";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api-client";
import {
  Plus,
  Search,
  ClipboardList,
  CheckCircle2,
  Trash2,
  Download,
  Calendar,
  User,
  StickyNote,
  AlertTriangle,
  Flag,
  Edit,
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

export const Route = createFileRoute("/_app/followups")({
  component: FollowupsPage,
});

type Priority = "low" | "medium" | "high";

type FollowUpItem = {
  id: string;
  leadId: string;
  leadName?: string;
  customerId?: string;
  assignedTo: string;
  assignedToName: string;
  title: string;
  notes?: string;
  priority: Priority;
  dueDate: string;
  isCompleted: boolean;
  completedAt?: string;
  completedBy?: string;
  completedByName?: string;
};

type FollowupsApiResponse = {
  followUps: FollowUpItem[];
};

type LeadOption = {
  id: string;
  company: string;
  contact: string;
};

type LeadsApiResponse = {
  leads: LeadOption[];
};

/* ------------------------------------------------------------------------ */
/* Priority / due-date labeling — colored chips, same visual language as    */
/* the margin/hazmat/insurance labeling on the loads and carriers pages.    */
/* ------------------------------------------------------------------------ */

function priorityTone(priority: Priority) {
  if (priority === "high") {
    return { color: "text-red-500", bg: "bg-red-500/10", label: "High priority" };
  }
  if (priority === "medium") {
    return { color: "text-amber-600", bg: "bg-amber-500/10", label: "Medium priority" };
  }
  return { color: "text-sky-600", bg: "bg-sky-500/10", label: "Low priority" };
}

function PriorityChip({ priority }: { priority: Priority }) {
  const tone = priorityTone(priority);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${tone.bg} ${tone.color}`}
    >
      <Flag className="size-3" /> {priority}
    </span>
  );
}

/** Due-date state relative to today, independent of completion. */
function dueDateState(dueDate: string, isCompleted: boolean): "overdue" | "due_today" | "upcoming" {
  const due = new Date(dueDate);
  const today = new Date();
  due.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  if (isCompleted) return "upcoming";
  if (due.getTime() < today.getTime()) return "overdue";
  if (due.getTime() === today.getTime()) return "due_today";
  return "upcoming";
}

function DueDateBadge({ dueDate, isCompleted }: { dueDate: string; isCompleted: boolean }) {
  const state = dueDateState(dueDate, isCompleted);
  const formatted = new Date(dueDate).toLocaleDateString();

  if (state === "overdue") {
    return (
      <span className="inline-flex items-center gap-1 text-sm font-semibold text-red-500">
        <AlertTriangle className="size-3.5" /> {formatted}
        <span className="rounded-full bg-red-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
          Overdue
        </span>
      </span>
    );
  }
  if (state === "due_today") {
    return (
      <span className="inline-flex items-center gap-1 text-sm font-medium text-amber-600">
        {formatted}
        <span className="rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
          Due today
        </span>
      </span>
    );
  }
  return <span className="text-sm text-muted-foreground">{formatted}</span>;
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
  span2,
  icon,
}: {
  label: string;
  value: ReactNode;
  span2?: boolean;
  icon?: ReactNode;
}) {
  return (
    <div className={span2 ? "sm:col-span-2" : undefined}>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 flex items-start gap-1.5 text-sm">
        {icon && <span className="mt-0.5 text-muted-foreground">{icon}</span>}
        <span>{value || "—"}</span>
      </div>
    </div>
  );
}

function FollowupsPage() {
  const { session } = useAuth();
  const role = session?.role ?? "agent";

  const [items, setItems] = useState<FollowUpItem[]>([]);
  const [leadOptions, setLeadOptions] = useState<LeadOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [priority, setPriority] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [form, setForm] = useState({
    leadId: "",
    title: "",
    notes: "",
    priority: "medium" as Priority,
    dueDate: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        const [followUpsPayload, leadsPayload] = await Promise.all([
          apiFetch<FollowupsApiResponse>("/api/followups"),
          apiFetch<LeadsApiResponse>("/api/leads"),
        ]);
        if (!active) return;
        setItems(followUpsPayload.data.followUps);
        setLeadOptions(leadsPayload.data.leads);
      } catch (error) {
        console.error(error);
        if (active) {
          setItems([]);
          setLeadOptions([]);
          toast.error("Unable to load follow-ups");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadData();
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(
    () =>
      items.filter((f) => {
        if (status !== "all" && (status === "completed" ? !f.isCompleted : f.isCompleted))
          return false;
        if (priority !== "all" && f.priority !== priority) return false;
        if (q && !`${f.title} ${f.notes}`.toLowerCase().includes(q.toLowerCase())) return false;
        return true;
      }),
    [items, q, priority, status],
  );

  const open = items.find((f) => f.id === openId) ?? null;

  async function createFollowUp(event: FormEvent) {
    event.preventDefault();
    if (!form.leadId.trim() || !form.title.trim() || !form.dueDate) {
      toast.error("Lead, title, and due date are required");
      return;
    }

    setCreating(true);
    try {
      const payload = await apiFetch<{ followUp: FollowUpItem }>("/api/followups", {
        method: "POST",
        body: JSON.stringify({
          leadId: form.leadId.trim(),
          title: form.title.trim(),
          notes: form.notes.trim(),
          priority: form.priority,
          dueDate: form.dueDate,
        }),
      });

      setItems((prev) => [payload.data.followUp, ...prev]);
      setForm({
        leadId: "",
        title: "",
        notes: "",
        priority: "medium",
        dueDate: new Date().toISOString().split("T")[0],
      });
      setShowCreate(false);
      toast.success("Follow-up created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to create follow-up");
    } finally {
      setCreating(false);
    }
  }

  async function toggleComplete(id: string) {
    const item = items.find((i) => i.id === id);
    if (!item) return;

    try {
      const payload = await apiFetch<{ followUp: FollowUpItem }>("/api/followups", {
        method: "PATCH",
        body: JSON.stringify({
          followUpId: id,
          isCompleted: !item.isCompleted,
        }),
      });

      setItems((prev) => prev.map((i) => (i.id === id ? payload.data.followUp : i)));
      toast.success("Follow-up updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update follow-up");
    }
  }

  async function removeFollowUp(id: string) {
    try {
      await apiFetch("/api/followups", {
        method: "DELETE",
        body: JSON.stringify({ followUpId: id }),
      });
      setItems((prev) => prev.filter((i) => i.id !== id));
      if (openId === id) setOpenId(null);
      toast.success("Follow-up deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete follow-up");
    }
  }

  function exportFollowUps(format: "csv" | "xlsx") {
    const rows = filtered.length > 0 ? filtered : items;
    const exported = exportRowsToFile(
      rows,
      [
        { label: "Title", getValue: (item) => item.title },
        { label: "Lead", getValue: (item) => item.leadName ?? item.leadId },
        { label: "Priority", getValue: (item) => item.priority },
        { label: "Due Date", getValue: (item) => item.dueDate },
        { label: "Assigned To", getValue: (item) => item.assignedToName },
        { label: "Status", getValue: (item) => (item.isCompleted ? "Completed" : "Pending") },
        { label: "Notes", getValue: (item) => item.notes ?? "" },
      ],
      formatExportFilename("followups", format),
      format,
      "Follow-ups",
    );

    if (exported) {
      toast.success("Follow-ups exported");
    }
  }

  const overdueCount = useMemo(
    () => items.filter((f) => dueDateState(f.dueDate, f.isCompleted) === "overdue").length,
    [items],
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Follow-ups"
        description="Manage your follow-up tasks and track due dates."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="size-4" /> Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => exportFollowUps("csv")}>CSV</DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportFollowUps("xlsx")}>XLSX</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="sm" onClick={() => setShowCreate((prev) => !prev)}>
              <Plus className="size-4" /> New follow-up
            </Button>
          </div>
        }
      />

      {showCreate && (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">Add a follow-up</div>
              <div className="text-xs text-muted-foreground">
                This saves the follow-up into the database.
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
          </div>
          <form className="grid gap-3 md:grid-cols-2" onSubmit={createFollowUp}>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="leadId">Lead</Label>
              <Select
                value={form.leadId}
                onValueChange={(value) => setForm((prev) => ({ ...prev, leadId: value }))}
              >
                <SelectTrigger id="leadId">
                  <SelectValue placeholder="Select a lead" />
                </SelectTrigger>
                <SelectContent>
                  {leadOptions.map((lead) => (
                    <SelectItem key={lead.id} value={lead.id}>
                      {lead.company}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Follow-up title"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={form.priority}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, priority: value as Priority }))
                }
              >
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm((prev) => ({ ...prev, dueDate: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Notes about the follow-up"
                rows={3}
              />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button type="submit" disabled={creating}>
                {creating ? "Saving…" : "Save follow-up"}
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
            placeholder="Search follow-ups…"
            className="pl-8"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          {overdueCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 font-semibold text-red-500">
              <AlertTriangle className="size-3" /> {overdueCount} overdue
            </span>
          )}
          <span>
            {filtered.length} {filtered.length === 1 ? "follow-up" : "follow-ups"}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <DataTable
          empty={
            <EmptyState
              icon={<ClipboardList className="size-6" />}
              title="No follow-ups match your filters"
              description="Try clearing filters or create a new follow-up."
            />
          }
          rows={filtered}
          onRowClick={(f) => setOpenId(f.id)}
          columns={[
            { head: "Title", cell: (f) => <span className="font-medium">{f.title}</span> },
            {
              head: "Lead",
              cell: (f) => <span className="text-sm">{f.leadName ?? f.leadId}</span>,
            },
            { head: "Priority", cell: (f) => <PriorityChip priority={f.priority} /> },
            {
              head: "Due Date",
              cell: (f) => <DueDateBadge dueDate={f.dueDate} isCompleted={f.isCompleted} />,
            },
            {
              head: "Assigned To",
              cell: (f) => <span className="text-sm">{f.assignedToName}</span>,
            },
            {
              head: "Status",
              cell: (f) => (
                <StatusBadge
                  value={f.isCompleted ? "completed" : "pending"}
                  tone={f.isCompleted ? "success" : "info"}
                />
              ),
            },
            {
              head: "Actions",
              cell: (f) => (
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <Button variant="outline" size="sm" onClick={() => toggleComplete(f.id)}>
                    <CheckCircle2 className="size-4" /> {f.isCompleted ? "Undo" : "Complete"}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Trash2 className="size-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete "{f.title}"?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => void removeFollowUp(f.id)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ),
            },
          ]}
        />
      </div>

      {/* Detail sheet — same layout language as the leads/carriers/loads pages */}
      <Sheet open={!!open} onOpenChange={(v) => !v && setOpenId(null)}>
        <SheetContent className="flex w-full flex-col overflow-y-auto p-0 sm:max-w-lg">
          {open && (
            <>
              <SheetHeader className="sticky top-0 z-10 border-b border-border bg-background/95 px-6 py-4 backdrop-blur">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <SheetTitle>{open.title}</SheetTitle>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>{open.leadName ?? open.leadId}</span>
                      <span>·</span>
                      <span>Assigned to {open.assignedToName}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => toggleComplete(open.id)}>
                      <CheckCircle2 className="size-4" /> {open.isCompleted ? "Undo" : "Complete"}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="size-4" /> Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete "{open.title}"?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => void removeFollowUp(open.id)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>

                {/* Quick-glance summary strip */}
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="rounded-md border border-border bg-card/60 px-2.5 py-1.5">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Status
                    </div>
                    <div className="mt-0.5">
                      <StatusBadge
                        value={open.isCompleted ? "completed" : "pending"}
                        tone={open.isCompleted ? "success" : "info"}
                      />
                    </div>
                  </div>
                  <div className="rounded-md border border-border bg-card/60 px-2.5 py-1.5">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Priority
                    </div>
                    <div className="mt-0.5">
                      <PriorityChip priority={open.priority} />
                    </div>
                  </div>
                  <div className="rounded-md border border-border bg-card/60 px-2.5 py-1.5 sm:col-span-2">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Due date
                    </div>
                    <div className="mt-0.5">
                      <DueDateBadge dueDate={open.dueDate} isCompleted={open.isCompleted} />
                    </div>
                  </div>
                </div>
              </SheetHeader>

              <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
                <DetailSection icon={<User className="size-4" />} title="Overview">
                  <DetailGrid>
                    <DetailRow label="Lead" value={open.leadName ?? open.leadId} />
                    <DetailRow label="Assigned to" value={open.assignedToName} />
                    <DetailRow
                      label="Due date"
                      value={new Date(open.dueDate).toLocaleDateString()}
                      icon={<Calendar className="size-3.5" />}
                    />
                    <DetailRow
                      label="Priority"
                      value={<span className="capitalize">{open.priority}</span>}
                      icon={<Flag className="size-3.5" />}
                    />
                  </DetailGrid>
                </DetailSection>

                {open.notes && (
                  <DetailSection icon={<StickyNote className="size-4" />} title="Notes">
                    <p className="whitespace-pre-wrap text-sm">{open.notes}</p>
                  </DetailSection>
                )}

                {open.isCompleted && (
                  <DetailSection icon={<CheckCircle2 className="size-4" />} title="Completion">
                    <DetailGrid>
                      <DetailRow
                        label="Completed by"
                        value={open.completedByName ?? open.completedBy ?? "—"}
                      />
                      <DetailRow
                        label="Completed"
                        value={open.completedAt ? relative(open.completedAt) : "—"}
                      />
                    </DetailGrid>
                  </DetailSection>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
