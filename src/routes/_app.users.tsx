import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fmtDate } from "@/lib/format";
import { ROLE_LABELS, type Role } from "@/lib/roles";
import { apiFetch } from "@/lib/api-client";
import {
  Plus,
  Search,
  KeyRound,
  Trash2,
  Download,
  Save,
  Edit2,
  Lock,
  Loader2,
  UserX,
  Mail,
  Phone as PhoneIcon,
  Building2,
  Clock,
  Users,
  UserCheck,
  UserMinus,
  X,
  Shield,
  Briefcase,
  MoreHorizontal,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportRowsToFile, formatExportFilename } from "@/lib/export";
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
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export const Route = createFileRoute("/_app/users")({ component: UsersPage });

type UserRow = {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  email: string;
  phone?: string;
  role: string;
  team: string | null;
  teamId?: string | null;
  status: string;
  lastLogin: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  accountState: string;
  commissionPercentage?: number;
  employmentType?: string;
  isTemporaryPassword?: boolean;
};

type TeamOption = { id: string; name: string };

type UserFormState = {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  phone: string;
  role: string;
  teamId: string;
  status: string;
  temporaryPassword: string;
  commissionPercentage: string;
  employmentType: string;
};

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "suspended", label: "Suspended" },
  { value: "locked", label: "Locked" },
  { value: "pending", label: "Pending" },
  { value: "pending_invitation", label: "Pending Invitation" },
  { value: "on_leave", label: "On Leave" },
];

const EMPLOYMENT_TYPE_OPTIONS = [
  { value: "full-time", label: "Full-time" },
  { value: "part-time", label: "Part-time" },
  { value: "contractor", label: "Contractor" },
  { value: "intern", label: "Intern" },
];

const EMPTY_FORM: UserFormState = {
  firstName: "",
  lastName: "",
  username: "",
  email: "",
  phone: "",
  role: "agent",
  teamId: "",
  status: "active",
  temporaryPassword: "Welcome123!",
  commissionPercentage: "",
  employmentType: "",
};

/* ─── Gradient avatar helpers ─────────────────────────────────────── */

const AVATAR_GRADIENTS = [
  "from-violet-500 to-purple-600",
  "from-blue-500 to-cyan-500",
  "from-emerald-500 to-teal-600",
  "from-orange-500 to-amber-500",
  "from-rose-500 to-pink-600",
  "from-indigo-500 to-blue-600",
  "from-fuchsia-500 to-purple-500",
  "from-cyan-500 to-sky-500",
  "from-lime-500 to-green-600",
  "from-red-500 to-rose-500",
];

function nameToGradientIndex(name?: string | null): number {
  if (!name) return 0;
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % AVATAR_GRADIENTS.length;
}

function getInitials(name?: string | null) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const initials =
    parts.length > 1
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`
      : (parts[0]?.slice(0, 2) ?? "?");
  return initials.toUpperCase();
}

function Avatar({ name, size = "md" }: { name?: string | null; size?: "sm" | "md" | "lg" | "xl" }) {
  const sizeClasses = {
    sm: "size-7 text-[10px]",
    md: "size-9 text-xs",
    lg: "size-11 text-sm",
    xl: "size-14 text-base",
  };
  const gradient = AVATAR_GRADIENTS[nameToGradientIndex(name)];

  return (
    <div
      className={`${sizeClasses[size]} shrink-0 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center font-semibold text-white shadow-sm ring-2 ring-background`}
    >
      {getInitials(name)}
    </div>
  );
}

/* ─── Stat card ───────────────────────────────────────────────────── */

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-border/60 bg-card p-4 transition-all hover:shadow-md hover:border-border">
      <div className="flex items-center gap-3">
        <div
          className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${accent ?? "bg-muted"} text-muted-foreground transition-colors`}
        >
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <div className="text-2xl font-bold tabular-nums tracking-tight">{value}</div>
          <div className="truncate text-xs text-muted-foreground">{label}</div>
        </div>
      </div>
      {/* subtle decorative glow */}
      <div className="pointer-events-none absolute -right-4 -top-4 size-20 rounded-full bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
    </div>
  );
}

