import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  Building2,
  FileText,
  Truck,
  Package,
  DollarSign,
  ClipboardCheck,
  BarChart3,
  Bell,
  Shield,
  FolderOpen,
  CalendarClock,
  UserCheck,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  CircleUser,
  Search,
  Check,
  AlertTriangle,
  Inbox,
  MoonStar,
  Sun,
  PanelLeftClose,
  PanelLeftOpen,
  Clock3,
  MoreVertical,
  Sparkles,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { can, ROLE_LABELS, type Role } from "@/lib/roles";
import { useNotifications, type NotificationItem } from "@/hooks/use-notifications";
import { recordUrl } from "@/lib/notification-ui";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { relative } from "@/lib/format";
import { usePortalSettings } from "@/hooks/use-portal-settings";

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  cap: Parameters<typeof can>[1];
  section: "Operate" | "Records" | "Admin";
  adminOnly?: boolean;
};

const NAV: NavItem[] = [
  {
    to: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    cap: "dashboard",
    section: "Operate",
  },
  {
    to: "/approvals",
    label: "Approvals",
    icon: ClipboardCheck,
    cap: "approvals",
    section: "Operate",
  },
  {
    to: "/activity",
    label: "Daily Activity",
    icon: CalendarClock,
    cap: "activity",
    section: "Operate",
  },
  {
    to: "/notifications",
    label: "Notifications",
    icon: Bell,
    cap: "notifications",
    section: "Operate",
  },
  { to: "/leads", label: "Leads", icon: UserCheck, cap: "leads", section: "Records" },
  {
    to: "/followups",
    label: "Follow-ups",
    icon: ClipboardCheck,
    cap: "followups",
    section: "Records",
  },
  { to: "/customers", label: "Customers", icon: Building2, cap: "customers", section: "Records" },
  { to: "/quotes", label: "Quotes", icon: FileText, cap: "quotes", section: "Records" },
  { to: "/carriers", label: "Carriers", icon: Truck, cap: "carriers", section: "Records" },
  { to: "/loads", label: "Loads", icon: Package, cap: "loads", section: "Records" },
  {
    to: "/commissions",
    label: "Commissions",
    icon: DollarSign,
    cap: "commissions",
    section: "Records",
  },
  { to: "/invoices", label: "Invoices", icon: FileText, cap: "invoices", section: "Records" },
  {
    to: "/straight-bill-of-lading",
    label: "Straight Bill of Lading",
    icon: FileText,
    cap: "loads",
    section: "Records",
  },
  {
    to: "/customer-invoice",
    label: "Customer Invoice",
    icon: FileText,
    cap: "invoices",
    section: "Records",
  },
  {
    to: "/load-tender",
    label: "Load Tender",
    icon: Package,
    cap: "loads",
    section: "Records",
  },
  {
    to: "/carrier-rate-confirmation",
    label: "Carrier Rate Confirmation",
    icon: Truck,
    cap: "carriers",
    section: "Records",
  },
  { to: "/users", label: "Users", icon: Users, cap: "users", section: "Admin" },
  { to: "/teams", label: "Teams", icon: Users, cap: "teams", section: "Admin" },
  { to: "/audit", label: "Session Log", icon: Shield, cap: "audit", section: "Admin" },
  { to: "/admin", label: "Admin Panel", icon: Settings, cap: "admin", section: "Admin" },
  {
    to: "/admin/data-deletion",
    label: "Deletion Panel",
    icon: AlertTriangle,
    cap: "admin",
    section: "Admin",
    adminOnly: true,
  },
];

const ROLE_OPTIONS: Role[] = [
  "owner",
  "admin",
  "ops_manager",
  "team_manager",
  "leadagent",
  "agent",
  "trainee",
  "accounting",
  "suspended",
];
type ThemeMode = "dark" | "light";

function getStoredTheme(): ThemeMode {
  if (typeof window === "undefined") return "dark";
  const stored = window.localStorage.getItem("theme");
  if (stored === "dark" || stored === "light") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: ThemeMode) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", theme);
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
  window.localStorage.setItem("theme", theme);
}

