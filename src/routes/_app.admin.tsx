import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api-client";
import { can, type Capability } from "@/lib/roles";
import {
  Users,
  FolderOpen,
  ClipboardCheck,
  BarChart3,
  DollarSign,
  Settings,
  Shield,
  AlertTriangle,
  ChevronRight,
  Building2,
  Mail,
  Clock,
  Timer,
  Trash2,
  Save,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/admin")({ component: AdminPage });

/* ─── Tile color system ───────────────────────────────────────────── */

type ColorKey = "blue" | "amber" | "emerald" | "violet" | "teal" | "slate";

const TILE_COLORS: Record<ColorKey, { bg: string; icon: string; ring: string }> = {
  blue: {
    bg: "bg-blue-500/5 hover:bg-blue-500/[0.09]",
    icon: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    ring: "hover:shadow-blue-500/5",
  },
  amber: {
    bg: "bg-amber-500/5 hover:bg-amber-500/[0.09]",
    icon: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    ring: "hover:shadow-amber-500/5",
  },
  emerald: {
    bg: "bg-emerald-500/5 hover:bg-emerald-500/[0.09]",
    icon: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    ring: "hover:shadow-emerald-500/5",
  },
  violet: {
    bg: "bg-violet-500/5 hover:bg-violet-500/[0.09]",
    icon: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    ring: "hover:shadow-violet-500/5",
  },
  teal: {
    bg: "bg-teal-500/5 hover:bg-teal-500/[0.09]",
    icon: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
    ring: "hover:shadow-teal-500/5",
  },
  slate: {
    bg: "bg-slate-500/5 hover:bg-slate-500/[0.09]",
    icon: "bg-slate-500/10 text-slate-500 dark:text-slate-400",
    ring: "hover:shadow-slate-500/5",
  },
};

/* ─── Tile definitions ────────────────────────────────────────────── */

const TILES: Array<{
  to: string;
  icon: typeof Users;
  label: string;
  desc: string;
  cap: Capability;
  color: ColorKey;
}> = [
  {
    to: "/users",
    icon: Users,
    label: "Users & Roles",
    desc: "Provision agents, suspend access, and manage role assignments.",
    cap: "users",
    color: "blue",
  },
  {
    to: "/invoices",
    icon: FolderOpen,
    label: "Invoices",
    desc: "Create, review, and track invoices across operations.",
    cap: "invoices",
    color: "amber",
  },
  {
    to: "/approvals",
    icon: ClipboardCheck,
    label: "Approvals",
    desc: "Unified queue for customers, quotes, and load approvals.",
    cap: "approvals",
    color: "emerald",
  },
  {
    to: "/dashboard",
    icon: BarChart3,
    label: "Reports",
    desc: "Operational reports and KPI dashboards.",
    cap: "reports",
    color: "violet",
  },
  {
    to: "/commissions",
    icon: DollarSign,
    label: "Commission Rules",
    desc: "Configure tier percentages and earning thresholds.",
    cap: "commission_rules",
    color: "teal",
  },
  {
    to: "/audit",
    icon: Shield,
    label: "Session Log",
    desc: "System-wide authentication event log.",
    cap: "audit",
    color: "slate",
  },
];

/* ─── Settings data ───────────────────────────────────────────────── */

const DEFAULT_SETTINGS = {
  companyName: "TMS Freight Portal",
  supportEmail: "ops@djfreight.example",
};

/* ─── Navigation tile ─────────────────────────────────────────────── */

function NavTile({ tile }: { tile: (typeof TILES)[number] }) {
  const c = TILE_COLORS[tile.color];
  return (
    <Link
      to={tile.to}
      className={`group relative flex flex-col gap-4 rounded-xl border border-border/50 ${c.bg} ${c.ring} p-5 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
    >
      <div className="flex items-start justify-between">
        <div
          className={`flex size-10 items-center justify-center rounded-lg ${c.icon} transition-transform duration-200 group-hover:scale-110`}
        >
          <tile.icon className="size-5" />
        </div>
        <ChevronRight className="size-4 text-muted-foreground/25 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-muted-foreground/60" />
      </div>
      <div>
        <div className="text-sm font-semibold">{tile.label}</div>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{tile.desc}</p>
      </div>
    </Link>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */

function AdminPage() {
  const { session } = useAuth();
  const pathname = useRouterState({
    select: (s) => s.location.pathname,
  });
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [processing, setProcessing] = useState(false);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [savingSettings, setSavingSettings] = useState(false);

  const role = session?.role ?? "suspended";
  const visibleTiles = TILES.filter((t) => can(role, t.cap));
  const canReset = can(role, "admin");

  useEffect(() => {
    void apiFetch<typeof DEFAULT_SETTINGS>("/api/admin/settings")
      .then((response) => setSettings(response.data))
      .catch(() => undefined);
  }, []);

  async function saveSettings() {
    setSavingSettings(true);
    try {
      const response = await apiFetch<typeof DEFAULT_SETTINGS>("/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify(settings),
      });
      setSettings(response.data);
      toast.success("Portal settings saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save portal settings");
    } finally {
      setSavingSettings(false);
    }
  }

  // Sub-routes render their own layout
  if (pathname !== "/admin") return <Outlet />;

  async function handleResetSystem() {
    if (!password || confirmation !== "RESET") return;
    setProcessing(true);
    try {
      await apiFetch<{ message: string }>("/api/admin/reset-system", {
        method: "POST",
        body: JSON.stringify({ password, confirmation }),
      });
      toast.success("System reset complete.");
      setOpen(false);
      setPassword("");
      setConfirmation("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Reset failed.");
    } finally {
      setProcessing(false);
    }
  }

  function handleDialogChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setPassword("");
      setConfirmation("");
    }
  }

  return (
    <div className="space-y-6">
      {/* ══════════ Hero ══════════ */}
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card">
        {/* Dot-grid pattern */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "radial-gradient(hsl(var(--foreground)) 0.5px, transparent 0.5px)",
            backgroundSize: "20px 20px",
          }}
        />
        {/* Gradient wash */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.07] via-transparent to-violet-500/[0.04]" />

        <div className="relative z-10 flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div className="space-y-1.5">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Admin Panel</h1>
            <p className="max-w-lg text-sm text-muted-foreground">
              Configuration and oversight tools for administrators.
            </p>
          </div>
          {role === "admin" && (
            <Button asChild variant="destructive" size="sm" className="gap-1.5 shrink-0 shadow-sm">
              <Link to="/admin/data-deletion">
                <Trash2 className="size-3.5" />
                Manage deletions
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* ══════════ Navigation Grid ══════════ */}
      <section>
        <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Navigation
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visibleTiles.map((tile) => (
            <NavTile key={tile.to} tile={tile} />
          ))}
        </div>
      </section>

      {/* ══════════ Portal Configuration ══════════ */}
      <section className="overflow-hidden rounded-xl border border-border/60 bg-card">
        <div className="flex items-center gap-3 border-b border-border/40 px-5 py-4">
          <div className="flex size-8 items-center justify-center rounded-lg bg-muted/80">
            <Settings className="size-4 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Portal Configuration</h3>
            <p className="text-[11px] text-muted-foreground">System-wide settings</p>
          </div>
        </div>

        <div className="divide-y divide-border/30">
          <div className="flex flex-col gap-2 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
            <Label
              htmlFor="portal-company-name"
              className="flex items-center gap-2.5 text-xs text-muted-foreground"
            >
              <Building2 className="size-3.5 shrink-0 opacity-60" />
              Company name
            </Label>
            <Input
              id="portal-company-name"
              value={settings.companyName}
              onChange={(event) =>
                setSettings((current) => ({ ...current, companyName: event.target.value }))
              }
              className="h-8 sm:max-w-sm"
            />
          </div>
          <div className="flex flex-col gap-2 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
            <Label
              htmlFor="portal-support-email"
              className="flex items-center gap-2.5 text-xs text-muted-foreground"
            >
              <Mail className="size-3.5 shrink-0 opacity-60" />
              Support email
            </Label>
            <div className="w-full space-y-1.5 sm:max-w-sm">
              <Input
                id="portal-support-email"
                type="email"
                value={settings.supportEmail}
                onChange={(event) =>
                  setSettings((current) => ({ ...current, supportEmail: event.target.value }))
                }
                className="h-8"
              />
              <a
                href={`mailto:${settings.supportEmail}`}
                className="block truncate text-right text-xs text-primary underline-offset-2 hover:underline"
              >
                Email support
              </a>
            </div>
          </div>
          <div className="flex items-center justify-between gap-4 px-5 py-3.5">
            <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
              <Clock className="size-3.5 shrink-0 opacity-60" />
              Default time zone
            </div>
            <span className="shrink-0 font-mono text-xs tabular-nums">America/Chicago</span>
          </div>
          <div className="flex items-center justify-between gap-4 px-5 py-3.5">
            <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
              <Timer className="size-3.5 shrink-0 opacity-60" />
              Session timeout
            </div>
            <span className="shrink-0 font-mono text-xs tabular-nums">30 minutes</span>
          </div>
          {role === "admin" || role === "owner" ? (
            <div className="flex justify-end px-5 py-3.5">
              <Button
                size="sm"
                className="gap-1.5"
                onClick={() => void saveSettings()}
                disabled={savingSettings}
              >
                <Save className="size-3.5" />
                {savingSettings ? "Saving..." : "Save settings"}
              </Button>
            </div>
          ) : null}
        </div>
      </section>

      {/* ══════════ Danger Zone ══════════ */}
      {canReset && (
        <section className="relative overflow-hidden rounded-xl border border-red-500/20 bg-red-500/[0.02] dark:bg-red-950/10">
          {/* Inner glow */}
          <div className="pointer-events-none absolute inset-0 shadow-[inset_0_1px_40px_-20px_rgba(239,68,68,0.08)]" />

          <div className="relative z-10 flex flex-col gap-5 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
            <div className="flex items-start gap-3.5">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-red-500/10">
                <div className="relative">
                  <AlertTriangle className="size-5 text-red-500" />
                  <span className="absolute -right-0.5 -top-0.5 flex size-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                  </span>
                </div>
              </div>
              <div>
                <div className="text-sm font-semibold text-red-600 dark:text-red-400">
                  Danger Zone
                </div>
                <p className="mt-1.5 max-w-md text-xs leading-relaxed text-muted-foreground">
                  Permanently clears all operational data while preserving existing user accounts
                  and credentials. This action cannot be undone.
                </p>
              </div>
            </div>

            <AlertDialog open={open} onOpenChange={handleDialogChange}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  className="w-full shrink-0 gap-1.5 sm:w-auto shadow-sm"
                >
                  Reset system
                </Button>
              </AlertDialogTrigger>

              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset the entire system?</AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-500" />
                        <p className="text-xs leading-relaxed text-red-700 dark:text-red-400">
                          This will permanently delete all application data (invoices, loads,
                          approvals, commissions, etc.) while preserving user accounts. There is no
                          way to recover this data after reset.
                        </p>
                      </div>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>

                <div className="my-4 space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="reset-password" className="text-xs font-medium">
                      Re-enter your password
                    </Label>
                    <Input
                      id="reset-password"
                      type="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="reset-confirm" className="text-xs font-medium">
                      Type{" "}
                      <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] font-bold">
                        RESET
                      </code>{" "}
                      to confirm
                    </Label>
                    <Input
                      id="reset-confirm"
                      value={confirmation}
                      onChange={(e) => setConfirmation(e.target.value)}
                      placeholder="RESET"
                      autoComplete="off"
                      className={`h-9 font-mono transition-colors ${confirmation === "RESET" ? "border-red-500/50 text-red-600 dark:text-red-400" : ""}`}
                    />
                  </div>
                </div>

                <AlertDialogFooter className="flex-col-reverse gap-2 sm:flex-row">
                  <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={!password || confirmation !== "RESET" || processing}
                    onClick={() => void handleResetSystem()}
                    className="w-full bg-red-600 text-white hover:bg-red-700 sm:w-auto"
                  >
                    {processing ? "Resetting…" : "Confirm reset"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </section>
      )}
    </div>
  );
}