/* ─── Filter chip ─────────────────────────────────────────────────── */

function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-0.5 text-xs font-medium text-primary">
      {label}
      <button
        onClick={onClear}
        className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-primary/10"
      >
        <X className="size-3" />
      </button>
    </span>
  );
}

/* ─── Form field wrapper for consistent styling ───────────────────── */

function FieldGroup({
  label,
  htmlFor,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label htmlFor={htmlFor} className="text-xs font-medium">
        {label}
      </Label>
      {children}
    </div>
  );
}

/* ─── Shared form fields ──────────────────────────────────────────── */

function UserFormFields({
  form,
  setForm,
  teams,
  mode,
}: {
  form: UserFormState;
  setForm: React.Dispatch<React.SetStateAction<UserFormState>>;
  teams: TeamOption[];
  mode: "create" | "edit";
}) {
  return (
    <div className="space-y-6">
      {/* ── Contact ── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-md bg-blue-500/10">
            <Mail className="size-3.5 text-blue-600 dark:text-blue-400" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Contact information
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FieldGroup label="First name" htmlFor="firstName">
            <Input
              id="firstName"
              placeholder="John"
              value={form.firstName}
              onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))}
            />
          </FieldGroup>
          <FieldGroup label="Last name" htmlFor="lastName">
            <Input
              id="lastName"
              placeholder="Doe"
              value={form.lastName}
              onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))}
            />
          </FieldGroup>
          <FieldGroup label="Username" htmlFor="username">
            <Input
              id="username"
              placeholder="johndoe"
              value={form.username}
              onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
            />
          </FieldGroup>
          <FieldGroup label="Email" htmlFor="email">
            <Input
              id="email"
              type="email"
              placeholder="john@company.com"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            />
          </FieldGroup>
          <FieldGroup label="Phone" htmlFor="phone" className="sm:col-span-2">
            <Input
              id="phone"
              type="tel"
              placeholder="+1 (555) 000-0000"
              value={form.phone}
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              className="max-w-sm"
            />
          </FieldGroup>
        </div>
      </div>

      <Separator />

      {/* ── Role & Employment ── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-md bg-violet-500/10">
            <Briefcase className="size-3.5 text-violet-600 dark:text-violet-400" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Role & employment
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FieldGroup label="Role">
            <Select value={form.role} onValueChange={(v) => setForm((p) => ({ ...p, role: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ROLE_LABELS).map(([key, value]) => (
                  <SelectItem key={key} value={key}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldGroup>
          <FieldGroup label="Status">
            <Select
              value={form.status}
              onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldGroup>
          <FieldGroup label="Team">
            <Select
              value={form.teamId}
              onValueChange={(v) => setForm((p) => ({ ...p, teamId: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select team" />
              </SelectTrigger>
              <SelectContent>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldGroup>
          <FieldGroup label="Employment type">
            <Select
              value={form.employmentType}
              onValueChange={(v) => setForm((p) => ({ ...p, employmentType: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {EMPLOYMENT_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldGroup>
          <FieldGroup label="Commission %" htmlFor="commissionPercentage" className="sm:col-span-2">
            <Input
              id="commissionPercentage"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={form.commissionPercentage}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  commissionPercentage: e.target.value,
                }))
              }
              placeholder="0 – 100"
              className="max-w-[200px]"
            />
          </FieldGroup>
        </div>
      </div>

      <Separator />

      {/* ── Security ── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-md bg-amber-500/10">
            <Shield className="size-3.5 text-amber-600 dark:text-amber-400" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Security
          </span>
        </div>
        <FieldGroup
          label={
            mode === "create"
              ? "Temporary password"
              : "Temporary password (leave blank to keep current)"
          }
          htmlFor="temporaryPassword"
        >
          <Input
            id="temporaryPassword"
            type="text"
            value={form.temporaryPassword}
            onChange={(e) => setForm((p) => ({ ...p, temporaryPassword: e.target.value }))}
            className="max-w-sm font-mono text-sm"
          />
        </FieldGroup>
      </div>
    </div>
  );
}

/* ─── Detail sheet info row ───────────────────────────────────────── */

function InfoRow({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted/60">
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className={`mt-0.5 text-sm ${mono ? "font-mono text-xs" : ""}`}>{value || "—"}</div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */

function UsersPage() {
  const { session } = useAuth();
  const [items, setItems] = useState<UserRow[]>([]);
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [q, setQ] = useState("");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [form, setForm] = useState<UserFormState>(EMPTY_FORM);
  const open = items.find((item) => item.id === openId) ?? null;

  const canEditUsers = session ? ["owner", "admin", "ops_manager"].includes(session.role) : false;

  /* ── Stats ── */
  const stats = useMemo(() => {
    const total = items.length;
    const active = items.filter((u) => u.status === "active").length;
    const inactive = items.filter((u) => u.status === "inactive" || u.status === "on_leave").length;
    const pending = items.filter(
      (u) => u.status === "pending" || u.status === "pending_invitation",
    ).length;
    return { total, active, inactive, pending };
  }, [items]);

  /* ── Active filter chips ── */
  const activeFilters = useMemo(() => {
    const chips: { key: string; label: string; clear: () => void }[] = [];
    if (q) chips.push({ key: "q", label: `Search: "${q}"`, clear: () => setSearchTerm("") });
    if (role !== "all")
      chips.push({
        key: "role",
        label: `Role: ${ROLE_LABELS[role as Role] ?? role}`,
        clear: () => setRole("all"),
      });
    if (status !== "all") {
      const s = STATUS_OPTIONS.find((o) => o.value === status);
      chips.push({
        key: "status",
        label: `Status: ${s?.label ?? status}`,
        clear: () => setStatus("all"),
      });
    }
    return chips;
  }, [q, role, status]);

  const hasActiveFilters = activeFilters.length > 0;

  /* ── Data fetching ── */

  const loadUsers = async () => {
    setLoading(true);
    try {
      const payload = await apiFetch<{
        users: UserRow[];
        total: number;
        page: number;
        pageSize: number;
      }>(
        "/api/users?search=" +
          encodeURIComponent(q) +
          "&role=" +
          encodeURIComponent(role === "all" ? "" : role) +
          "&status=" +
          encodeURIComponent(status === "all" ? "" : status),
        { method: "GET" },
      );
      setItems(payload.data.users ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handle = setTimeout(() => setQ(searchTerm), 350);
    return () => clearTimeout(handle);
  }, [searchTerm]);

  useEffect(() => {
    void loadUsers();
  }, [q, role, status]);

  useEffect(() => {
    async function loadTeams() {
      try {
        const payload = await apiFetch<{ teams: TeamOption[] }>("/api/teams", {
          method: "GET",
        });
        setTeams(payload.data.teams ?? []);
      } catch {
        setTeams([]);
      }
    }
    void loadTeams();
  }, []);

  /* ── Mutations ── */

  async function saveUser() {
    setSaving(true);
    try {
      const body = {
        ...form,
        commissionPercentage: form.commissionPercentage
          ? parseFloat(form.commissionPercentage)
          : undefined,
      };
      await apiFetch("/api/users", {
        method: "POST",
        body: JSON.stringify(body),
      });
      toast.success("User created successfully");
      setShowCreate(false);
      setForm(EMPTY_FORM);
      await loadUsers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to create user");
    } finally {
      setSaving(false);
    }
  }

  async function updateUser(userId: string, updates: Partial<UserFormState>) {
    setSaving(true);
    try {
      const body = {
        ...updates,
        commissionPercentage: updates.commissionPercentage
          ? parseFloat(updates.commissionPercentage)
          : undefined,
      };
      await apiFetch("/api/users", {
        method: "PATCH",
        body: JSON.stringify({ userId, ...body }),
      });
      toast.success("User updated");
      await loadUsers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update user");
    } finally {
      setSaving(false);
    }
  }

  async function saveEditedUser() {
    if (!editingUser) return;
    setSaving(true);
    try {
      const body = {
        ...form,
        commissionPercentage: form.commissionPercentage
          ? parseFloat(form.commissionPercentage)
          : undefined,
      };
      await apiFetch("/api/users", {
        method: "PATCH",
        body: JSON.stringify({ userId: editingUser.id, ...body }),
      });
      toast.success("User updated successfully");
      setShowEdit(false);
      setEditingUser(null);
      await loadUsers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update user");
    } finally {
      setSaving(false);
    }
  }

  const startEdit = (user: UserRow) => {
    setEditingUser(user);
    setForm({
      firstName: user.firstName ?? "",
      lastName: user.lastName ?? "",
      username: user.username ?? "",
      email: user.email,
      phone: user.phone ?? "",
      role: user.role,
      teamId: user.teamId ?? "",
      status: user.status,
      temporaryPassword: "",
      commissionPercentage: user.commissionPercentage?.toString() ?? "",
      employmentType: user.employmentType ?? "",
    });
    setShowEdit(true);
  };

  async function remove(id: string) {
    setSaving(true);
    try {
      await apiFetch("/api/users", {
        method: "DELETE",
        body: JSON.stringify({ userId: id }),
      });
      toast.success("User deleted");
      setOpenId(null);
      await loadUsers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete user");
    } finally {
      setSaving(false);
    }
  }

  async function resetPassword(id: string) {
    try {
      await apiFetch("/api/users", {
        method: "PATCH",
        body: JSON.stringify({ userId: id, temporaryPassword: "Welcome123!" }),
      });
      toast.success("Password has been reset");
      await loadUsers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Password reset failed");
    }
  }

  function exportUsers(format: "csv" | "xlsx") {
    const rows = items;
    const exported = exportRowsToFile(
      rows,
      [
        { label: "Name", getValue: (u) => u.name },
        { label: "Email", getValue: (u) => u.email },
        { label: "Role", getValue: (u) => ROLE_LABELS[u.role as Role] ?? u.role },
        { label: "Commission %", getValue: (u) => u.commissionPercentage ?? "" },
        { label: "Employment Type", getValue: (u) => u.employmentType ?? "" },
        { label: "Team", getValue: (u) => u.team ?? "" },
        { label: "Status", getValue: (u) => u.status },
        {
          label: "Last Login",
          getValue: (u) => (u.lastLogin ? fmtDate(u.lastLogin) : ""),
        },
        {
          label: "Created",
          getValue: (u) => (u.createdAt ? fmtDate(u.createdAt) : ""),
        },
      ],
      formatExportFilename("users", format),
      format,
      "Users",
    );
    if (exported) toast.success("Users exported");
  }

  /* ═══════════════════════════════════════════════════════════════════ */

  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-6">
        {/* ── Header ── */}
        <PageHeader
          title="Users"
          description="Manage agents, managers, and admin access."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Download className="size-3.5" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => exportUsers("csv")}>
                    Export as CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportUsers("xlsx")}>
                    Export as XLSX
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {canEditUsers && (
                <Button size="sm" className="gap-1.5 shadow-sm" onClick={() => setShowCreate(true)}>
                  <Plus className="size-3.5" />
                  New user
                </Button>
              )}
            </div>
          }
        />

        {/* ── Stats ── */}
        {!loading && items.length > 0 && (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              icon={Users}
              label="Total users"
              value={stats.total}
              accent="bg-primary/10 text-primary"
            />
            <StatCard
              icon={UserCheck}
              label="Active"
              value={stats.active}
              accent="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            />
            <StatCard
              icon={UserMinus}
              label="Inactive / On leave"
              value={stats.inactive}
              accent="bg-amber-500/10 text-amber-600 dark:text-amber-400"
            />
            <StatCard
              icon={Clock}
              label="Pending"
              value={stats.pending}
              accent="bg-blue-500/10 text-blue-600 dark:text-blue-400"
            />
          </div>
        )}

        {/* ── Filters ── */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/70" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, email, or username…"
                className="pl-9 h-9 bg-background"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-muted-foreground/60 transition-colors hover:text-muted-foreground"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="w-full sm:w-48 h-9">
                <SelectValue placeholder="All roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                {Object.entries(ROLE_LABELS).map(([key, value]) => (
                  <SelectItem key={key} value={key}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-full sm:w-48 h-9">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Active filter chips */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-muted-foreground mr-1">Active filters:</span>
              {activeFilters.map((chip) => (
                <FilterChip key={chip.key} label={chip.label} onClear={chip.clear} />
              ))}
              <button
                onClick={() => {
                  setSearchTerm("");
                  setRole("all");
                  setStatus("all");
                }}
                className="ml-1 text-xs text-muted-foreground underline-offset-2 hover:underline"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* ── Table area ── */}
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 rounded-lg border border-border/50 bg-card p-3.5"
              >
                <div className="size-9 shrink-0 animate-pulse rounded-full bg-muted/80" />
                <div className="flex-1 space-y-2.5">
                  <div className="h-3.5 w-32 animate-pulse rounded-md bg-muted/80" />
                  <div className="h-3 w-48 animate-pulse rounded-md bg-muted/60" />
                </div>
                <div className="h-6 w-20 animate-pulse rounded-full bg-muted/70" />
                <div className="h-3 w-16 animate-pulse rounded bg-muted/50" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-gradient-to-b from-card to-card/50 px-6 py-16 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-muted/60">
              <UserX className="size-7 text-muted-foreground/70" />
            </div>
            <div className="mt-4">
              <div className="text-sm font-semibold">
                {hasActiveFilters ? "No matching users" : "No users yet"}
              </div>
              <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-muted-foreground">
                {hasActiveFilters
                  ? "Try adjusting your search terms or clearing the active filters above."
                  : canEditUsers
                    ? "Get started by inviting your first team member."
                    : "Users will appear here once they've been added to the workspace."}
              </p>
            </div>
            {hasActiveFilters ? (
              <Button
                size="sm"
                variant="outline"
                className="mt-5"
                onClick={() => {
                  setSearchTerm("");
                  setRole("all");
                  setStatus("all");
                }}
              >
                Clear filters
              </Button>
            ) : canEditUsers ? (
              <Button
                size="sm"
                className="mt-5 gap-1.5 shadow-sm"
                onClick={() => setShowCreate(true)}
              >
                <Plus className="size-3.5" />
                New user
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border/60 bg-card shadow-sm">
            <DataTable
              rows={items}
              onRowClick={(user) => setOpenId(user.id)}
              columns={[
                {
                  head: "User",
                  cell: (user) => (
                    <div className="flex items-center gap-3">
                      <Avatar name={user.name} size="sm" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate font-medium text-sm">{user.name}</span>
                          {user.isTemporaryPassword && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Lock className="size-3 shrink-0 text-amber-500" />
                              </TooltipTrigger>
                              <TooltipContent>Temporary password active</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">{user.email}</div>
                      </div>
                    </div>
                  ),
                },
                {
                  head: "Role",
                  cell: (user) => (
                    <Badge variant="secondary" className="font-normal text-xs">
                      {ROLE_LABELS[user.role as Role]}
                    </Badge>
                  ),
                },
                {
                  head: "Commission",
                  cell: (user) => (
                    <span className="tabular-nums text-sm">
                      {user.commissionPercentage != null ? `${user.commissionPercentage}%` : "—"}
                    </span>
                  ),
                },
                {
                  head: "Employment",
                  cell: (user) => (
                    <span className="text-sm text-muted-foreground">
                      {user.employmentType
                        ? user.employmentType
                            .split("-")
                            .map((w) => w[0].toUpperCase() + w.slice(1))
                            .join("-")
                        : "—"}
                    </span>
                  ),
                },
                {
                  head: "Team",
                  cell: (user) => (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      {user.team ? (
                        <>
                          <Building2 className="size-3 shrink-0" />
                          <span className="truncate">{user.team}</span>
                        </>
                      ) : (
                        "—"
                      )}
                    </div>
                  ),
                },
                {
                  head: "Status",
                  cell: (user) => <StatusBadge value={user.status} />,
                },
                {
                  head: "Last login",
                  cell: (user) => (
                    <span className="whitespace-nowrap text-xs text-muted-foreground">
                      {user.lastLogin ? fmtDate(user.lastLogin) : "—"}
                    </span>
                  ),
                },
                {
                  head: "",
                  className: "w-10",
                  cell: (user) =>
                    canEditUsers ? (
                      <div className="flex items-center gap-0.5">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenId(user.id);
                              }}
                            >
                              <Eye className="size-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>View details</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7"
                              onClick={(e) => {
                                e.stopPropagation();
                                startEdit(user);
                              }}
                            >
                              <Edit2 className="size-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit user</TooltipContent>
                        </Tooltip>
                      </div>
                    ) : (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenId(user.id);
                            }}
                          >
                            <Eye className="size-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>View details</TooltipContent>
                      </Tooltip>
                    ),
                },
              ]}
            />
          </div>
        )}

        {/* ── Result count ── */}
        {!loading && items.length > 0 && (
          <p className="text-xs text-muted-foreground tabular-nums">
            Showing {items.length} {items.length === 1 ? "user" : "users"}
          </p>
        )}

        {/* ══════════ Detail Sheet ══════════ */}
        <Sheet open={!!open} onOpenChange={(v) => !v && setOpenId(null)}>
          <SheetContent className="w-full overflow-y-auto sm:max-w-md">
            {open && (
              <>
                <SheetHeader className="space-y-4 pb-2">
                  <div className="flex items-center gap-4">
                    <Avatar name={open.name} size="xl" />
                    <div className="min-w-0 flex-1">
                      <SheetTitle className="text-lg leading-tight">{open.name}</SheetTitle>
                      {open.username && (
                        <div className="mt-0.5 text-xs text-muted-foreground">@{open.username}</div>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <Badge variant="secondary" className="text-xs">
                          {ROLE_LABELS[open.role as Role]}
                        </Badge>
                        <StatusBadge value={open.status} />
                        {open.isTemporaryPassword && (
                          <Badge
                            variant="outline"
                            className="gap-1 border-amber-300/50 text-amber-600 dark:border-amber-500/30 dark:text-amber-400"
                          >
                            <Lock className="size-3" />
                            Temp password
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </SheetHeader>

                <Separator className="my-4" />

                <div className="space-y-1 px-1">
                  <InfoRow
                    icon={Mail}
                    label="Email"
                    value={
                      <a
                        href={`mailto:${open.email}`}
                        className="text-primary underline-offset-2 hover:underline"
                      >
                        {open.email}
                      </a>
                    }
                    mono
                  />
                  <InfoRow icon={PhoneIcon} label="Phone" value={open.phone} />
                  <InfoRow icon={Building2} label="Team" value={open.team} />
                  <InfoRow
                    icon={Briefcase}
                    label="Employment type"
                    value={
                      open.employmentType
                        ? open.employmentType
                            .split("-")
                            .map((w) => w[0].toUpperCase() + w.slice(1))
                            .join("-")
                        : undefined
                    }
                  />
                  <InfoRow
                    icon={Clock}
                    label="Last login"
                    value={open.lastLogin ? fmtDate(open.lastLogin) : undefined}
                  />
                  <InfoRow
                    icon={Clock}
                    label="Created"
                    value={open.createdAt ? fmtDate(open.createdAt) : undefined}
                  />
                  <InfoRow
                    icon={Users}
                    label="Commission %"
                    value={
                      open.commissionPercentage != null
                        ? `${open.commissionPercentage}%`
                        : undefined
                    }
                  />
                </div>

                {/* ── Quick-edit role/status ── */}
                {canEditUsers && (
                  <>
                    <Separator className="my-4" />
                    <div className="space-y-4 px-1">
                      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Quick edit
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <FieldGroup label="Role">
                          <Select
                            value={open.role}
                            onValueChange={(v) => void updateUser(open.id, { role: v })}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(ROLE_LABELS).map(([key, value]) => (
                                <SelectItem key={key} value={key}>
                                  {value}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FieldGroup>
                        <FieldGroup label="Status">
                          <Select
                            value={open.status}
                            onValueChange={(v) => void updateUser(open.id, { status: v })}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {STATUS_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FieldGroup>
                      </div>
                    </div>
                  </>
                )}

                {/* ── Actions ── */}
                {canEditUsers && (
                  <>
                    <Separator className="my-4" />
                    <div className="flex flex-col gap-2 px-1 pb-4">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start gap-2"
                        onClick={() => {
                          setOpenId(null);
                          startEdit(open);
                        }}
                      >
                        <Edit2 className="size-3.5" />
                        Edit full profile
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start gap-2"
                        onClick={() => void resetPassword(open.id)}
                      >
                        <KeyRound className="size-3.5" />
                        Reset password
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full justify-start gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="size-3.5" />
                            Delete user
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete "{open.name}"?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently remove the user record from the database. This
                              action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => void remove(open.id)}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </>
                )}
              </>
            )}
          </SheetContent>
        </Sheet>

        {/* ══════════ Create Sheet ══════════ */}
        <Sheet open={showCreate} onOpenChange={setShowCreate}>
          <SheetContent className="flex w-full flex-col overflow-hidden p-0 sm:max-w-2xl">
            <SheetHeader className="sticky top-0 z-10 border-b border-border bg-background/95 px-6 py-4 text-left backdrop-blur">
              <SheetTitle className="text-lg">Create new user</SheetTitle>
              <p className="text-sm text-muted-foreground">
                Add a new team member. They'll receive a temporary password to log in for the first
                time.
              </p>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <UserFormFields form={form} setForm={setForm} teams={teams} mode="create" />
            </div>
            <div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-border bg-background/95 px-6 py-4 backdrop-blur sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => setShowCreate(false)}
              >
                Cancel
              </Button>
              <Button
                className="w-full gap-1.5 shadow-sm sm:w-auto"
                onClick={() => void saveUser()}
                disabled={saving}
              >
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                {saving ? "Creating…" : "Create user"}
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        {/* ══════════ Edit Sheet ══════════ */}
        <Sheet open={showEdit} onOpenChange={setShowEdit}>
          <SheetContent className="flex w-full flex-col overflow-hidden p-0 sm:max-w-2xl">
            <SheetHeader className="sticky top-0 z-10 border-b border-border bg-background/95 px-6 py-4 text-left backdrop-blur">
              <SheetTitle className="text-lg">Edit user</SheetTitle>
              <p className="text-sm text-muted-foreground">
                Update the profile and settings for{" "}
                <span className="font-medium text-foreground">{editingUser?.name}</span>.
              </p>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <UserFormFields form={form} setForm={setForm} teams={teams} mode="edit" />
            </div>
            <div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-border bg-background/95 px-6 py-4 backdrop-blur sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => setShowEdit(false)}
              >
                Cancel
              </Button>
              <Button
                className="w-full gap-1.5 shadow-sm sm:w-auto"
                onClick={() => void saveEditedUser()}
                disabled={saving}
              >
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </TooltipProvider>
  );
}