/* ═══════════════════════════════════════════════════════════════════════ */
/*  MAIN SHELL                                                           */
/* ═══════════════════════════════════════════════════════════════════════ */

export function AppShell({ children }: { children: ReactNode }) {
  const { session, setRole, signOut } = useAuth();
  const { companyName } = usePortalSettings();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [globalSearchValue, setGlobalSearchValue] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("sidebar-collapsed") === "true";
  });
  const [theme, setTheme] = useState<ThemeMode>(() => getStoredTheme());
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("sidebar-collapsed", String(sidebarCollapsed));
    }
  }, [sidebarCollapsed]);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const role = session?.role ?? "agent";
  const { notifications: notifItems, unreadCount, markRead, markAllRead } = useNotifications();

  function handleGlobalSearch(term: string) {
    const trimmed = term.trim();
    if (!trimmed) return;
    setMobileSearchOpen(false);
    setGlobalSearchValue(trimmed);
    if (typeof window !== "undefined") {
      const nextUrl = new URL("/search", window.location.origin);
      nextUrl.searchParams.set("q", trimmed);
      window.location.assign(nextUrl.toString());
    }
  }

  async function handleSignOut(force = false) {
    try {
      await signOut(force);
      navigate({ to: "/login" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to sign out.");
    }
  }

  const visibleNav = useMemo(
    () => NAV.filter((n) => can(role, n.cap) && (!n.adminOnly || role === "admin")),
    [role],
  );

  /* ── Suspended state ── */
  if (role === "suspended") {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-destructive/20 bg-card shadow-2xl shadow-destructive/5">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-destructive/[0.04] via-transparent to-transparent" />
          <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-destructive/5 blur-3xl" />
          <div className="relative p-8 text-center">
            <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-destructive/10 ring-1 ring-destructive/20">
              <AlertTriangle className="size-8 text-destructive" />
            </div>
            <h1 className="mt-5 text-xl font-bold tracking-tight">Account Suspended</h1>
            <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
              This account has no access to the portal. Contact an administrator for assistance.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-2.5 sm:flex-row">
              <RoleSwitcher inline />
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={() => void handleSignOut(true)}
              >
                <LogOut className="mr-2 size-4" />
                Sign out
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const grouped = {
    Operate: visibleNav.filter((n) => n.section === "Operate"),
    Records: visibleNav.filter((n) => n.section === "Records"),
    Admin: visibleNav.filter((n) => n.section === "Admin"),
  };

  return (
    <div className="flex h-screen min-h-0 w-full overflow-hidden bg-background">
      {/* ── Sidebar — desktop ── */}
      <aside
        className={cn(
          "hidden h-full min-h-0 shrink-0 flex-col border-r border-border/50 bg-sidebar transition-all duration-300 ease-out lg:flex",
          sidebarCollapsed ? "w-[68px]" : "w-[248px]",
        )}
      >
        <SidebarBrand
          collapsed={sidebarCollapsed}
          companyName={companyName}
          onToggle={() => setSidebarCollapsed((c) => !c)}
        />
        <SidebarNav
          grouped={grouped}
          pathname={pathname}
          unreadCount={unreadCount}
          collapsed={sidebarCollapsed}
        />
        {/* Bottom area */}
        <div className="mt-auto border-t border-border/40 p-2">
          <SidebarFooter collapsed={sidebarCollapsed} />
        </div>
      </aside>

      {/* ── Sidebar — mobile ── */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="flex h-full w-[280px] min-h-0 flex-col border-border/50 bg-sidebar p-0"
        >
          <SidebarBrand collapsed={false} companyName={companyName} showToggle={false} />
          <SidebarNav
            grouped={grouped}
            pathname={pathname}
            unreadCount={unreadCount}
            onNavigate={() => setMobileOpen(false)}
          />
          <div className="mt-auto border-t border-border/40 p-2">
            <SidebarFooter collapsed={false} />
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Main area ── */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {/* ── Header ── */}
        <header className="relative z-20 border-b border-border/50 bg-background/80 backdrop-blur-xl">
          <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-5 sm:py-3">
            {/* Mobile menu */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-xl lg:hidden"
                onClick={() => setMobileOpen(true)}
                aria-label="Open menu"
              >
                <Menu className="size-5" />
              </Button>
            </div>

            {/* Search */}
            <div className="min-w-0">
              <div className="relative hidden max-w-lg md:block">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/50" />
                <Input
                  type="search"
                  value={globalSearchValue}
                  onChange={(e) => setGlobalSearchValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleGlobalSearch(globalSearchValue);
                    }
                  }}
                  placeholder="Search loads, customers, carriers…"
                  className="h-9 rounded-xl border-border/50 bg-muted/30 pl-9 text-sm transition-all placeholder:text-muted-foreground/40 focus:border-primary/40 focus:bg-background focus:ring-2 focus:ring-primary/10"
                />
                <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-border/50 bg-muted/50 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground/50 sm:inline-block">
                  ⌘K
                </kbd>
              </div>
            </div>

            {/* Actions */}
            <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-xl md:hidden"
                aria-label="Search"
                onClick={() => setMobileSearchOpen(true)}
              >
                <Search className="size-5" />
              </Button>

              <div className="hidden items-center gap-1.5 md:flex">
                <ThemeToggle
                  theme={theme}
                  onToggle={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
                />
                <SessionMonitor />
                <RoleSwitcher />
              </div>

              <MobileMoreMenu
                theme={theme}
                onToggleTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
              />

              <NotificationsBell
                notifications={notifItems}
                unreadCount={unreadCount}
                onMarkRead={(id) => void markRead(id)}
                onMarkAllRead={() => void markAllRead()}
              />
              <UserMenu />
            </div>
          </div>
        </header>

        {/* ── Content ── */}
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1600px] p-4 md:p-6 lg:p-8">{children}</div>
        </main>
      </div>

      {/* ── Mobile search dialog ── */}
      <Dialog open={mobileSearchOpen} onOpenChange={setMobileSearchOpen}>
        <DialogContent className="top-[12%] translate-y-0 rounded-2xl border-0 p-0 shadow-2xl sm:max-w-md">
          <div className="p-5 pb-3">
            <DialogTitle className="flex items-center gap-2.5 text-base font-semibold">
              <Search className="size-4 text-muted-foreground" />
              Search
            </DialogTitle>
          </div>
          <div className="px-5 pb-5">
            <div className="relative">
              <Input
                autoFocus
                type="search"
                value={globalSearchValue}
                onChange={(e) => setGlobalSearchValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleGlobalSearch(globalSearchValue);
                  }
                }}
                placeholder="Search loads, customers, carriers, agents…"
                className="h-11 rounded-xl border-border/50 bg-muted/30 pl-4 text-sm transition-all focus:border-primary/40 focus:bg-background focus:ring-2 focus:ring-primary/10"
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════ */
/*  THEME TOGGLE                                                         */
/* ═══════════════════════════════════════════════════════════════════════ */

function ThemeToggle({ theme, onToggle }: { theme: ThemeMode; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="relative flex size-9 items-center justify-center rounded-xl border border-border/50 bg-muted/20 text-muted-foreground transition-all hover:border-border hover:bg-muted/40 hover:text-foreground"
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      <Sun
        className={cn(
          "size-4 transition-all duration-300",
          theme === "light" ? "rotate-0 scale-100" : "-rotate-90 scale-0",
        )}
      />
      <MoonStar
        className={cn(
          "absolute size-4 transition-all duration-300",
          theme === "dark" ? "rotate-0 scale-100" : "rotate-90 scale-0",
        )}
      />
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════════════ */
/*  MOBILE MORE MENU                                                     */
/* ═══════════════════════════════════════════════════════════════════════ */

function MobileMoreMenu({ theme, onToggleTheme }: { theme: ThemeMode; onToggleTheme: () => void }) {
  const { session, setRole, sessionStatus, loading } = useAuth();
  const role = session?.role ?? "agent";
  const canSwitchRole = (["admin", "owner"] as Role[]).includes(role);

  const dotClass = {
    active: "bg-emerald-500",
    paused: "bg-amber-500",
    expired: "bg-red-500",
  }[sessionStatus ?? "active"];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-xl md:hidden"
          aria-label="More options"
        >
          <MoreVertical className="size-5" />
          {!loading && session && (
            <span
              className={cn(
                "absolute right-1.5 top-1.5 size-1.5 rounded-full ring-2 ring-background",
                dotClass,
              )}
            />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 rounded-xl">
        <DropdownMenuItem onClick={onToggleTheme} className="rounded-lg">
          {theme === "dark" ? (
            <Sun className="mr-2.5 size-4" />
          ) : (
            <MoonStar className="mr-2.5 size-4" />
          )}
          Switch to {theme === "dark" ? "light" : "dark"} mode
        </DropdownMenuItem>
        {!loading && session && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="flex items-center gap-2 text-xs font-normal text-muted-foreground">
              <span className={cn("size-2 rounded-full ring-2 ring-background", dotClass)} />
              Session: {sessionStatus}
            </DropdownMenuLabel>
          </>
        )}
        {canSwitchRole && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Preview as role</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={role} onValueChange={(v) => setRole(v as Role)}>
              {ROLE_OPTIONS.map((r) => (
                <DropdownMenuRadioItem key={r} value={r} className="rounded-lg">
                  {ROLE_LABELS[r]}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ═══════════════════════════════════════════════════════════════════════ */
/*  SIDEBAR BRAND                                                        */
/* ═══════════════════════════════════════════════════════════════════════ */

function SidebarBrand({
  collapsed,
  companyName,
  onToggle,
  showToggle = true,
}: {
  collapsed: boolean;
  companyName: string;
  onToggle?: () => void;
  showToggle?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative flex h-16 items-center border-b border-border/40",
        collapsed ? "justify-center px-2" : "gap-3 px-4",
      )}
    >
      {showToggle && (
        <button
          onClick={onToggle}
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground/60 transition-all hover:bg-muted/50 hover:text-foreground",
            collapsed && "absolute right-2 top-1/2 -translate-y-1/2",
          )}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
        </button>
      )}
      {!collapsed && (
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-primary/70 text-[11px] font-bold text-primary-foreground shadow-sm shadow-primary/20 ring-1 ring-white/10">
            {companyName
              .split(" ")
              .map((w) => w[0])
              .join("")
              .slice(0, 2)
              .toUpperCase() || "TMS"}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-bold tracking-tight text-sidebar-foreground">
              {companyName}
            </div>
            <div className="truncate text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/50">
              Agent Portal
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════ */
/*  SIDEBAR NAV                                                          */
/* ═══════════════════════════════════════════════════════════════════════ */

function SidebarNav({
  grouped,
  pathname,
  unreadCount = 0,
  onNavigate,
  collapsed = false,
}: {
  grouped: Record<string, NavItem[]>;
  pathname: string;
  unreadCount?: number;
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  return (
    <nav className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-2 py-3">
      {Object.entries(grouped).map(([section, items]) =>
        items.length === 0 ? null : (
          <div key={section} className="mb-5">
            {!collapsed && (
              <div className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/40">
                {section}
              </div>
            )}
            <ul className="space-y-0.5">
              {items.map((item) => {
                const active = pathname === item.to || pathname.startsWith(item.to + "/");
                return (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      onClick={onNavigate}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        "group relative flex items-center rounded-xl text-sm font-medium transition-all duration-200",
                        collapsed ? "justify-center px-0 py-2" : "gap-3 px-3 py-2",
                        active
                          ? "bg-primary/10 text-primary"
                          : "text-sidebar-foreground/60 hover:bg-muted/50 hover:text-sidebar-foreground",
                      )}
                    >
                      {/* Active indicator bar */}
                      {active && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-primary shadow-sm shadow-primary/50" />
                      )}

                      <item.icon
                        className={cn(
                          "size-[18px] shrink-0 transition-colors",
                          active
                            ? "text-primary"
                            : "text-muted-foreground/50 group-hover:text-muted-foreground",
                        )}
                      />

                      {!collapsed && (
                        <>
                          <span className="truncate text-[13px]">{item.label}</span>
                          {item.to === "/notifications" && unreadCount > 0 && (
                            <span className="ml-auto flex min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground shadow-sm shadow-primary/30">
                              {unreadCount > 99 ? "99+" : unreadCount}
                            </span>
                          )}
                        </>
                      )}

                      {collapsed && item.to === "/notifications" && unreadCount > 0 && (
                        <span className="absolute -right-0.5 -top-0.5 flex min-w-[16px] items-center justify-center rounded-full bg-primary px-1 py-0.5 text-[8px] font-bold text-primary-foreground shadow-sm shadow-primary/30">
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ),
      )}
    </nav>
  );
}

/* ═══════════════════════════════════════════════════════════════════════ */
/*  SIDEBAR FOOTER                                                       */
/* ═══════════════════════════════════════════════════════════════════════ */

function SidebarFooter({ collapsed }: { collapsed: boolean }) {
  const { session, signOut, clockedIn } = useAuth();
  const navigate = useNavigate();
  const [showClockOutDialog, setShowClockOutDialog] = useState(false);

  const initials = (session?.name ?? "AG")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  async function handleSignOut() {
    if (clockedIn) {
      setShowClockOutDialog(true);
      return;
    }
    try {
      await signOut();
      navigate({ to: "/login" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to sign out.");
    }
  }

  if (collapsed) {
    return (
      <Link
        to="/profile"
        className="group flex justify-center rounded-xl py-2 transition-colors hover:bg-muted/50"
        title={session?.name}
      >
        <div className="relative grid size-8 place-items-center rounded-full bg-gradient-to-br from-primary/20 to-primary/10 ring-2 ring-primary/20 transition-all group-hover:ring-primary/40">
          <span className="text-[10px] font-bold text-primary">{initials}</span>
        </div>
      </Link>
    );
  }

  return (
    <>
      <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-muted/40">
        <div className="relative grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary/20 to-primary/10 ring-2 ring-primary/20">
          <span className="text-xs font-bold text-primary">{initials}</span>
          <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-sidebar bg-emerald-500" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-sidebar-foreground">
            {session?.name}
          </div>
          <div className="truncate text-[11px] text-muted-foreground/60">{session?.email}</div>
        </div>
        <button
          onClick={() => void handleSignOut()}
          className="flex size-8 items-center justify-center rounded-lg text-muted-foreground/50 transition-all hover:bg-red-500/10 hover:text-red-500"
          aria-label="Sign out"
        >
          <LogOut className="size-4" />
        </button>
      </div>

      <ClockOutDialog open={showClockOutDialog} onOpenChange={setShowClockOutDialog} />
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════ */
/*  SESSION MONITOR                                                      */
/* ═══════════════════════════════════════════════════════════════════════ */

function SessionMonitor() {
  const { session, loading, sessionStatus } = useAuth();
  if (loading || !session) return null;

  const config = {
    active: {
      label: "Active",
      dot: "bg-emerald-500",
      bg: "bg-emerald-500/10 border-emerald-500/20",
      text: "text-emerald-600 dark:text-emerald-400",
      icon: "text-emerald-500",
    },
    paused: {
      label: "Paused",
      dot: "bg-amber-500",
      bg: "bg-amber-500/10 border-amber-500/20",
      text: "text-amber-600 dark:text-amber-400",
      icon: "text-amber-500",
    },
    expired: {
      label: "Expired",
      dot: "bg-red-500",
      bg: "bg-red-500/10 border-red-500/20",
      text: "text-red-600 dark:text-red-400",
      icon: "text-red-500",
    },
  }[sessionStatus];

  return (
    <div className={cn("flex items-center gap-2 rounded-xl border px-3 py-1.5", config.bg)}>
      <Clock3 className={cn("size-3.5", config.icon)} />
      <span className={cn("size-1.5 rounded-full", config.dot)} />
      <span className={cn("text-xs font-semibold", config.text)}>{config.label}</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════ */
/*  ROLE SWITCHER                                                        */
/* ═══════════════════════════════════════════════════════════════════════ */

function RoleSwitcher({ inline }: { inline?: boolean } = {}) {
  const { session, setRole } = useAuth();
  const role = session?.role ?? "agent";
  if (!(["admin", "owner"] as Role[]).includes(role)) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-2 rounded-xl border border-border/50 bg-muted/20 px-3 py-1.5 text-xs font-medium transition-all hover:border-border hover:bg-muted/40",
            inline && "w-full sm:w-auto",
          )}
        >
          <CircleUser className="size-3.5 text-primary" />
          <span className="hidden lg:inline text-muted-foreground/70">Viewing as</span>
          <span className="font-semibold">{ROLE_LABELS[role]}</span>
          <ChevronDown className="size-3 text-muted-foreground/50" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 rounded-xl">
        <DropdownMenuLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/50">
          Preview as role
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={role} onValueChange={(v) => setRole(v as Role)}>
          {ROLE_OPTIONS.map((r) => (
            <DropdownMenuRadioItem key={r} value={r} className="rounded-lg">
              {ROLE_LABELS[r]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ═══════════════════════════════════════════════════════════════════════ */
/*  NOTIFICATIONS BELL                                                   */
/* ═══════════════════════════════════════════════════════════════════════ */

function NotificationsBell({
  notifications,
  unreadCount,
  onMarkRead,
  onMarkAllRead,
}: {
  notifications: NotificationItem[];
  unreadCount: number;
  onMarkRead: (id?: string) => void;
  onMarkAllRead: () => void;
}) {
  const navigate = useNavigate();
  const top5 = notifications.slice(0, 5);

  function handleClick(n: NotificationItem) {
    if (!n.isRead) onMarkRead(n.id);
    const url = n.actionUrl ?? recordUrl(n.recordType, n.recordId);
    if (url) navigate({ to: url });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="relative flex size-9 items-center justify-center rounded-xl border border-border/50 bg-muted/20 text-muted-foreground transition-all hover:border-border hover:bg-muted/40 hover:text-foreground"
          aria-label="Notifications"
        >
          <Bell className="size-[18px]" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex min-w-[18px] items-center justify-center rounded-full bg-primary px-1 py-0.5 text-[10px] font-bold text-primary-foreground shadow-lg shadow-primary/30 ring-2 ring-background">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[calc(100vw-1.5rem)] max-w-80 rounded-xl p-0 sm:w-80"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/40 px-4 py-3">
          <div className="flex items-center gap-2">
            <Bell className="size-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Notifications</span>
            {unreadCount > 0 && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              className="rounded-lg px-2 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-primary/5"
              onClick={onMarkAllRead}
            >
              Mark all read
            </button>
          )}
        </div>

        {/* List */}
        <div className="max-h-80 overflow-y-auto">
          {top5.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground/50">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-muted/30">
                <Inbox className="size-5" />
              </div>
              <p className="mt-3 text-sm font-medium">All caught up</p>
              <p className="mt-0.5 text-xs">No new notifications</p>
            </div>
          ) : (
            top5.map((n) => (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className={cn(
                  "flex w-full items-start gap-3 border-b border-border/20 px-4 py-3 text-left transition-colors last:border-0 hover:bg-muted/30",
                  !n.isRead && "bg-primary/[0.03]",
                )}
              >
                <span
                  className={cn(
                    "mt-2 size-2 shrink-0 rounded-full transition-colors",
                    n.isRead ? "bg-muted-foreground/20" : "bg-primary shadow-sm shadow-primary/50",
                  )}
                />
                <div className="min-w-0 flex-1">
                  <div className={cn("truncate text-sm", !n.isRead && "font-semibold")}>
                    {n.title}
                  </div>
                  <div className="mt-0.5 truncate text-xs text-muted-foreground/70">
                    {n.message}
                  </div>
                  <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground/40">
                    <Clock3 className="size-2.5" />
                    {relative(n.createdAt)}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="border-t border-border/40 p-2">
            <DropdownMenuItem asChild className="rounded-lg justify-center">
              <Link to="/notifications" className="w-full text-xs font-medium">
                View all notifications
              </Link>
            </DropdownMenuItem>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ═══════════════════════════════════════════════════════════════════════ */
/*  USER MENU                                                            */
/* ═══════════════════════════════════════════════════════════════════════ */

function UserMenu() {
  const { session, signOut, clockedIn } = useAuth();
  const navigate = useNavigate();
  const [showClockOutDialog, setShowClockOutDialog] = useState(false);

  const initials = (session?.name ?? "AG")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  async function handleSignOut() {
    if (clockedIn) {
      setShowClockOutDialog(true);
      return;
    }
    try {
      await signOut();
      navigate({ to: "/login" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to sign out.");
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="relative flex size-9 items-center justify-center rounded-xl text-foreground transition-all hover:bg-muted/50"
            aria-label="User menu"
          >
            <div className="grid size-7 place-items-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-[10px] font-bold text-primary-foreground ring-2 ring-primary/20 transition-all hover:ring-primary/40">
              {initials}
            </div>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 rounded-xl p-1">
          <div className="px-3 py-2.5">
            <div className="truncate text-sm font-semibold">{session?.name}</div>
            <div className="truncate text-xs text-muted-foreground/60">{session?.email}</div>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild className="rounded-lg">
            <a href="/profile" className="flex items-center">
              <CircleUser className="mr-2.5 size-4 text-muted-foreground/60" />
              <span>My profile</span>
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="rounded-lg">
            <Link to="/admin" className="flex items-center">
              <Settings className="mr-2.5 size-4 text-muted-foreground/60" />
              <span>Settings</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => void handleSignOut()}
            className="rounded-lg bg-red-50/80 text-red-600 hover:bg-red-100 hover:text-red-700 focus:bg-red-100 focus:text-red-700 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/50 dark:hover:text-red-300 dark:focus:bg-red-950/50 dark:focus:text-red-300"
          >
            <LogOut className="mr-2.5 size-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ClockOutDialog open={showClockOutDialog} onOpenChange={setShowClockOutDialog} />
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════ */
/*  CLOCK-OUT DIALOG                                                     */
/* ═══════════════════════════════════════════════════════════════════════ */

function ClockOutDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden rounded-2xl border-0 p-0 shadow-2xl sm:max-w-md">
        <div className="h-1 w-full bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500" />
        <div className="p-6">
          <DialogHeader className="space-y-4">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/15 to-orange-500/15 ring-1 ring-amber-500/20">
              <AlertTriangle className="size-7 text-amber-500" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold tracking-tight">
                Clock out first
              </DialogTitle>
              <DialogDescription className="mt-2 text-sm leading-relaxed">
                You&apos;re still checked in. Please end your session from Daily Activity before
                signing out so your activity is recorded correctly.
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="mt-5 rounded-xl border border-border/50 bg-muted/20 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="size-4 text-amber-500" />
              Why this matters
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Finishing your session before you leave keeps your daily log accurate and prevents
              gaps in your activity history.
            </p>
          </div>

          <DialogFooter className="mt-6 flex-col-reverse gap-2.5 sm:flex-row sm:gap-2.5">
            <Button
              variant="outline"
              className="w-full rounded-xl sm:w-auto"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              className="w-full rounded-xl shadow-lg shadow-primary/10 sm:w-auto"
              onClick={() => {
                onOpenChange(false);
                navigate({ to: "/activity" });
              }}
            >
              Go to Daily Activity
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
