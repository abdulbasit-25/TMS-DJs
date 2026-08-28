import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { StatusBadge } from "@/components/status-badge";
import { apiFetch } from "@/lib/api-client";
import { fmtDate } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/roles";
import {
  Plus,
  Save,
  Trash2,
  Edit2,
  Users,
  UsersRound,
  Loader2,
  Download,
  Eye,
  UserCircle,
  ShieldAlert,
  Crown,
  Building2,
  Clock,
  Mail,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportRowsToFile, formatExportFilename } from "@/lib/export";
import { useAuth } from "@/lib/auth-context";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export const Route = createFileRoute("/_app/teams")({ component: TeamsPage });

/* ─── Types ───────────────────────────────────────────────────────── */

type TeamMember = {
  id: string;
  name: string;
  role: string;
  status: string;
  email: string;
};

type Team = {
  id: string;
  name: string;
  managerId: string | null;
  managerName: string | null;
  manager: TeamMember | null;
  memberIds: string[];
  members: TeamMember[];
  memberNames: string[];
  totalMembers: number;
  createdAt: string | null;
};

type UserOption = {
  id: string;
  name: string;
  role: string;
  status: string;
};

type TeamFormState = {
  name: string;
  managerId: string;
};

/* ─── Constants ───────────────────────────────────────────────────── */

const ROLE_HIERARCHY = ["owner", "admin", "ops_manager", "team_manager", "agent", "trainee"];
const TEAM_MANAGER_INDEX = ROLE_HIERARCHY.indexOf("team_manager");

const getRoleIndex = (role: string) => {
  const idx = ROLE_HIERARCHY.indexOf(role);
  return idx === -1 ? ROLE_HIERARCHY.length : idx;
};

const requiresPromotion = (currentRole: string) => getRoleIndex(currentRole) > TEAM_MANAGER_INDEX;

/* ─── Avatar (deterministic gradient) ─────────────────────────────── */

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
  return parts.length > 1
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    : (parts[0]?.slice(0, 2).toUpperCase() ?? "?");
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
      <div className="pointer-events-none absolute -right-4 -top-4 size-20 rounded-full bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
    </div>
  );
}

/* ─── Info row (detail sheet) ─────────────────────────────────────── */

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

/* ─── Field group (forms) ─────────────────────────────────────────── */

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

/* ═══════════════════════════════════════════════════════════════════ */

