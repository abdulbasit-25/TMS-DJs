import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { fmtDate } from "@/lib/format";
import { ROLE_LABELS, type Role } from "@/lib/roles";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { exportRowsToFile, formatExportFilename } from "@/lib/export";
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
  MoreHorizontal,
  Shield,
  Users,
  AlertTriangle,
  X,
  Eye,
  UserCheck,
  UserCog,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/users")({
  component: UsersPage,
});

// ─── Types ───────────────────────────────────────────────────────────────────

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

// ─── Constants ───────────────────────────────────────────────────────────────

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

// ─── Helpers ────────────────────────────────────────────────────────────────

function getRoleLabel(role: string) {
  return ROLE_LABELS[role as Role] || role;
}

function roleAvatarStyle(role: string) {
  switch (role) {
    case "owner":
    case "admin":
      return "bg-rose-500 text-white";
    case "ops_manager":
      return "bg-orange-500 text-white";
    case "accounting":
      return "bg-violet-500 text-white";
    case "agent":
      return "bg-blue-500 text-white";
    case "dispatcher":
      return "bg-emerald-500 text-white";
    case "driver":
      return "bg-teal-500 text-white";
    default:
      return "bg-primary text-primary-foreground";
  }
}

function roleBadgeStyle(role: string) {
  switch (role) {
    case "owner":
    case "admin":
      return "bg-rose-500/10 text-rose-600 hover:bg-rose-500/15";
    case "ops_manager":
      return "bg-orange-500/10 text-orange-600 hover:bg-orange-500/15";
    case "accounting":
      return "bg-violet-500/10 text-violet-600 hover:bg-violet-500/15";
    case "agent":
      return "bg-blue-500/10 text-blue-600 hover:bg-blue-500/15";
    case "dispatcher":
      return "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/15";
    case "driver":
      return "bg-teal-500/10 text-teal-600 hover:bg-teal-500/15";
    default:
      return "";
  }
}

function getInitials(name?: string | null) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return parts.length > 1
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    : (parts[0]?.slice(0, 2)?.toUpperCase() ?? "?");
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return fmtDate(dateStr);
}

// ─── Shared Primitives ───────────────────────────────────────────────────────

function Avatar({
  name,
  role,
  size = "size-8",
}: {
  name?: string | null;
  role?: string;
  size?: string;
}) {
  return (
    <div
      className={`flex ${size} shrink-0 items-center justify-center rounded-full text-xs font-semibold ${role ? roleAvatarStyle(role) : "bg-primary text-primary-foreground"}`}
    >
      {getInitials(name)}
    </div>
  );
}

function DetailSection({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
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

function DetailGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2">{children}</div>;
}

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className={`mt-0.5 flex items-center gap-1.5 ${mono ? "font-mono text-xs" : "text-sm"}`}>
        {value ?? "—"}
      </div>
    </div>
  );
}

