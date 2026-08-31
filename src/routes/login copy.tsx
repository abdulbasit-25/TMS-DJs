import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth, AuthProvider } from "@/lib/auth-context";
import { usePortalSettings } from "@/hooks/use-portal-settings";
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";

const COMPANY_URL = "https://abdulbasit-archer.vercel.app/";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const Route = createFileRoute("/login")({
  head: () => ({
    title: "Agent Sign In | Archer Secure Agent Portal",
    meta: [
      {
        name: "description",
        content:
          "Sign in to the Archer secure agent portal to manage loads, carriers, and operations across the network.",
      },
      { property: "og:title", content: "Agent Sign In | Archer Secure Agent Portal" },
      {
        property: "og:description",
        content: "Secure agent portal access for dispatch, load tracking, and carrier operations.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://djsportal.vercel.app/login" },
      { property: "og:image", content: "https://djsportal.vercel.app/og-image.jpg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "Archer agent portal login screen preview" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Agent Sign In | Archer Secure Agent Portal" },
      {
        name: "twitter:description",
        content: "Secure agent portal access for dispatch, load tracking, and carrier operations.",
      },
      { name: "twitter:image", content: "https://djsportal.vercel.app/og-image.jpg" },
      { name: "twitter:image:alt", content: "Archer agent portal login screen preview" },
    ],
  }),
  component: () => (
    <AuthProvider>
      <LoginPage />
    </AuthProvider>
  ),
});

function LoginPage() {
  const { signIn, session } = useAuth();
  const { supportEmail } = usePortalSettings();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (session) navigate({ to: "/dashboard", replace: true });
  }, [session, navigate]);

  if (session) return null;

  function clearError() {
    if (error) setError(null);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      setError("Enter your email and password.");
      return;
    }
    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setError("That doesn't look like a valid email address.");
      return;
    }

    setSubmitting(true);
    try {
      await signIn(normalizedEmail, password);
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed. Please try again.");
      requestAnimationFrame(() => errorRef.current?.focus());
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout>
      {/* Header */}
      <div className="mb-5">
        <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-brand)]/20 bg-[var(--color-brand)]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-brand)]">
          <span className="relative flex size-1.5">
            <span className="motion-safe:absolute motion-safe:inline-flex motion-safe:h-full motion-safe:w-full motion-safe:animate-ping absolute h-full w-full rounded-full bg-current opacity-60" />
            <span className="relative inline-flex size-1.5 rounded-full bg-current" />
          </span>
          Agent access
        </span>
        <h1 className="mt-3 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          Welcome back
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign in to manage loads, lanes, and carriers.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {error && (
          <div ref={errorRef} tabIndex={-1} role="alert" className="outline-none">
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="email">Work email</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              autoFocus
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                clearError();
              }}
              disabled={submitting}
              aria-invalid={Boolean(error)}
              spellCheck={false}
              autoCapitalize="none"
              autoCorrect="off"
              className="h-11 pl-10"
              placeholder="you@company.com"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="password">Password</Label>
            <a
              href={`mailto:${supportEmail}?subject=Portal%20password%20reset`}
              className="rounded text-xs font-medium text-[var(--color-link)] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Forgot password?
            </a>
          </div>
          <div className="relative">
            <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                clearError();
              }}
              disabled={submitting}
              aria-invalid={Boolean(error)}
              className="h-11 pl-10 pr-10"
              placeholder="Enter your password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((p) => !p)}
              className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)] focus-visible:ring-inset"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          disabled={submitting}
          aria-busy={submitting}
          className="group h-11 w-full bg-[var(--color-cta-bg)] text-[var(--color-cta-text)] shadow-[0_8px_24px_color-mix(in_oklab,var(--color-cta-bg)_30%,transparent)] transition-all hover:bg-[var(--color-cta-bg-hover)] hover:shadow-[0_10px_32px_color-mix(in_oklab,var(--color-cta-bg)_40%,transparent)] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {submitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Signing in…
            </>
          ) : (
            <>
              Sign in
              <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </>
          )}
        </Button>
      </form>

      {/* Security footnote */}
      <div className="mt-5 flex items-start gap-2.5 rounded-lg border border-border/60 bg-[var(--color-bg-surface-2)]/60 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-[var(--color-success)]" />
        Internal use only. Unauthorized access is prohibited. All sign-in activity is monitored and
        logged.
      </div>
    </AuthLayout>
  );
}

/* ============================================================================
   Signature element — a postal-style "stamp" seal, the one thing this page
   should be remembered by. Curved type around a monogram, a perforated ring,
   and a wax-seal-style outer edge: the shipping/manifest vernacular doing
   double duty as unmistakable, permanent Archer attribution.
   ========================================================================== */

let stampInstance = 0;

