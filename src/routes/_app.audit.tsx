import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { fmtDate, relative } from "@/lib/format";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  LogIn,
  LogOut,
  Search,
  ShieldAlert,
  RefreshCw,
  X,
  Activity,
  Users,
  Fingerprint,
  Globe,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export const Route = createFileRoute("/_app/audit")({ component: AuditPage });

/* ─── Types ───────────────────────────────────────────────────────── */

type AuthActivity = {
  id: string;
  name: string;
  email: string;
  action: string;
  ipAddress: string;
  lastLogin: string | null;
  lastLogout: string | null;
};

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

function Avatar({ name, size = "md" }: { name?: string | null; size?: "sm" | "md" }) {
  const sizeClasses = { sm: "size-7 text-[10px]", md: "size-9 text-xs" };
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

/* ─── Action badge ────────────────────────────────────────────────── */

function ActionBadge({ action }: { action: string }) {
  if (action === "Login") {
    return (
      <Badge
        variant="secondary"
        className="gap-1 border-emerald-200/60 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-950/40 dark:text-emerald-400"
      >
        <ArrowUpRight className="size-3" aria-hidden="true" />
        Login
      </Badge>
    );
  }
  if (action === "Logout") {
    return (
      <Badge
        variant="secondary"
        className="gap-1 border-slate-200/60 bg-slate-50 text-slate-600 dark:border-slate-500/20 dark:bg-slate-800/40 dark:text-slate-400"
      >
        <ArrowDownRight className="size-3" aria-hidden="true" />
        Logout
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1">
      {action}
    </Badge>
  );
}

/* ─── Skeleton ────────────────────────────────────────────────────── */

function AuditTableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 rounded-lg border border-border/50 bg-card p-3.5"
        >
          <div className="size-9 shrink-0 animate-pulse rounded-full bg-muted/80" />
          <div className="flex-1 space-y-2.5">
            <div className="h-3.5 w-36 animate-pulse rounded-md bg-muted/80" />
            <div className="h-3 w-48 animate-pulse rounded-md bg-muted/60" />
          </div>
          <div className="h-6 w-20 animate-pulse rounded-full bg-muted/70" />
          <div className="hidden h-3 w-28 animate-pulse rounded bg-muted/50 sm:block" />
          <div className="hidden h-3 w-20 animate-pulse rounded bg-muted/50 sm:block" />
        </div>
      ))}
    </div>
  );
}

/* ─── Empty state ─────────────────────────────────────────────────── */

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-gradient-to-b from-card to-card/50 px-6 py-16 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-muted/60">
        <Icon className="size-7 text-muted-foreground/70" />
      </div>
      <div className="mt-4">
        <div className="text-sm font-semibold">{title}</div>
        <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */

function AuditPage() {
  const [items, setItems] = useState<AuthActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  /* ── Stats ── */
  const stats = useMemo(() => {
    const total = items.length;
    const logins = items.filter((u) => u.action === "Login").length;
    const logouts = items.filter((u) => u.action === "Logout").length;
    const uniqueUsers = new Set(items.map((u) => u.id)).size;
    const uniqueIps = new Set(items.map((u) => u.ipAddress)).size;
    return { total, logins, logouts, uniqueUsers, uniqueIps };
  }, [items]);

  /* ── Data ── */

  const loadActivity = async () => {
    setLoading(true);
    try {
      const payload = await apiFetch<{ users: AuthActivity[] }>("/api/audit-logs", {
        method: "GET",
      });
      setItems(payload.data.users);
    } catch {
      toast.error("Failed to load authentication activity");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadActivity();
  }, []);

  async function refreshActivity() {
    await loadActivity();
    toast.success("Activity log refreshed");
  }

  /* ── Helpers ── */

  function getLastActivityDate(user: AuthActivity) {
    if (user.lastLogin && user.lastLogout) {
      return new Date(user.lastLogin) > new Date(user.lastLogout)
        ? user.lastLogin
        : user.lastLogout;
    }
    if (user.lastLogin) return user.lastLogin;
    if (user.lastLogout) return user.lastLogout;
    return null;
  }

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.action.toLowerCase().includes(q) ||
        u.ipAddress.toLowerCase().includes(q),
    );
  }, [items, query]);

  /* ═══════════════════════════════════════════════════════════════════ */

  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-6">
        {/* ── Header ── */}
        <PageHeader
          title="Authentication Activity"
          description="Latest login and logout events across all users."
          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={refreshActivity}
              disabled={loading}
              className="gap-1.5"
            >
              <RefreshCw
                className={`size-3.5 ${loading ? "animate-spin" : ""}`}
                aria-hidden="true"
              />
              Refresh
            </Button>
          }
        />

        {/* ── Stats ── */}
        {!loading && items.length > 0 && (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <StatCard
              icon={Activity}
              label="Total events"
              value={stats.total}
              accent="bg-primary/10 text-primary"
            />
            <StatCard
              icon={LogIn}
              label="Logins"
              value={stats.logins}
              accent="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            />
            <StatCard
              icon={LogOut}
              label="Logouts"
              value={stats.logouts}
              accent="bg-slate-500/10 text-slate-600 dark:text-slate-400"
            />
            <StatCard
              icon={Users}
              label="Unique users"
              value={stats.uniqueUsers}
              accent="bg-blue-500/10 text-blue-600 dark:text-blue-400"
            />
            <StatCard
              icon={Globe}
              label="Unique IPs"
              value={stats.uniqueIps}
              accent="bg-violet-500/10 text-violet-600 dark:text-violet-400"
            />
          </div>
        )}

        {/* ── Search ── */}
        {!loading && items.length > 0 && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/70" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, email, IP…"
                className="h-9 pl-9 pr-8 bg-background"
                aria-label="Search authentication activity"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-muted-foreground/60 transition-colors hover:text-muted-foreground"
                  aria-label="Clear search"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
            <span className="text-xs tabular-nums text-muted-foreground">
              {query ? (
                <>
                  <span className="font-medium text-foreground">{filteredItems.length}</span> of{" "}
                  {items.length} {items.length === 1 ? "event" : "events"}
                </>
              ) : (
                <>
                  {items.length} {items.length === 1 ? "event" : "events"}
                </>
              )}
            </span>
          </div>
        )}

        {/* ── Content ── */}
        {loading ? (
          <AuditTableSkeleton />
        ) : items.length === 0 ? (
          <EmptyState
            icon={ShieldAlert}
            title="No authentication activity yet"
            description="Login and logout events will appear here as users interact with the system."
          />
        ) : filteredItems.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No matching activity"
            description="Try adjusting your search terms — you can filter by name, email, action type, or IP address."
            action={
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setQuery("")}>
                <X className="size-3.5" />
                Clear search
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border/60 bg-card shadow-sm">
            <DataTable
              rows={filteredItems}
              columns={[
                {
                  head: "User",
                  cell: (u) => (
                    <div className="flex min-w-[220px] items-center gap-3">
                      <Avatar name={u.name} size="sm" />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{u.name}</div>
                        <div className="truncate text-xs text-muted-foreground">{u.email}</div>
                      </div>
                    </div>
                  ),
                },
                {
                  head: "Action",
                  cell: (u) => <ActionBadge action={u.action} />,
                },
                {
                  head: "IP Address",
                  cell: (u) => (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(u.ipAddress);
                            toast.success("IP address copied");
                          }}
                          className="group inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
                        >
                          <Fingerprint className="size-3 opacity-50" />
                          {u.ipAddress}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Click to copy</TooltipContent>
                    </Tooltip>
                  ),
                },
                {
                  head: "Last Login",
                  cell: (u) =>
                    u.lastLogin ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-default text-sm">{relative(u.lastLogin)}</span>
                        </TooltipTrigger>
                        <TooltipContent>{fmtDate(u.lastLogin)}</TooltipContent>
                      </Tooltip>
                    ) : (
                      <span className="text-muted-foreground/50">—</span>
                    ),
                },
                {
                  head: "Last Active",
                  cell: (u) => {
                    const lastActivity = getLastActivityDate(u);
                    return lastActivity ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-default text-sm">{relative(lastActivity)}</span>
                        </TooltipTrigger>
                        <TooltipContent>{fmtDate(lastActivity)}</TooltipContent>
                      </Tooltip>
                    ) : (
                      <span className="text-muted-foreground/50">—</span>
                    );
                  },
                },
              ]}
            />
          </div>
        )}

        {/* ── Result count ── */}
        {!loading && items.length > 0 && (
          <p className="text-xs text-muted-foreground tabular-nums">
            Showing {filteredItems.length} of {items.length}{" "}
            {items.length === 1 ? "event" : "events"}
          </p>
        )}
      </div>
    </TooltipProvider>
  );
}