// ─── Form Fields (shared by create & edit) ───────────────────────────────────

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
    <div className="space-y-5">
      {/* Contact Info */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Users className="size-3.5" /> Contact Information
        </div>
        <div className="grid gap-3 rounded-lg border border-border/60 bg-muted/20 p-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">First Name</Label>
            <Input
              value={form.firstName}
              onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))}
              placeholder="John"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Last Name</Label>
            <Input
              value={form.lastName}
              onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))}
              placeholder="Smith"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Username</Label>
            <Input
              value={form.username}
              onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
              placeholder="jsmith"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Email *</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              placeholder="john@company.com"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs">Phone</Label>
            <Input
              value={form.phone}
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              placeholder="(555) 123-4567"
            />
          </div>
        </div>
      </div>

      {/* Role & Employment */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Shield className="size-3.5" /> Role & Employment
        </div>
        <div className="grid gap-3 rounded-lg border border-border/60 bg-muted/20 p-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Role *</Label>
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
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Status</Label>
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
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Team</Label>
            <Select
              value={form.teamId}
              onValueChange={(v) => setForm((p) => ({ ...p, teamId: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="No team" />
              </SelectTrigger>
              <SelectContent>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Employment Type</Label>
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
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Commission %</Label>
            <Input
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
              placeholder="0.00"
            />
          </div>
        </div>
      </div>

      {/* Security */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Lock className="size-3.5" /> Security
        </div>
        <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
          <div className="space-y-1.5">
            <Label className="text-xs">
              {mode === "create"
                ? "Temporary Password *"
                : "Temporary Password (leave blank to keep current)"}
            </Label>
            <Input
              type="text"
              value={form.temporaryPassword}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  temporaryPassword: e.target.value,
                }))
              }
              placeholder={mode === "create" ? "Welcome123!" : ""}
            />
            {mode === "create" && (
              <p className="text-[11px] text-muted-foreground">
                User will be prompted to change this on first login
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

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
  const [form, setForm] = useState<UserFormState>({ ...EMPTY_FORM });

  const open = items.find((item) => item.id === openId) ?? null;
  const canEditUsers = session ? ["owner", "admin", "ops_manager"].includes(session.role) : false;

  // ─── Computed ──────────────────────────────────────────────────────────

  const kpis = useMemo(() => {
    const total = items.length;
    const active = items.filter((u) => u.status === "active").length;
    const tempPw = items.filter((u) => u.isTemporaryPassword).length;
    const needsAttention = items.filter(
      (u) => u.status === "locked" || u.status === "suspended" || u.isTemporaryPassword,
    ).length;
    const now = new Date();
    const thisMonth = items.filter((u) => {
      if (!u.createdAt) return false;
      const d = new Date(u.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;

    // Role distribution
    const roleDist: Record<string, number> = {};
    for (const u of items) {
      roleDist[u.role] = (roleDist[u.role] || 0) + 1;
    }

    return { total, active, tempPw, needsAttention, thisMonth, roleDist };
  }, [items]);

  const hasActiveFilters = q !== "" || role !== "all" || status !== "all";

  // ─── Data Loading ──────────────────────────────────────────────────────

  const loadUsers = async () => {
    setLoading(true);
    try {
      const payload = await apiFetch<{
        users: UserRow[];
        total: number;
      }>(
        `/api/users?search=${encodeURIComponent(q)}&role=${encodeURIComponent(role === "all" ? "" : role)}&status=${encodeURIComponent(status === "all" ? "" : status)}`,
      );
      setItems(payload.data.users ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load users");
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
        const payload = await apiFetch<{ teams: TeamOption[] }>("/api/teams");
        setTeams(payload.data.teams ?? []);
      } catch {
        setTeams([]);
      }
    }
    void loadTeams();
  }, []);

  // ─── Handlers ──────────────────────────────────────────────────────────

  async function saveUser() {
    if (!form.email) {
      toast.error("Email is required");
      return;
    }
    if (!form.firstName || !form.lastName) {
      toast.error("First and last name are required");
      return;
    }
    setSaving(true);
    try {
      await apiFetch("/api/users", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          commissionPercentage: form.commissionPercentage
            ? parseFloat(form.commissionPercentage)
            : undefined,
        }),
      });
      toast.success("User created");
      setShowCreate(false);
      setForm({ ...EMPTY_FORM });
      await loadUsers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to create user");
    } finally {
      setSaving(false);
    }
  }

  async function updateUser(userId: string, updates: Partial<UserFormState>) {
    try {
      await apiFetch("/api/users", {
        method: "PATCH",
        body: JSON.stringify({
          userId,
          ...updates,
          commissionPercentage: updates.commissionPercentage
            ? parseFloat(updates.commissionPercentage)
            : undefined,
        }),
      });
      toast.success("User updated");
      await loadUsers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update user");
    }
  }

  async function saveEditedUser() {
    if (!editingUser) return;
    setSaving(true);
    try {
      await apiFetch("/api/users", {
        method: "PATCH",
        body: JSON.stringify({
          userId: editingUser.id,
          ...form,
          commissionPercentage: form.commissionPercentage
            ? parseFloat(form.commissionPercentage)
            : undefined,
        }),
      });
      toast.success("User updated");
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
        body: JSON.stringify({
          userId: id,
          temporaryPassword: "Welcome123!",
        }),
      });
      toast.success("Password reset to default — user will be prompted to change it");
      await loadUsers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Password reset failed");
    }
  }

  function exportUsers(format: "csv" | "xlsx") {
    const exported = exportRowsToFile(
      items,
      [
        { label: "Name", getValue: (u) => u.name },
        { label: "Username", getValue: (u) => u.username ?? "" },
        { label: "Email", getValue: (u) => u.email },
        { label: "Phone", getValue: (u) => u.phone ?? "" },
        { label: "Role", getValue: (u) => getRoleLabel(u.role) },
        { label: "Team", getValue: (u) => u.team ?? "" },
        { label: "Status", getValue: (u) => u.status },
        {
          label: "Employment Type",
          getValue: (u) => u.employmentType ?? "",
        },
        {
          label: "Commission %",
          getValue: (u) => u.commissionPercentage ?? "",
        },
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
    if (exported) toast.success(`Exported ${items.length} users`);
  }

  // ─── Render: KPI Cards ─────────────────────────────────────────────────

  const renderKpiCards = () => (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <div className="rounded-xl border border-border/50 bg-gradient-to-br from-card to-blue-500/5 p-4">
        <div className="flex items-center justify-between">
          <div className="flex size-9 items-center justify-center rounded-lg bg-blue-500/10">
            <Users className="size-4 text-blue-600" />
          </div>
          <span className="text-[10px] font-semibold text-muted-foreground">Total</span>
        </div>
        <div className="mt-3 text-2xl font-bold tracking-tight tabular-nums">{kpis.total}</div>
        <p className="mt-0.5 text-xs text-muted-foreground">Registered users</p>
      </div>

      <div className="rounded-xl border border-border/50 bg-gradient-to-br from-card to-emerald-500/5 p-4">
        <div className="flex items-center justify-between">
          <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/10">
            <UserCheck className="size-4 text-emerald-600" />
          </div>
          <Badge
            variant="secondary"
            className="bg-emerald-500/10 text-emerald-600 text-[10px] font-semibold"
          >
            {kpis.total > 0 ? Math.round((kpis.active / kpis.total) * 100) : 0}%
          </Badge>
        </div>
        <div className="mt-3 text-2xl font-bold tracking-tight tabular-nums text-emerald-600">
          {kpis.active}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">Active users</p>
      </div>

      <div className="rounded-xl border border-border/50 bg-gradient-to-br from-card to-red-500/5 p-4">
        <div className="flex items-center justify-between">
          <div className="flex size-9 items-center justify-center rounded-lg bg-red-500/10">
            <AlertTriangle className="size-4 text-red-600" />
          </div>
          {kpis.tempPw > 0 && (
            <Badge
              variant="secondary"
              className="bg-amber-500/10 text-amber-600 text-[10px] font-semibold"
            >
              {kpis.tempPw} temp pw
            </Badge>
          )}
        </div>
        <div className="mt-3 text-2xl font-bold tracking-tight tabular-nums text-red-600">
          {kpis.needsAttention}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">Needs attention</p>
      </div>

      <div className="rounded-xl border border-border/50 bg-gradient-to-br from-card to-violet-500/5 p-4">
        <div className="flex items-center justify-between">
          <div className="flex size-9 items-center justify-center rounded-lg bg-violet-500/10">
            <UserCog className="size-4 text-violet-600" />
          </div>
        </div>
        <div className="mt-3 text-2xl font-bold tracking-tight tabular-nums">{kpis.thisMonth}</div>
        <p className="mt-0.5 text-xs text-muted-foreground">Added this month</p>
        {/* Role breakdown */}
        {Object.keys(kpis.roleDist).length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {Object.entries(kpis.roleDist)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 4)
              .map(([r, count]) => (
                <span
                  key={r}
                  className="rounded-full bg-muted/50 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                >
                  {getRoleLabel(r)}: {count}
                </span>
              ))}
          </div>
        )}
      </div>
    </div>
  );

  // ─── Render: Filters ───────────────────────────────────────────────────

  const renderFilters = () => (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by name, email, or username..."
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
      <Select value={role} onValueChange={setRole}>
        <SelectTrigger className="w-full sm:w-[170px]">
          <Shield className="mr-2 size-3.5 text-muted-foreground" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Roles</SelectItem>
          {Object.entries(ROLE_LABELS).map(([key, value]) => (
            <SelectItem key={key} value={key}>
              {value}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={status} onValueChange={setStatus}>
        <SelectTrigger className="w-full sm:w-[170px]">
          <UserCheck className="mr-2 size-3.5 text-muted-foreground" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          {STATUS_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  // ─── Render: Row Actions ───────────────────────────────────────────────

  const RowActions = ({ user }: { user: UserRow }) => (
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
            setOpenId(user.id);
          }}
        >
          <Eye className="mr-2 size-4" /> View Details
        </DropdownMenuItem>
        {canEditUsers && (
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              startEdit(user);
            }}
          >
            <Edit2 className="mr-2 size-4" /> Edit User
          </DropdownMenuItem>
        )}
        {canEditUsers && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                void resetPassword(user.id);
              }}
            >
              <KeyRound className="mr-2 size-4" /> Reset Password
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <DropdownMenuItem
                  className="text-red-600 focus:text-red-600"
                  onSelect={(e) => e.preventDefault()}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Trash2 className="mr-2 size-4" /> Delete User
                </DropdownMenuItem>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete {user.name}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently remove this user and all associated data. This action
                    cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-red-600 text-white hover:bg-red-700"
                    onClick={() => void remove(user.id)}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // ─── Main Render ───────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      <PageHeader
        title="Users"
        description="Manage agents, managers, and admin access"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="mr-1.5 size-3.5" /> Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => exportUsers("csv")}>
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportUsers("xlsx")}>
                  Export as Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {canEditUsers && (
              <Button size="sm" onClick={() => setShowCreate(true)}>
                <Plus className="mr-1.5 size-4" /> New User
              </Button>
            )}
          </div>
        }
      />

      {/* KPI Cards */}
      {!loading && renderKpiCards()}

      {/* Filters */}
      {renderFilters()}

      {/* Results count */}
      {!loading && items.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Showing <span className="font-medium text-foreground">{items.length}</span>{" "}
          {items.length === 1 ? "user" : "users"}
          {hasActiveFilters && (
            <button
              onClick={() => {
                setSearchTerm("");
                setRole("all");
                setStatus("all");
              }}
              className="ml-1.5 text-primary hover:underline"
            >
              Clear filters
            </button>
          )}
        </p>
      )}

      {/* Content */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-xl border border-border/40 bg-card p-3"
            >
              <div className="size-9 shrink-0 animate-pulse rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-1/4 animate-pulse rounded bg-muted" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
              </div>
              <div className="flex gap-2">
                <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
                <div className="h-5 w-12 animate-pulse rounded-full bg-muted" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border/60 bg-card p-16">
          <div className="flex size-14 items-center justify-center rounded-full bg-muted/50">
            <UserX className="size-6 text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="font-medium">No users found</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {hasActiveFilters
                ? "Try adjusting your search or filters"
                : canEditUsers
                  ? "Create your first user to get started"
                  : "Users will appear here once they're added"}
            </p>
          </div>
          {hasActiveFilters ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSearchTerm("");
                setRole("all");
                setStatus("all");
              }}
            >
              Clear Filters
            </Button>
          ) : (
            canEditUsers && (
              <Button size="sm" onClick={() => setShowCreate(true)}>
                <Plus className="mr-1.5 size-4" /> New User
              </Button>
            )
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
          <DataTable
            rows={items}
            onRowClick={(user) => setOpenId(user.id)}
            columns={[
              {
                head: "User",
                cell: (user) => (
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar name={user.name} role={user.role} size="size-9" />
                      {user.isTemporaryPassword && (
                        <div className="absolute -bottom-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full border-2 border-card bg-amber-500">
                          <Lock className="size-2 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{user.name}</span>
                        {user.isTemporaryPassword && (
                          <span className="hidden shrink-0 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 sm:inline-flex">
                            Temp PW
                          </span>
                        )}
                      </div>
                      {user.username && (
                        <div className="text-xs text-muted-foreground truncate">
                          @{user.username}
                        </div>
                      )}
                    </div>
                  </div>
                ),
              },
              {
                head: "Role",
                cell: (user) => (
                  <Badge variant="secondary" className={`font-normal ${roleBadgeStyle(user.role)}`}>
                    {getRoleLabel(user.role)}
                  </Badge>
                ),
              },
              {
                head: "Team",
                cell: (user) => (
                  <span className="text-sm text-muted-foreground">{user.team || "—"}</span>
                ),
              },
              {
                head: "Status",
                cell: (user) => <StatusBadge value={user.status} />,
              },
              {
                head: "Commission",
                cell: (user) => (
                  <span className="font-mono text-sm tabular-nums">
                    {user.commissionPercentage != null ? `${user.commissionPercentage}%` : "—"}
                  </span>
                ),
              },
              {
                head: "Last Login",
                cell: (user) => (
                  <span
                    className="text-sm text-muted-foreground"
                    title={user.lastLogin ? fmtDate(user.lastLogin) : undefined}
                  >
                    {user.lastLogin ? relativeTime(user.lastLogin) : "Never"}
                  </span>
                ),
              },
              {
                head: "",
                cell: (user) => <RowActions user={user} />,
              },
            ]}
          />
        </div>
      )}

      {/* ── Detail Sheet ───────────────────────────────────────────────── */}
      <Sheet open={!!open} onOpenChange={(v) => !v && setOpenId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          {open && (
            <>
              <SheetHeader>
                <div className="flex items-start gap-3">
                  <div className="relative">
                    <Avatar name={open.name} role={open.role} size="size-12" />
                    {open.isTemporaryPassword && (
                      <div className="absolute -bottom-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full border-2 border-background bg-amber-500">
                        <Lock className="size-2.5 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <SheetTitle className="truncate">{open.name}</SheetTitle>
                    {open.username && (
                      <p className="text-sm text-muted-foreground">@{open.username}</p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <Badge
                        variant="secondary"
                        className={`font-normal ${roleBadgeStyle(open.role)}`}
                      >
                        {getRoleLabel(open.role)}
                      </Badge>
                      <StatusBadge value={open.status} />
                    </div>
                  </div>
                </div>

                {/* Action bar */}
                {canEditUsers && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => startEdit(open)}>
                      <Edit2 className="mr-1.5 size-3.5" /> Edit
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => void resetPassword(open.id)}>
                      <KeyRound className="mr-1.5 size-3.5" /> Reset PW
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-600"
                        >
                          <Trash2 className="mr-1.5 size-3.5" /> Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete {open.name}?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently remove this user and all associated data.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-red-600 text-white hover:bg-red-700"
                            onClick={() => void remove(open.id)}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}

                {/* Temp password warning */}
                {open.isTemporaryPassword && (
                  <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
                    <AlertTriangle className="size-4 shrink-0 text-amber-600" />
                    <span className="text-amber-700">
                      This user is signing in with a temporary password
                    </span>
                  </div>
                )}
              </SheetHeader>

              <div className="space-y-4 px-4 pb-6 pt-2">
                <DetailSection icon={<Users className="size-4" />} title="Contact Information">
                  <DetailGrid>
                    <DetailRow
                      label="Email"
                      value={
                        <span className="flex items-center gap-1.5 break-all">
                          <Mail className="size-3.5 shrink-0 text-muted-foreground" />
                          {open.email}
                        </span>
                      }
                    />
                    <DetailRow
                      label="Phone"
                      value={
                        <span className="flex items-center gap-1.5">
                          <PhoneIcon className="size-3.5 shrink-0 text-muted-foreground" />
                          {open.phone || "—"}
                        </span>
                      }
                    />
                  </DetailGrid>
                </DetailSection>

                <DetailSection icon={<Shield className="size-4" />} title="Role & Access">
                  <DetailGrid>
                    <DetailRow
                      label="Role"
                      value={
                        <Badge
                          variant="secondary"
                          className={`font-normal ${roleBadgeStyle(open.role)}`}
                        >
                          {getRoleLabel(open.role)}
                        </Badge>
                      }
                    />
                    <DetailRow label="Status" value={<StatusBadge value={open.status} />} />
                    <DetailRow
                      label="Team"
                      value={
                        <span className="flex items-center gap-1.5">
                          <Building2 className="size-3.5 shrink-0 text-muted-foreground" />
                          {open.team || "No team assigned"}
                        </span>
                      }
                    />
                    <DetailRow
                      label="Employment Type"
                      value={
                        open.employmentType
                          ? open.employmentType
                              .split("_")
                              .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                              .join("-")
                          : "—"
                      }
                    />
                    <DetailRow
                      label="Commission %"
                      value={
                        <span className="font-mono">
                          {open.commissionPercentage != null
                            ? `${open.commissionPercentage}%`
                            : "—"}
                        </span>
                      }
                    />
                  </DetailGrid>
                </DetailSection>

                {/* Quick role/status change */}
                {canEditUsers && (
                  <DetailSection icon={<UserCog className="size-4" />} title="Quick Update">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Change Role</Label>
                        <Select
                          value={open.role}
                          onValueChange={(v) => void updateUser(open.id, { role: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(ROLE_LABELS).map(([k, v]) => (
                              <SelectItem key={k} value={k}>
                                {v}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Change Status</Label>
                        <Select
                          value={open.status}
                          onValueChange={(v) => void updateUser(open.id, { status: v })}
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
                      </div>
                    </div>
                  </DetailSection>
                )}

                <DetailSection icon={<Clock className="size-4" />} title="Activity">
                  <DetailGrid>
                    <DetailRow
                      label="Last Login"
                      value={open.lastLogin ? fmtDate(open.lastLogin) : "Never logged in"}
                      mono
                    />
                    <DetailRow
                      label="Account State"
                      value={<span className="capitalize">{open.accountState || "normal"}</span>}
                    />
                    <DetailRow
                      label="Created"
                      value={open.createdAt ? fmtDate(open.createdAt) : "—"}
                      mono
                    />
                    <DetailRow
                      label="Last Updated"
                      value={open.updatedAt ? fmtDate(open.updatedAt) : "—"}
                      mono
                    />
                  </DetailGrid>
                </DetailSection>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Create Dialog ─────────────────────────────────────────────── */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create User</DialogTitle>
          </DialogHeader>
          <UserFormFields form={form} setForm={setForm} teams={teams} mode="create" />
          <DialogFooter className="border-t border-border/60 pt-4">
            <Button variant="outline" onClick={() => setShowCreate(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={() => void saveUser()} disabled={saving}>
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              <Save className="mr-1.5 size-4" />
              Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Dialog ───────────────────────────────────────────────── */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit User — {editingUser?.name}</DialogTitle>
          </DialogHeader>
          <UserFormFields form={form} setForm={setForm} teams={teams} mode="edit" />
          <DialogFooter className="border-t border-border/60 pt-4">
            <Button variant="outline" onClick={() => setShowEdit(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={() => void saveEditedUser()} disabled={saving}>
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              <Save className="mr-1.5 size-4" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