function ArcherStamp({ size = 64, className = "" }: { size?: number; className?: string }) {
  const [pathId] = useState(() => `archer-stamp-path-${stampInstance++}`);

  return (
    <span
      role="img"
      aria-label="Archer seal"
      className={`inline-flex shrink-0 items-center justify-center rounded-full transition-transform duration-300 group-hover:rotate-3 group-hover:scale-105 ${className}`}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 100 100" width={size} height={size} className="overflow-visible">
        <defs>
          <path id={pathId} d="M 50,50 m -37,0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0" />
        </defs>
        <circle
          cx="50"
          cy="50"
          r="48"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.4"
          strokeWidth="1.5"
          strokeDasharray="1.5 3.6"
        />
        <circle
          cx="50"
          cy="50"
          r="37"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.9"
          strokeWidth="1"
        />
        <text fontSize="8.4" fontWeight="700" letterSpacing="2" fill="currentColor">
          <textPath href={`#${pathId}`} startOffset="0%">
            POWERED BY ARCHER • POWERED BY ARCHER •
          </textPath>
        </text>
        <circle
          cx="50"
          cy="50"
          r="17"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.9"
          strokeWidth="1"
        />
        <text
          x="50"
          y="56"
          textAnchor="middle"
          fontSize="19"
          fontWeight="800"
          fill="currentColor"
          fontFamily="ui-serif, Georgia, serif"
        >
          A
        </text>
      </svg>
    </span>
  );
}

function BrandLogo() {
  const { companyName } = usePortalSettings();

  return (
    <div className="flex items-center gap-2.5">
      <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[var(--plum-400)] to-[var(--plum-600)] text-white shadow-md">
        <LockKeyhole className="size-4" />
      </div>
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold tracking-tight">{companyName}</div>
        <div className="truncate text-[10px] uppercase tracking-[0.16em] opacity-60">
          Secure Agent Portal · TMS
        </div>
      </div>
    </div>
  );
}

/* Compact shipment ticket — replaces the old floating-chip card. Everything
   lives inside one bounded block so it can't push the panel past viewport
   height on shorter laptop screens. */
function ShipmentTicket() {
  return (
    <div className="mt-5 max-w-sm rounded-xl border border-white/10 bg-white/[0.05] p-3.5 shadow-lg shadow-black/30 backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-dashed border-white/10 pb-2.5">
        <span className="font-mono text-[10px] tracking-widest text-white/55">
          WAYBILL · LOAD-2481
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-success)]/15 px-2 py-0.5 text-[10px] font-semibold text-[var(--color-success)]">
          <span className="size-1.5 rounded-full bg-current" />
          In transit
        </span>
      </div>

      <div className="mt-2.5 flex items-center gap-2 text-[13px] font-medium text-white/90">
        <span>Chicago, IL</span>
        <svg viewBox="0 0 64 12" className="h-3 flex-1" aria-hidden="true">
          <line
            x1="1"
            y1="6"
            x2="63"
            y2="6"
            stroke="rgba(255,255,255,0.18)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <line
            x1="1"
            y1="6"
            x2="63"
            y2="6"
            stroke="var(--plum-400)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="4 6"
            className="dj-route-line"
          />
        </svg>
        <span>Dallas, TX</span>
      </div>

      <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-white/10">
        <div className="dj-load-progress h-full w-[68%] rounded-full bg-gradient-to-r from-[var(--color-brand)] to-[var(--indigo-500)]" />
      </div>

      <div className="mt-2 flex items-center justify-between text-[10.5px] text-white/50">
        <span>68% of route · ETA tomorrow, 9:40 AM</span>
        <span className="inline-flex items-center gap-1 font-semibold text-white/75">
          <BadgeCheck className="size-3.5 text-[var(--color-success)]" />
          $2,340
        </span>
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="text-base font-bold tracking-tight text-white">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-white/45">{label}</div>
    </div>
  );
}

