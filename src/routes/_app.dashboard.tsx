import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { useAuth } from "@/lib/auth-context";
import { can, type Role } from "@/lib/roles";
import { usd, num, relative, fmtDate } from "@/lib/format";
import { useDashboard, type DashboardData } from "@/hooks/use-dashboard";
import {
  Users,
  FileText,
  Package,
  ClipboardCheck,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Truck,
  CalendarClock,
  Settings,
  UserPlus,
  FolderOpen,
  GraduationCap,
  BarChart3,
  ArrowRight,
  Clock,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Area,
  AreaChart,
} from "recharts";

export const Route = createFileRoute("/_app/dashboard")({
  component: Dashboard,
});

// ---------------------------------------------------------------------------
// Icon mapping
// ---------------------------------------------------------------------------

const ICON_MAP: Record<string, LucideIcon> = {
  users: Users,
  user: Users,
  "user-plus": UserPlus,
  file: FileText,
  package: Package,
  clipboard: ClipboardCheck,
  dollar: DollarSign,
  alert: AlertTriangle,
  check: CheckCircle2,
  trending: TrendingUp,
  truck: Truck,
  calendar: CalendarClock,
  settings: Settings,
  folder: FolderOpen,
  graduation: GraduationCap,
  chart: BarChart3,
};

function getIcon(name?: string): LucideIcon {
  return ICON_MAP[name ?? ""] ?? FileText;
}

// ---------------------------------------------------------------------------
// Session type
// ---------------------------------------------------------------------------

type Session = {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: string;
  isTemporaryPassword?: boolean;
};

// ---------------------------------------------------------------------------
// Premium skeleton loader
// ---------------------------------------------------------------------------

function PremiumSkeleton() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-64 animate-pulse rounded-lg bg-gradient-to-r from-muted/80 via-muted/40 to-muted/80" />
        <div className="h-4 w-48 animate-pulse rounded-md bg-gradient-to-r from-muted/60 via-muted/30 to-muted/60" />
      </div>

      {/* KPI skeleton */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="relative overflow-hidden rounded-2xl border border-border/40 bg-card p-5"
          >
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-muted/20 via-transparent to-transparent" />
            <div className="relative space-y-3">
              <div className="flex items-center justify-between">
                <div className="size-8 animate-pulse rounded-lg bg-muted/50" />
                <div className="h-4 w-12 animate-pulse rounded-md bg-muted/40" />
              </div>
              <div className="h-7 w-24 animate-pulse rounded-lg bg-gradient-to-r from-muted/60 via-muted/30 to-muted/60" />
              <div className="h-3 w-20 animate-pulse rounded-md bg-muted/30" />
            </div>
          </div>
        ))}
      </div>

      {/* Chart skeleton */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 overflow-hidden rounded-2xl border border-border/40 bg-card p-5">
          <div className="flex items-center justify-between mb-6">
            <div className="h-5 w-48 animate-pulse rounded-lg bg-muted/50" />
            <div className="h-3 w-20 animate-pulse rounded-md bg-muted/30" />
          </div>
          <div className="h-64 animate-pulse rounded-xl bg-gradient-to-br from-muted/30 via-muted/20 to-muted/30" />
        </div>
        <div className="overflow-hidden rounded-2xl border border-border/40 bg-card p-5">
          <div className="h-5 w-32 animate-pulse rounded-lg bg-muted/50 mb-4" />
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="mt-1.5 size-2 animate-pulse rounded-full bg-muted/40" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 w-full animate-pulse rounded-md bg-muted/30" />
                  <div className="h-3 w-3/4 animate-pulse rounded-md bg-muted/20" />
                  <div className="h-2.5 w-16 animate-pulse rounded-sm bg-muted/20" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Dashboard component
// ---------------------------------------------------------------------------

function Dashboard() {
  const { session } = useAuth();
  const { data, loading } = useDashboard();

  const role = session?.role ?? "agent";
  const firstName = session?.name?.split(" ")[0] ?? "";

  if (loading || !data) {
    return <PremiumSkeleton />;
  }

  switch (role) {
    case "owner":
    case "admin":
      return <OwnerDashboard data={data} session={session!} firstName={firstName} />;
    case "ops_manager":
      return <OpsManagerDashboard data={data} session={session!} firstName={firstName} />;
    case "team_manager":
      return <TeamManagerDashboard data={data} session={session!} firstName={firstName} />;
    case "leadagent":
      return <LeadAgentDashboard data={data} session={session!} firstName={firstName} />;
    case "agent":
      return <AgentDashboard data={data} session={session!} firstName={firstName} />;
    case "trainee":
      return <TraineeDashboard data={data} session={session!} firstName={firstName} />;
    case "accounting":
      return <AccountingDashboard data={data} session={session!} firstName={firstName} />;
    default:
      return <AgentDashboard data={data} session={session!} firstName={firstName} />;
  }
}

// ---------------------------------------------------------------------------
// Shared widgets
// ---------------------------------------------------------------------------

function KpiGrid({ kpis }: { kpis: DashboardData["kpis"] }) {
  if (kpis.length === 0) return null;
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
      {kpis.map((kpi, idx) => {
        const Icon = getIcon(kpi.icon);
        return (
          <div
            key={kpi.label}
            className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card p-4 transition-all duration-300 hover:border-border hover:shadow-lg hover:shadow-primary/[0.03]"
            style={{ animationDelay: `${idx * 50}ms` }}
          >
            {/* Subtle gradient overlay */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.02] via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

            <StatCard
              label={kpi.label}
              value={kpi.value}
              delta={kpi.delta}
              trend={kpi.trend}
              icon={<Icon className="size-4" />}
            />
          </div>
        );
      })}
    </div>
  );
}