function TeamsPage() {
  const { session } = useAuth();
  const [items, setItems] = useState<Team[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => Promise<void>) | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<TeamFormState>({
    name: "",
    managerId: "",
  });

  const canEditTeams = session ? ["owner", "admin", "ops_manager"].includes(session.role) : false;
  const activeUsers = users.filter((u) => u.status === "active");

  /* ── Stats ── */
  const stats = useMemo(() => {
    const total = items.length;
    const withManager = items.filter((t) => t.managerId).length;
    const totalMembers = items.reduce((sum, t) => sum + t.totalMembers, 0);
    const withoutManager = total - withManager;
    return { total, withManager, totalMembers, withoutManager };
  }, [items]);

  /* ── Data fetching ── */

  const loadTeams = async () => {
    setLoading(true);
    try {
      const payload = await apiFetch<{ teams: Team[] }>("/api/teams", {
        method: "GET",
      });
      setItems(payload.data.teams ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load teams");
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const payload = await apiFetch<{
        users: Array<{ id: string; name: string; role: string; status: string }>;
      }>("/api/users", { method: "GET" });
      setUsers(payload.data.users ?? []);
    } catch {
      setUsers([]);
    }
  };

  useEffect(() => {
    loadTeams();
    loadUsers();
  }, []);

  /* ── Mutations ── */

  const executeTeamAction = async (action: () => Promise<void>) => {
    setSaving(true);
    try {
      await action();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action failed");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    const selectedUser = users.find((u) => u.id === form.managerId);

    if (selectedUser && requiresPromotion(selectedUser.role)) {
      setPendingAction(async () => {
        await apiFetch("/api/users", {
          method: "PATCH",
          body: JSON.stringify({
            userId: selectedUser.id,
            role: "team_manager",
          }),
        });

        if (showCreate) {
          await apiFetch("/api/teams", {
            method: "POST",
            body: JSON.stringify(form),
          });
          toast.success("Team created and user promoted to Team Manager");
          setShowCreate(false);
        } else if (editingTeam) {
          await apiFetch("/api/teams", {
            method: "PATCH",
            body: JSON.stringify({ teamId: editingTeam.id, ...form }),
          });
          toast.success("Team updated and user promoted to Team Manager");
          setShowEdit(false);
          setEditingTeam(null);
        }

        resetForm();
        await loadTeams();
        await loadUsers();
      });
      setShowConfirm(true);
    } else {
      await executeTeamAction(async () => {
        if (showCreate) {
          await apiFetch("/api/teams", {
            method: "POST",
            body: JSON.stringify(form),
          });
          toast.success("Team created successfully");
          setShowCreate(false);
        } else if (editingTeam) {
          await apiFetch("/api/teams", {
            method: "PATCH",
            body: JSON.stringify({ teamId: editingTeam.id, ...form }),
          });
          toast.success("Team updated successfully");
          setShowEdit(false);
          setEditingTeam(null);
        }
        resetForm();
        await loadTeams();
        await loadUsers();
      });
    }
  };

  const deleteTeam = async (teamId: string) => {
    await executeTeamAction(async () => {
      await apiFetch("/api/teams", {
        method: "DELETE",
        body: JSON.stringify({ teamId }),
      });
      toast.success("Team deleted");
      await loadTeams();
    });
  };

  const resetForm = () => {
    setForm({ name: "", managerId: "" });
    setShowConfirm(false);
    setPendingAction(null);
  };

  const startEdit = (team: Team) => {
    setEditingTeam(team);
    setForm({
      name: team.name,
      managerId: team.managerId ?? "",
    });
    setShowEdit(true);
  };

  const openTeamDetails = async (team: Team) => {
    try {
      const payload = await apiFetch<{ team: Team }>(
        `/api/teams?id=${encodeURIComponent(team.id)}`,
        { method: "GET" },
      );
      setSelectedTeam(payload.data.team);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load team details");
    }
  };

  function exportTeams(format: "csv" | "xlsx") {
    const exported = exportRowsToFile(
      items,
      [
        { label: "Name", getValue: (t) => t.name },
        { label: "Manager", getValue: (t) => t.managerName ?? "" },
        { label: "Members", getValue: (t) => t.totalMembers },
        {
          label: "Created",
          getValue: (t) => (t.createdAt ? fmtDate(t.createdAt) : ""),
        },
      ],
      formatExportFilename("teams", format),
      format,
      "Teams",
    );
    if (exported) toast.success("Teams exported");
  }

  const getConfirmationMessage = () => {
    const selectedUser = users.find((u) => u.id === form.managerId);
    if (!selectedUser) return "";
    const userRoleLabel =
      ROLE_LABELS[selectedUser.role as keyof typeof ROLE_LABELS] || selectedUser.role;
    return `The selected user currently has the "${userRoleLabel}" role. Managing a team requires at least the Team Manager role. Would you like to promote this user to Team Manager and continue?`;
  };

  const selectedManagerUser = users.find((u) => u.id === form.managerId);
  const willPromote = selectedManagerUser && requiresPromotion(selectedManagerUser.role);

  /* ═══════════════════════════════════════════════════════════════════ */

  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-6">
        {/* ── Header ── */}
        <PageHeader
          title="Teams"
          description="Coordinate managers and assigned users across your organization."
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
                  <DropdownMenuItem onClick={() => exportTeams("csv")}>
                    Export as CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportTeams("xlsx")}>
                    Export as XLSX
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {canEditTeams && (
                <Button
                  size="sm"
                  className="gap-1.5 shadow-sm"
                  onClick={() => {
                    resetForm();
                    setShowCreate(true);
                  }}
                >
                  <Plus className="size-3.5" />
                  New team
                </Button>
              )}
            </div>
          }
        />

        {/* ── Stats ── */}
        {!loading && items.length > 0 && (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              icon={Building2}
              label="Total teams"
              value={stats.total}
              accent="bg-primary/10 text-primary"
            />
            <StatCard
              icon={Crown}
              label="With manager"
              value={stats.withManager}
              accent="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            />
            <StatCard
              icon={UserCircle}
              label="Needs manager"
              value={stats.withoutManager}
              accent="bg-amber-500/10 text-amber-600 dark:text-amber-400"
            />
            <StatCard
              icon={Users}
              label="Total members"
              value={stats.totalMembers}
              accent="bg-blue-500/10 text-blue-600 dark:text-blue-400"
            />
          </div>
        )}

        {/* ── Loading ── */}
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 rounded-lg border border-border/50 bg-card p-3.5"
              >
                <div className="size-9 shrink-0 animate-pulse rounded-lg bg-muted/80" />
                <div className="flex-1 space-y-2.5">
                  <div className="h-3.5 w-36 animate-pulse rounded-md bg-muted/80" />
                  <div className="h-3 w-48 animate-pulse rounded-md bg-muted/60" />
                </div>
                <div className="h-5 w-12 animate-pulse rounded-full bg-muted/70" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          /* ── Empty state ── */
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-gradient-to-b from-card to-card/50 px-6 py-16 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-muted/60">
              <UsersRound className="size-7 text-muted-foreground/70" />
            </div>
            <div className="mt-4">
              <div className="text-sm font-semibold">No teams yet</div>
              <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-muted-foreground">
                {canEditTeams
                  ? "Create your first team to start organizing managers and their assigned members."
                  : "Teams will appear here once they've been created by an admin."}
              </p>
            </div>
            {canEditTeams && (
              <Button
                size="sm"
                className="mt-5 gap-1.5 shadow-sm"
                onClick={() => {
                  resetForm();
                  setShowCreate(true);
                }}
              >
                <Plus className="size-3.5" />
                New team
              </Button>
            )}
          </div>
        ) : (
          /* ── Table ── */
          <div className="overflow-x-auto rounded-xl border border-border/60 bg-card shadow-sm">
            <DataTable
              rows={items}
              onRowClick={(team) => openTeamDetails(team)}
              columns={[
                {
                  head: "Team",
                  cell: (team) => (
                    <div className="flex items-center gap-3 min-w-[200px]">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/10 to-primary/5">
                        <Building2 className="size-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <span className="font-medium text-sm">{team.name}</span>
                        {!team.managerId && (
                          <div className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400">
                            <AlertTriangle className="size-3" />
                            No manager assigned
                          </div>
                        )}
                      </div>
                    </div>
                  ),
                },
                {
                  head: "Manager",
                  cell: (team) =>
                    team.managerName ? (
                      <div className="flex items-center gap-2">
                        <Avatar name={team.managerName} size="sm" />
                        <span className="text-sm">{team.managerName}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground/60">Unassigned</span>
                    ),
                },
                {
                  head: "Members",
                  cell: (team) => (
                    <div className="flex items-center gap-2">
                      {/* Stack up to 3 mini avatars */}
                      <div className="flex -space-x-1.5">
                        {team.members.slice(0, 3).map((m) => (
                          <div
                            key={m.id}
                            className={`size-6 rounded-full bg-gradient-to-br ${AVATAR_GRADIENTS[nameToGradientIndex(m.name)]} ring-2 ring-card flex items-center justify-center text-[8px] font-semibold text-white`}
                          >
                            {getInitials(m.name)}
                          </div>
                        ))}
                        {team.totalMembers > 3 && (
                          <div className="flex size-6 items-center justify-center rounded-full bg-muted ring-2 ring-card text-[9px] font-medium text-muted-foreground">
                            +{team.totalMembers - 3}
                          </div>
                        )}
                      </div>
                      <span className="tabular-nums text-sm text-muted-foreground">
                        {team.totalMembers}
                      </span>
                    </div>
                  ),
                },
                {
                  head: "Created",
                  cell: (team) => (
                    <span className="whitespace-nowrap text-xs text-muted-foreground">
                      {team.createdAt ? fmtDate(team.createdAt) : "—"}
                    </span>
                  ),
                },
                {
                  head: "",
                  className: "w-10",
                  cell: (team) =>
                    canEditTeams ? (
                      <div
                        className="flex items-center gap-0.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7"
                              onClick={() => openTeamDetails(team)}
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
                              onClick={() => startEdit(team)}
                            >
                              <Edit2 className="size-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit team</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-7 text-muted-foreground hover:text-destructive"
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete "{team.name}"?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete the team and remove all member
                                    assignments. This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={() => void deleteTeam(team.id)}
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TooltipTrigger>
                          <TooltipContent>Delete team</TooltipContent>
                        </Tooltip>
                      </div>
                    ) : (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            onClick={() => openTeamDetails(team)}
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
            Showing {items.length} {items.length === 1 ? "team" : "teams"}
          </p>
        )}

        {/* ══════════ Create / Edit Dialog ══════════ */}
        <Dialog
          open={showCreate || showEdit}
          onOpenChange={(open) => {
            if (!open) {
              setShowCreate(false);
              setShowEdit(false);
              setEditingTeam(null);
              resetForm();
            }
          }}
        >
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-lg">
                {showCreate ? "Create new team" : "Edit team"}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                {showCreate
                  ? "Set up a team with a name and assign a manager to lead it."
                  : `Update the configuration for "${editingTeam?.name}".`}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 py-2">
              {/* Team name */}
              <FieldGroup label="Team name" htmlFor="team-name">
                <Input
                  id="team-name"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Midwest Operations"
                  className="h-9"
                />
              </FieldGroup>

              <Separator />

              {/* Manager selection */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-md bg-violet-500/10">
                    <Crown className="size-3.5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Manager assignment
                  </span>
                </div>
                <FieldGroup label="Assign manager" htmlFor="team-manager">
                  <Select
                    value={form.managerId}
                    onValueChange={(v) => setForm((p) => ({ ...p, managerId: v }))}
                  >
                    <SelectTrigger id="team-manager" className="h-9">
                      <SelectValue placeholder="Select a manager" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeUsers.length === 0 ? (
                        <div className="px-2 py-3 text-center text-xs text-muted-foreground">
                          No active users available
                        </div>
                      ) : (
                        activeUsers.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            <div className="flex items-center gap-2">
                              <span>{user.name}</span>
                              <Badge variant="secondary" className="ml-1 text-[10px] font-normal">
                                {ROLE_LABELS[user.role as keyof typeof ROLE_LABELS] || user.role}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </FieldGroup>

                {/* Promotion warning */}
                {willPromote && (
                  <div className="flex items-start gap-3 rounded-lg border border-amber-300/40 bg-amber-50 p-3 dark:border-amber-500/20 dark:bg-amber-950/30">
                    <ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                    <div className="space-y-1">
                      <div className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                        Role promotion required
                      </div>
                      <p className="text-[11px] leading-relaxed text-amber-700 dark:text-amber-400/80">
                        <span className="font-medium">{selectedManagerUser?.name}</span> currently
                        has the "
                        {ROLE_LABELS[selectedManagerUser?.role as keyof typeof ROLE_LABELS] ||
                          selectedManagerUser?.role}
                        " role and will be automatically promoted to{" "}
                        <span className="font-medium">Team Manager</span> on save.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="flex-col-reverse gap-2 pt-2 sm:flex-row">
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => {
                  setShowCreate(false);
                  setShowEdit(false);
                  setEditingTeam(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                className="w-full gap-1.5 shadow-sm sm:w-auto"
                onClick={() => void handleSubmit()}
                disabled={saving || !form.name.trim()}
              >
                {saving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : showCreate ? (
                  <Plus className="size-4" />
                ) : (
                  <Save className="size-4" />
                )}
                {saving ? "Saving…" : showCreate ? "Create team" : "Save changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ══════════ Promotion Confirmation Dialog ══════════ */}
        <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-950/50">
                  <ShieldAlert className="size-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <AlertDialogTitle>Promote to Team Manager?</AlertDialogTitle>
                </div>
              </div>
              <AlertDialogDescription className="pl-[52px]">
                {getConfirmationMessage()}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col-reverse gap-2 sm:flex-row">
              <AlertDialogCancel onClick={() => setShowConfirm(false)}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (pendingAction) void pendingAction();
                }}
              >
                Yes, promote and continue
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* ══════════ Team Details Sheet ══════════ */}
        <Sheet open={!!selectedTeam} onOpenChange={(v) => !v && setSelectedTeam(null)}>
          <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
            {selectedTeam && (
              <>
                <SheetHeader className="space-y-4 pb-2">
                  <div className="flex items-center gap-4">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5">
                      <Building2 className="size-6 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <SheetTitle className="text-lg leading-tight">{selectedTeam.name}</SheetTitle>
                      <div className="mt-1.5 flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          <Users className="mr-1 size-3" />
                          {selectedTeam.totalMembers}{" "}
                          {selectedTeam.totalMembers === 1 ? "member" : "members"}
                        </Badge>
                        {!selectedTeam.managerId && (
                          <Badge
                            variant="outline"
                            className="border-amber-300/50 text-amber-600 dark:border-amber-500/30 dark:text-amber-400"
                          >
                            <AlertTriangle className="mr-1 size-3" />
                            No manager
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </SheetHeader>

                <Separator className="my-4" />

                {/* Team info */}
                <div className="space-y-1 px-1">
                  <InfoRow
                    icon={Clock}
                    label="Created"
                    value={selectedTeam.createdAt ? fmtDate(selectedTeam.createdAt) : undefined}
                  />
                </div>

                {/* Manager card */}
                {selectedTeam.manager ? (
                  <>
                    <Separator className="my-4" />
                    <div className="px-1">
                      <div className="mb-3 flex items-center gap-2">
                        <div className="flex size-7 items-center justify-center rounded-md bg-violet-500/10">
                          <Crown className="size-3.5 text-violet-600 dark:text-violet-400" />
                        </div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Manager
                        </span>
                      </div>
                      <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/20 p-3">
                        <Avatar name={selectedTeam.manager.name} size="lg" />
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-sm">{selectedTeam.manager.name}</div>
                          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Mail className="size-3" />
                            <span className="truncate">{selectedTeam.manager.email}</span>
                          </div>
                          <div className="mt-1.5 flex items-center gap-2">
                            <Badge variant="secondary" className="text-[10px]">
                              {ROLE_LABELS[selectedTeam.manager.role as keyof typeof ROLE_LABELS] ||
                                selectedTeam.manager.role}
                            </Badge>
                            <StatusBadge value={selectedTeam.manager.status} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <Separator className="my-4" />
                    <div className="px-1">
                      <div className="mb-3 flex items-center gap-2">
                        <div className="flex size-7 items-center justify-center rounded-md bg-amber-500/10">
                          <Crown className="size-3.5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Manager
                        </span>
                      </div>
                      <div className="flex items-center gap-2 rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                        <AlertTriangle className="size-4 shrink-0 text-amber-500" />
                        <span>No manager assigned. Edit this team to assign one.</span>
                      </div>
                    </div>
                  </>
                )}

                {/* Members list */}
                <>
                  <Separator className="my-4" />
                  <div className="px-1">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex size-7 items-center justify-center rounded-md bg-blue-500/10">
                          <Users className="size-3.5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Team members
                        </span>
                      </div>
                      <span className="tabular-nums text-xs text-muted-foreground">
                        {selectedTeam.totalMembers}
                      </span>
                    </div>

                    {selectedTeam.members.length === 0 ? (
                      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border/80 p-6 text-center">
                        <UsersRound className="size-5 text-muted-foreground/50" />
                        <span className="text-xs text-muted-foreground">
                          No members assigned yet
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {/* Manager is first if present */}
                        {selectedTeam.members.map((member, idx) => {
                          const isManager = member.id === selectedTeam.managerId;
                          return (
                            <div
                              key={member.id}
                              className={`flex items-center gap-3 rounded-lg p-2.5 transition-colors ${
                                isManager
                                  ? "border border-violet-200/50 bg-violet-50/50 dark:border-violet-500/15 dark:bg-violet-950/20"
                                  : "border border-transparent hover:bg-muted/40"
                              }`}
                            >
                              <Avatar name={member.name} size="sm" />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="truncate text-sm font-medium">
                                    {member.name}
                                  </span>
                                  {isManager && (
                                    <Badge
                                      variant="outline"
                                      className="border-violet-300/50 text-[10px] text-violet-600 dark:border-violet-500/30 dark:text-violet-400"
                                    >
                                      <Crown className="mr-0.5 size-2.5" />
                                      Manager
                                    </Badge>
                                  )}
                                </div>
                                <div className="mt-0.5 flex items-center gap-2">
                                  <span className="truncate text-[11px] text-muted-foreground">
                                    {member.email}
                                  </span>
                                </div>
                              </div>
                              <div className="flex shrink-0 items-center gap-1.5">
                                <Badge variant="secondary" className="text-[10px] font-normal">
                                  {ROLE_LABELS[member.role as keyof typeof ROLE_LABELS] ||
                                    member.role}
                                </Badge>
                                <StatusBadge value={member.status} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              </>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </TooltipProvider>
  );
}