function BrandPanel() {
  const { companyName } = usePortalSettings();

  return (
    <div className="relative hidden h-full flex-col justify-between overflow-y-auto bg-[var(--slate-950)] px-8 py-7 text-[#f4efe6] lg:flex xl:px-12 xl:py-9">
      {/* ── Ambient background: a route, not a glow ── */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="theme-grid-pattern absolute inset-0 text-white opacity-[0.04]" />
        <span className="absolute right-[-18%] top-[-8%] select-none font-serif text-[13rem] font-black italic leading-none tracking-tighter text-white/[0.035]">
          A
        </span>
        <svg
          viewBox="0 0 800 900"
          preserveAspectRatio="xMidYMid slice"
          className="absolute inset-0 h-full w-full"
          fill="none"
        >
          <path
            d="M-60 700 C 150 640, 260 520, 380 470 S 640 330, 860 160"
            stroke="white"
            strokeOpacity="0.1"
            strokeWidth="1.5"
            strokeDasharray="2 8"
            strokeLinecap="round"
          />
          <circle cx="180" cy="655" r="4" fill="white" fillOpacity="0.2" />
          <circle cx="380" cy="470" r="4" fill="var(--plum-400)" fillOpacity="0.6" />
          <circle cx="620" cy="330" r="4" fill="white" fillOpacity="0.2" />
          <circle cx="760" cy="205" r="7" stroke="white" strokeOpacity="0.25" strokeWidth="1.5" />
          <circle cx="760" cy="205" r="2.5" fill="var(--plum-400)" />
        </svg>
      </div>

      {/* ── Top row: wordmark + the Archer stamp, unmissable from the first glance ── */}
      <div className="relative flex items-start justify-between gap-4">
        <BrandLogo />
        <a
          href={COMPANY_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Powered by Archer — opens in a new tab"
          className="group flex items-center gap-2.5 rounded-full py-1 pl-1 pr-1 transition-colors hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        >
          <span className="text-right leading-tight">
            <span className="block text-[9px] font-semibold uppercase tracking-[0.22em] text-white/45">
              Powered by
            </span>
            <span className="block text-sm font-bold tracking-tight text-white/90 group-hover:text-white">
              ARCHER
            </span>
          </span>
          <ArcherStamp
            size={54}
            className="pointer-events-none text-white/70 group-hover:text-white"
          />
        </a>
      </div>

      {/* ── Middle: headline + shipment ticket ── */}
      <div className="relative max-w-md">
        <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.2em] text-[var(--indigo-200)]">
          Manifest · Nationwide agent network
        </p>
        <h2 className="mt-3 text-[1.65rem] font-bold leading-[1.15] tracking-tight sm:text-3xl xl:text-[2.1rem]">
          Every lane, every load, tracked{" "}
          <span className="bg-gradient-to-r from-[var(--indigo-200)] to-[var(--indigo-400)] bg-clip-text text-transparent">
            door to door.
          </span>
        </h2>
        <p className="mt-2.5 text-sm leading-relaxed text-[var(--color-text-secondary)]">
          Live rates, status pings, and paperwork — one dispatch view for every agent.
        </p>

        <ShipmentTicket />

        <div className="mt-5 flex items-center gap-5">
          <Stat value="1.2k+" label="loads moved" />
          <div className="h-6 w-px bg-white/10" />
          <Stat value="38" label="states covered" />
          <div className="h-6 w-px bg-white/10" />
          <Stat value="99.2%" label="on-time" />
        </div>
      </div>

      {/* ── Bottom: copyright + a plain-text Powered by Archer, belt-and-suspenders with the stamp above ── */}
      <div className="relative flex items-center justify-between text-[11px] text-white/35">
        <span>
          © {new Date().getFullYear()} {companyName}
        </span>
        <span className="font-mono uppercase tracking-[0.18em] text-white/40">
          Powered by Archer
        </span>
      </div>
    </div>
  );
}

/* ============================================================================
   Layout — fixed to the viewport height so the page never scrolls on a
   laptop screen; each column falls back to its own internal scroll only if
   a user's window is unusually short.
   ========================================================================== */

export function AuthLayout({ children }: { children: React.ReactNode }) {
  const { supportEmail } = usePortalSettings();

  return (
    <div className="grid h-dvh overflow-hidden lg:grid-cols-[1.05fr_1fr]">
      <BrandPanel />

      {/* Form side */}
      <div className="relative flex h-full flex-col items-center justify-center overflow-y-auto bg-background px-4 py-6 sm:px-6 lg:border-l lg:border-dashed lg:border-border">
        {/* Perforation notches — ties the two panels together like a torn ticket stub */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-10 hidden size-3 -translate-x-1/2 rounded-full bg-background lg:block"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-10 left-0 hidden size-3 -translate-x-1/2 rounded-full bg-background lg:block"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_45%_at_50%_0%,var(--color-bg-surface-2),transparent)]"
        />

        <div className="relative w-full max-w-md">
          {/* Mobile / tablet brand row — logo + Archer stamp stay visible and
              inline (not stacked) so the whole header stays compact below lg,
              where the dark BrandPanel is hidden. */}
          <div className="mb-4 flex items-center justify-between gap-3 lg:hidden">
            <BrandLogo />
            <a
              href={COMPANY_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Powered by Archer — opens in a new tab"
              className="group flex items-center gap-2 rounded-full py-1 pl-1 pr-1 transition-colors hover:bg-[var(--color-bg-surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)]"
            >
              <span className="text-right leading-tight">
                <span className="block text-[8px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Powered by
                </span>
                <span className="block text-xs font-bold tracking-tight text-foreground">
                  ARCHER
                </span>
              </span>
              <ArcherStamp size={40} className="pointer-events-none text-[var(--color-brand)]" />
            </a>
          </div>

          {/* Card with gradient accent strip */}
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xl shadow-black/[0.07]">
            <div
              aria-hidden="true"
              className="h-1 w-full bg-gradient-to-r from-[var(--indigo-400)] via-[var(--indigo-500)] to-[var(--indigo-400)]"
            />
            <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 p-5 duration-500 sm:p-7">
              {children}
            </div>
          </div>

          {/* Below card */}
          <div className="mt-4 text-center">
            <p className="text-xs text-muted-foreground">
              Locked out of your account?{" "}
              <a
                href={`mailto:${supportEmail}?subject=Portal%20access%20issue`}
                className="rounded font-medium text-[var(--color-link)] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                Contact dispatch
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