function MarginTrendChart({ trends }: { trends: DashboardData["trends"] }) {
  if (!trends || trends.length === 0) return null;
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card p-5 transition-all duration-300 hover:border-border hover:shadow-lg hover:shadow-primary/[0.03]">
      {/* Decorative gradient */}
      <div className="pointer-events-none absolute -right-20 -top-20 size-60 rounded-full bg-gradient-to-br from-primary/5 to-transparent blur-3xl opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

      <div className="relative">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
              <TrendingUp className="size-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold tracking-tight">Gross Margin</h2>
              <p className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">
                Last 12 weeks
              </p>
            </div>
          </div>
          <span className="rounded-full bg-muted/50 px-2.5 py-1 text-[10px] font-semibold text-muted-foreground ring-1 ring-border/50">
            USD/week
          </span>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trends}>
              <defs>
                <linearGradient id="marginGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
              <XAxis
                dataKey="week"
                tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                stroke="var(--border)"
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                stroke="var(--border)"
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  fontSize: 12,
                  boxShadow: "0 10px 40px -10px rgba(0,0,0,0.15)",
                }}
                labelStyle={{
                  color: "var(--muted-foreground)",
                  fontWeight: 600,
                  marginBottom: 4,
                }}
                cursor={{
                  stroke: "var(--primary)",
                  strokeWidth: 1,
                  strokeDasharray: "4 4",
                }}
              />
              <Area
                type="monotone"
                dataKey="margin"
                stroke="var(--primary)"
                strokeWidth={2.5}
                fill="url(#marginGradient)"
                dot={false}
                activeDot={{
                  r: 5,
                  fill: "var(--primary)",
                  stroke: "var(--card)",
                  strokeWidth: 2,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function AgentPerformanceChart({ data }: { data: DashboardData["agentPerformance"] }) {
  if (!data || data.length === 0) return null;
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card p-5 transition-all duration-300 hover:border-border hover:shadow-lg hover:shadow-primary/[0.03]">
      <div className="pointer-events-none absolute -left-20 -bottom-20 size-60 rounded-full bg-gradient-to-tr from-violet-500/5 to-transparent blur-3xl opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

      <div className="relative">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-violet-500/10">
              <BarChart3 className="size-4 text-violet-500" />
            </div>
            <div>
              <h2 className="text-sm font-semibold tracking-tight">Agent Performance</h2>
              <p className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">
                Gross margin
              </p>
            </div>
          </div>
          <span className="rounded-full bg-muted/50 px-2.5 py-1 text-[10px] font-semibold text-muted-foreground ring-1 ring-border/50">
            USD
          </span>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barCategoryGap="25%">
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={1} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.6} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border)"
                opacity={0.4}
                vertical={false}
              />
              <XAxis
                dataKey="name"
                tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                stroke="var(--border)"
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                stroke="var(--border)"
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  fontSize: 12,
                  boxShadow: "0 10px 40px -10px rgba(0,0,0,0.15)",
                }}
                cursor={{
                  fill: "var(--muted)",
                  opacity: 0.3,
                }}
              />
              <Bar
                dataKey="margin"
                fill="url(#barGradient)"
                radius={[6, 6, 0, 0]}
                maxBarSize={48}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function TeamPerformanceTable({ data }: { data: DashboardData["teamPerformance"] }) {
  if (!data || data.length === 0) return null;
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card transition-all duration-300 hover:border-border hover:shadow-lg hover:shadow-primary/[0.03]">
      <div className="relative p-5">
        <div className="mb-4 flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-blue-500/10">
            <Users className="size-4 text-blue-500" />
          </div>
          <div>
            <h2 className="text-sm font-semibold tracking-tight">Team Performance</h2>
            <p className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">
              Overview
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 text-left">
                <th className="pb-3 pr-4 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                  Team
                </th>
                <th className="pb-3 pr-4 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                  Loads
                </th>
                <th className="pb-3 pr-4 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                  Revenue
                </th>
                <th className="pb-3 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                  Margin
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((t, idx) => (
                <tr
                  key={t.name}
                  className={`group/row border-b border-border/30 last:border-0 transition-colors hover:bg-muted/30 ${idx === 0 ? "bg-muted/10" : ""}`}
                >
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      {idx === 0 && (
                        <span className="flex size-5 items-center justify-center rounded-md bg-amber-500/10 text-[9px] font-bold text-amber-600 ring-1 ring-amber-500/20">
                          1
                        </span>
                      )}
                      <span className="font-medium">{t.name}</span>
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-right font-mono text-xs tabular-nums">
                    {num(t.loads)}
                  </td>
                  <td className="py-3 pr-4 text-right font-mono text-xs tabular-nums">
                    {usd(t.revenue)}
                  </td>
                  <td className="py-3 text-right font-mono text-xs font-semibold tabular-nums text-primary">
                    {usd(t.margin)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function RecentActivityPanel({ items }: { items: DashboardData["recentActivity"] }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card transition-all duration-300 hover:border-border hover:shadow-lg hover:shadow-primary/[0.03]">
      <div className="relative p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10">
              <Clock className="size-4 text-emerald-500" />
            </div>
            <h2 className="text-sm font-semibold tracking-tight">Recent Activity</h2>
          </div>
          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 ring-1 ring-emerald-500/20">
            Live
          </span>
        </div>
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground/50">
            <Clock className="mb-3 size-8 opacity-30" />
            <p className="text-sm font-medium">No recent activity</p>
            <p className="mt-1 text-xs">Updates will appear here</p>
          </div>
        ) : (
          <ul className="space-y-1">
            {items.slice(0, 6).map((n, idx) => (
              <li
                key={n.id}
                className="group/item flex items-start gap-3 rounded-xl p-2.5 transition-colors hover:bg-muted/40"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="relative mt-1 flex size-2 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/40" />
                  <span className="relative inline-flex size-2 rounded-full bg-primary ring-2 ring-primary/20" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium leading-tight">{n.title}</div>
                  <div className="mt-0.5 truncate text-xs text-muted-foreground/70">
                    {n.message}
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground/50">
                    <Clock className="size-2.5" />
                    {relative(n.createdAt)}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function PendingApprovalsPanel({ items }: { items: DashboardData["pendingApprovals"] }) {
  if (items.length === 0) return null;
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card transition-all duration-300 hover:border-border hover:shadow-lg hover:shadow-primary/[0.03]">
      <div className="relative">
        <div className="flex items-center justify-between border-b border-border/40 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-amber-500/10">
              <ClipboardCheck className="size-4 text-amber-500" />
            </div>
            <div>
              <h2 className="text-sm font-semibold tracking-tight">Pending Approvals</h2>
              <p className="text-[10px] font-medium text-amber-600/70">
                {items.length} awaiting review
              </p>
            </div>
          </div>
          <Link
            to="/approvals"
            className="group/link flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-primary transition-all hover:bg-primary/5"
          >
            View all
            <ArrowRight className="size-3 transition-transform group-hover/link:translate-x-0.5" />
          </Link>
        </div>
        <ul className="divide-y divide-border/30">
          {items.slice(0, 5).map((a) => {
            let title = `${a.module.charAt(0).toUpperCase() + a.module.slice(1)}: ${a.actionType}`;
            if (a.module === "leads") {
              title = `Lead: ${(a.newValues as any)?.companyName || "New Lead"}`;
            } else if (a.module === "customers") {
              title = `Customer: ${(a.newValues as any)?.companyName || "New Customer"}`;
            } else if (a.module === "quotes") {
              const lane = (a.newValues as any)?.lane;
              title = `Quote: ${lane?.origin || "Origin"} → ${lane?.destination || "Destination"}`;
            }
            return (
              <li
                key={a.id}
                className="group/item flex items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-muted/30"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <StatusBadge value={a.module} tone="info" />
                    <span className="truncate text-sm font-medium">{title}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground/60">
                    <span>{a.requestedByName}</span>
                    <span className="text-muted-foreground/30">·</span>
                    <span>{relative(a.createdAt)}</span>
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold text-amber-600 ring-1 ring-amber-500/20">
                  Open
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function UpcomingFollowupsPanel({ items }: { items: DashboardData["upcomingFollowups"] }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card transition-all duration-300 hover:border-border hover:shadow-lg hover:shadow-primary/[0.03]">
      <div className="relative p-5">
        <div className="mb-4 flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-orange-500/10">
            <CalendarClock className="size-4 text-orange-500" />
          </div>
          <h2 className="text-sm font-semibold tracking-tight">Upcoming Follow-ups</h2>
        </div>
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground/50">
            <CalendarClock className="mb-3 size-8 opacity-30" />
            <p className="text-sm font-medium">No upcoming follow-ups</p>
            <p className="mt-1 text-xs">Scheduled items will appear here</p>
          </div>
        ) : (
          <ul className="space-y-1">
            {items.map((f) => (
              <li
                key={f.id}
                className="group/item flex items-center justify-between gap-3 rounded-xl p-2.5 transition-colors hover:bg-muted/40"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium leading-tight">{f.title}</div>
                  <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground/60">
                    <CalendarClock className="size-3" />
                    {fmtDate(f.dueDate)}
                  </div>
                </div>
                <StatusBadge
                  value={f.priority}
                  tone={
                    f.priority === "high" ? "danger" : f.priority === "medium" ? "warning" : "muted"
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function RecentLoadsPanel({ items }: { items: DashboardData["recentLoads"] }) {
  if (items.length === 0) return null;
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card transition-all duration-300 hover:border-border hover:shadow-lg hover:shadow-primary/[0.03]">
      <div className="relative p-5">
        <div className="mb-4 flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-blue-500/10">
            <Truck className="size-4 text-blue-500" />
          </div>
          <div>
            <h2 className="text-sm font-semibold tracking-tight">Recent Loads</h2>
            <p className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">
              Latest shipments
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 text-left">
                <th className="pb-3 pr-4 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                  Load #
                </th>
                <th className="pb-3 pr-4 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                  Route
                </th>
                <th className="pb-3 pr-4 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                  Status
                </th>
                <th className="pb-3 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                  Revenue
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((l) => (
                <tr
                  key={l.id}
                  className="border-b border-border/30 last:border-0 transition-colors hover:bg-muted/30"
                >
                  <td className="py-3 pr-4 font-mono text-xs font-medium">{l.loadNumber}</td>
                  <td className="py-3 pr-4 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <span>{l.origin}</span>
                      <ArrowRight className="size-3 text-muted-foreground/40" />
                      <span>{l.destination}</span>
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <StatusBadge value={l.status} />
                  </td>
                  <td className="py-3 text-right font-mono text-xs font-semibold tabular-nums">
                    {usd(l.revenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function InvoiceSummaryPanel({
  summary,
}: {
  summary: NonNullable<DashboardData["invoiceSummary"]>;
}) {
  const items = [
    {
      label: "Pending",
      count: summary.pending,
      amount: summary.pendingTotal,
      tone: "default" as const,
    },
    { label: "Paid", count: summary.paid, amount: summary.paidTotal, tone: "success" as const },
    {
      label: "Outstanding",
      count: summary.outstanding,
      amount: summary.outstandingTotal,
      tone: "warning" as const,
    },
    {
      label: "Overdue",
      count: summary.overdue,
      amount: summary.overdueTotal,
      tone: "danger" as const,
    },
  ];

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card transition-all duration-300 hover:border-border hover:shadow-lg hover:shadow-primary/[0.03]">
      <div className="relative p-5">
        <div className="mb-4 flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-green-500/10">
            <DollarSign className="size-4 text-green-500" />
          </div>
          <h2 className="text-sm font-semibold tracking-tight">Invoice Summary</h2>
        </div>
        <div className="space-y-2">
          {items.map((item, idx) => (
            <div
              key={item.label}
              className={`flex items-center justify-between rounded-xl p-3 transition-colors hover:bg-muted/30 ${
                idx === items.length - 1 ? "border-t border-border/40 mt-3 pt-3" : ""
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`text-sm ${
                    item.tone === "danger"
                      ? "font-semibold text-destructive"
                      : item.tone === "success"
                        ? "font-medium text-emerald-600 dark:text-emerald-400"
                        : "text-muted-foreground"
                  }`}
                >
                  {item.label}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground/60 tabular-nums">{item.count}</span>
                <span
                  className={`font-mono text-sm tabular-nums ${
                    item.tone === "danger"
                      ? "font-bold text-destructive"
                      : item.tone === "success"
                        ? "font-semibold text-emerald-600 dark:text-emerald-400"
                        : "font-medium"
                  }`}
                >
                  {usd(item.amount)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CommissionSummaryPanel({
  summary,
}: {
  summary: NonNullable<DashboardData["commissionSummary"]>;
}) {
  const items = [
    { label: "Pending", count: summary.pending, amount: summary.pendingTotal, icon: "clock" },
    {
      label: "Processing",
      count: summary.processing,
      amount: summary.processingTotal,
      icon: "loader",
    },
    { label: "Paid", count: summary.paid, amount: summary.paidTotal, icon: "check" },
  ];

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card transition-all duration-300 hover:border-border hover:shadow-lg hover:shadow-primary/[0.03]">
      <div className="relative p-5">
        <div className="mb-4 flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10">
            <DollarSign className="size-4 text-emerald-500" />
          </div>
          <h2 className="text-sm font-semibold tracking-tight">Commission Summary</h2>
        </div>
        <div className="space-y-2">
          {items.map((item, idx) => (
            <div
              key={item.label}
              className={`flex items-center justify-between rounded-xl p-3 transition-colors hover:bg-muted/30 ${
                idx === items.length - 1 ? "border-t border-border/40 mt-2 pt-3" : ""
              }`}
            >
              <span className="text-sm text-muted-foreground">{item.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground/60 tabular-nums">{item.count}</span>
                <span
                  className={`font-mono text-sm tabular-nums ${
                    item.label === "Paid"
                      ? "font-bold text-emerald-600 dark:text-emerald-400"
                      : "font-medium"
                  }`}
                >
                  {usd(item.amount)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TrainingProgressPanel({
  progress,
}: {
  progress: NonNullable<DashboardData["trainingProgress"]>;
}) {
  const pct = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card transition-all duration-300 hover:border-border hover:shadow-lg hover:shadow-primary/[0.03]">
      <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-gradient-to-br from-primary/5 to-transparent blur-3xl" />

      <div className="relative p-5">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-violet-500/10">
              <GraduationCap className="size-4 text-violet-500" />
            </div>
            <h2 className="text-sm font-semibold tracking-tight">Training Progress</h2>
          </div>
          <StatusBadge
            value={progress.activationStatus}
            tone={progress.activationStatus === "Active" ? "success" : "warning"}
          />
        </div>

        <div className="mb-5">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="font-medium text-muted-foreground">
              {progress.completed} / {progress.total} completed
            </span>
            <span className="text-lg font-bold tabular-nums text-primary">{pct}%</span>
          </div>
          <div className="relative h-3 overflow-hidden rounded-full bg-muted/50 ring-1 ring-border/30">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary to-primary/80 shadow-sm shadow-primary/30 transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/20 to-transparent" />
          </div>
        </div>

        {progress.requirements.length > 0 && (
          <ul className="space-y-1.5">
            {progress.requirements.map((r) => (
              <li
                key={r.key}
                className="flex items-center justify-between rounded-lg px-3 py-2 transition-colors hover:bg-muted/30"
              >
                <span className="text-xs font-medium text-muted-foreground">{r.label}</span>
                <StatusBadge
                  value={r.status}
                  tone={
                    r.status === "approved"
                      ? "success"
                      : r.status === "rejected"
                        ? "danger"
                        : r.status === "missing"
                          ? "danger"
                          : "warning"
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function QuickActionsPanel({ actions }: { actions: DashboardData["quickActions"] }) {
  if (actions.length === 0) return null;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2.5">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
          <Sparkles className="size-4 text-primary" />
        </div>
        <h2 className="text-sm font-semibold tracking-tight">Quick Actions</h2>
      </div>
      <div className="flex flex-wrap gap-2">
        {actions.map((a) => {
          const Icon = getIcon(a.icon);
          return (
            <Link
              key={a.label}
              to={a.href}
              className="group/action inline-flex items-center gap-2.5 rounded-xl border border-border/50 bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-all hover:border-primary/30 hover:bg-primary/5 hover:shadow-md hover:shadow-primary/[0.05]"
            >
              <Icon className="size-4 text-muted-foreground transition-colors group-hover/action:text-primary" />
              {a.label}
              <ArrowRight className="size-3.5 text-muted-foreground/40 transition-all group-hover/action:translate-x-0.5 group-hover/action:text-primary" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Role: Owner / Admin
// ---------------------------------------------------------------------------

function OwnerDashboard({
  data,
  session,
  firstName,
}: {
  data: DashboardData;
  session: Session;
  firstName: string;
}) {
  return (
    <div className="space-y-8">
      <PageHeader
        title={`Welcome back, ${firstName}`}
        description="Company overview and key metrics"
      />
      <KpiGrid kpis={data.kpis} />
      <div className="grid gap-4 lg:grid-cols-3">
        <MarginTrendChart trends={data.trends} />
        <RecentActivityPanel items={data.recentActivity} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <TeamPerformanceTable data={data.teamPerformance} />
        <AgentPerformanceChart data={data.agentPerformance} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <PendingApprovalsPanel items={data.pendingApprovals} />
        <UpcomingFollowupsPanel items={data.upcomingFollowups} />
      </div>
      <QuickActionsPanel actions={data.quickActions} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Role: Ops Manager
// ---------------------------------------------------------------------------

function OpsManagerDashboard({
  data,
  session,
  firstName,
}: {
  data: DashboardData;
  session: Session;
  firstName: string;
}) {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Operations Dashboard"
        description="Daily operations overview and metrics"
      />
      <KpiGrid kpis={data.kpis} />
      <div className="grid gap-4 lg:grid-cols-3">
        <MarginTrendChart trends={data.trends} />
        <RecentActivityPanel items={data.recentActivity} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <PendingApprovalsPanel items={data.pendingApprovals} />
        <UpcomingFollowupsPanel items={data.upcomingFollowups} />
      </div>
      <QuickActionsPanel actions={data.quickActions} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Role: Team Manager
// ---------------------------------------------------------------------------

function TeamManagerDashboard({
  data,
  session,
  firstName,
}: {
  data: DashboardData;
  session: Session;
  firstName: string;
}) {
  return (
    <div className="space-y-8">
      <PageHeader
        title={`Team Dashboard${data.teamInfo ? " — " + data.teamInfo.teamName : ""}`}
        description="Your team's performance at a glance"
      />
      <KpiGrid kpis={data.kpis} />
      <div className="grid gap-4 lg:grid-cols-2">
        <AgentPerformanceChart data={data.agentPerformance} />
        <RecentActivityPanel items={data.recentActivity} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <PendingApprovalsPanel items={data.pendingApprovals} />
        <UpcomingFollowupsPanel items={data.upcomingFollowups} />
      </div>
      <QuickActionsPanel actions={data.quickActions} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Role: Lead Agent
// ---------------------------------------------------------------------------

function LeadAgentDashboard({
  data,
  session,
  firstName,
}: {
  data: DashboardData;
  session: Session;
  firstName: string;
}) {
  return (
    <div className="space-y-8">
      <PageHeader title="Team Lead Dashboard" description="Your work and team overview" />
      <KpiGrid kpis={data.kpis} />
      <div className="grid gap-4 lg:grid-cols-3">
        <MarginTrendChart trends={data.trends} />
        <AgentPerformanceChart data={data.agentPerformance} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <RecentActivityPanel items={data.recentActivity} />
        <UpcomingFollowupsPanel items={data.upcomingFollowups} />
      </div>
      <QuickActionsPanel actions={data.quickActions} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Role: Agent
// ---------------------------------------------------------------------------

function AgentDashboard({
  data,
  session,
  firstName,
}: {
  data: DashboardData;
  session: Session;
  firstName: string;
}) {
  return (
    <div className="space-y-8">
      <PageHeader title="My Dashboard" description="Your personal workspace and metrics" />
      <KpiGrid kpis={data.kpis} />
      <div className="grid gap-4 lg:grid-cols-3">
        {data.commissionSummary && <CommissionSummaryPanel summary={data.commissionSummary} />}
        <RecentLoadsPanel items={data.recentLoads} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <RecentActivityPanel items={data.recentActivity} />
        <UpcomingFollowupsPanel items={data.upcomingFollowups} />
      </div>
      <QuickActionsPanel actions={data.quickActions} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Role: Trainee
// ---------------------------------------------------------------------------

function TraineeDashboard({
  data,
  session,
  firstName,
}: {
  data: DashboardData;
  session: Session;
  firstName: string;
}) {
  const isActive = session.status === "active";
  return (
    <div className="space-y-8">
      <PageHeader title="My Dashboard" description="Your training and onboarding progress" />
      {data.trainingProgress && <TrainingProgressPanel progress={data.trainingProgress} />}
      <KpiGrid kpis={data.kpis} />
      {!isActive && (
        <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-50/80 to-orange-50/50 p-5 dark:from-amber-950/40 dark:to-orange-950/30">
          <div className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full bg-amber-500/10 blur-2xl" />
          <div className="relative flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 ring-1 ring-amber-500/20">
              <AlertTriangle className="size-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-700 dark:text-amber-400">
                Account Activation Required
              </h3>
              <p className="mt-1 text-sm text-amber-600/80 dark:text-amber-400/70">
                Activate your account to start quoting and creating loads.
              </p>
            </div>
          </div>
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <RecentActivityPanel items={data.recentActivity} />
        <UpcomingFollowupsPanel items={data.upcomingFollowups} />
      </div>
      <QuickActionsPanel actions={data.quickActions} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Role: Accounting
// ---------------------------------------------------------------------------

function AccountingDashboard({
  data,
  session,
  firstName,
}: {
  data: DashboardData;
  session: Session;
  firstName: string;
}) {
  return (
    <div className="space-y-8">
      <PageHeader title="Finance Dashboard" description="Invoices, payments, and commissions" />
      <KpiGrid kpis={data.kpis} />
      <div className="grid gap-4 lg:grid-cols-2">
        {data.invoiceSummary && <InvoiceSummaryPanel summary={data.invoiceSummary} />}
        {data.commissionSummary && <CommissionSummaryPanel summary={data.commissionSummary} />}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <RecentActivityPanel items={data.recentActivity} />
        <UpcomingFollowupsPanel items={data.upcomingFollowups} />
      </div>
      <QuickActionsPanel actions={data.quickActions} />
    </div>
  );
}
