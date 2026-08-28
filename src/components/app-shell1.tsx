import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth, AuthProvider } from "@/lib/auth-context";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";

const COMPANY_URL = "https://djsfreightbroker.com/";
const SUPPORT_MAILTO = "mailto:dispatch@djsfreightbroker.com?subject=Portal%20password%20reset";
const REMEMBERED_EMAIL_KEY = "djfb.remembered-email";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** SSR/private-mode safe localStorage read. */
function readRememberedEmail(): string {
  try {
    return localStorage.getItem(REMEMBERED_EMAIL_KEY) ?? "";
  } catch {
    return "";
  }
}

export const Route = createFileRoute("/login")({
  component: () => (
    <AuthProvider>
      <LoginPage />
    </AuthProvider>
  ),
});

function LoginPage() {
  const { signIn, session } = useAuth();
  const navigate = useNavigate();

  // Read storage ONCE; drives prefill, checkbox, and autofocus target.
  const rememberedEmail = useMemo(() => readRememberedEmail(), []);
  const passwordGetsAutofocus = rememberedEmail !== "";

  const [email, setEmail] = useState(rememberedEmail);
  const [password, setPassword] = useState("");
  const [rememberEmail, setRememberEmail] = useState(passwordGetsAutofocus);
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorNonce, setErrorNonce] = useState(0); // increments on every failure
  const [submitting, setSubmitting] = useState(false);
  const [capsLock, setCapsLock] = useState(false);

  const errorRef = useRef<HTMLDivElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (session) navigate({ to: "/dashboard", replace: true });
  }, [session, navigate]);

  // FIX: keyed on the nonce (not the message), so a REPEATED failure still
  // moves focus. The alert wrapper below uses key={errorNonce}, which also
  // remounts it — replaying the shake animation on every failure.
  useEffect(() => {
    if (errorNonce > 0) errorRef.current?.focus();
  }, [errorNonce]);

  if (session) return null;

  function fail(message: string) {
    setError(message);
    setErrorNonce((n) => n + 1);
  }

  function validateEmail(value: string): string | null {
    if (!value) return "Email is required.";
    if (!EMAIL_PATTERN.test(value)) return "Enter a valid email address.";
    return null;
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;

    const normalizedEmail = email.trim().toLowerCase();

    // Email problems → inline under the field, focus the field.
    const emailErr = validateEmail(normalizedEmail);
    if (emailErr) {
      setEmailError(emailErr);
      emailRef.current?.focus();
      return;
    }

    // FIX: correct message when only the password is missing.
    if (!password) {
      fail("Enter your password.");
      return;
    }

    setEmailError(null);
    setError(null);

    setSubmitting(true);
    try {
      await signIn(normalizedEmail, password);
      try {
        if (rememberEmail) {
          localStorage.setItem(REMEMBERED_EMAIL_KEY, normalizedEmail);
        } else {
          localStorage.removeItem(REMEMBERED_EMAIL_KEY);
        }
      } catch {
        /* storage unavailable (private mode) — non-fatal */
      }
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      // Generic message — don't reveal whether an account exists.
      fail(err instanceof Error ? err.message : "Sign in failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const fieldStagger = "animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-backwards";

  return (
    <AuthLayout>
      {/* Header */}
      <div className={`mb-7 ${fieldStagger}`}>
        <span className="inline-flex items-center gap-2 rounded-full border border-[var(--plum-500)]/30 bg-[var(--plum-500)]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-cta-bg)]">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />
            <span className="relative inline-flex size-1.5 rounded-full bg-current" />
          </span>
          Agent access
        </span>
        <h1 className="mt-3.5 text-2xl font-bold tracking-tight text-foreground">Welcome back</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Sign in to manage loads, lanes, and carriers.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        {error && (
          /* key forces remount on every failure → shake + SR announcement replay */
          <div
            key={errorNonce}
            ref={errorRef}
            tabIndex={-1}
            role="alert"
            className="dj-shake outline-none"
          >
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        )}

        <div className={`space-y-2 ${fieldStagger} [animation-delay:70ms]`}>
          <Label htmlFor="email">Work email</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={emailRef}
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="username"
              autoFocus={!passwordGetsAutofocus}
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) setEmailError(null);
                if (error) setError(null);
              }}
              onBlur={() => {
                const value = email.trim().toLowerCase();
                if (value) setEmailError(validateEmail(value));
              }}
              disabled={submitting}
              aria-invalid={Boolean(emailError)}
              aria-describedby={emailError ? "login-email-error" : undefined}
              spellCheck={false}
              autoCapitalize="none"
              autoCorrect="off"
              className="h-11 pl-10"
              placeholder="you@djsfreightbroker.com"
            />
          </div>
          {emailError && (
            <p id="login-email-error" className="text-xs text-destructive">
              {emailError}
            </p>
          )}
        </div>

        <div className={`space-y-2 ${fieldStagger} [animation-delay:140ms]`}>
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              autoFocus={passwordGetsAutofocus}
              required
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError(null);
              }}
              onKeyDown={(e) => setCapsLock(e.getModifierState("CapsLock"))}
              onKeyUp={(e) => setCapsLock(e.getModifierState("CapsLock"))}
              onBlur={() => setCapsLock(false)}
              disabled={submitting}
              aria-invalid={Boolean(error)}
              aria-describedby={capsLock ? "login-caps-hint" : undefined}
              className="h-11 pl-10 pr-10"
              placeholder="Enter your password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((p) => !p)}
              className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>

          {capsLock && (
            <p
              id="login-caps-hint"
              role="status"
              className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-warning)]"
            >
              <AlertTriangle className="size-3.5" />
              Caps Lock is on
            </p>
          )}

          <div className="flex items-center justify-between pt-0.5">
            <label className="flex cursor-pointer select-none items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={rememberEmail}
                onChange={(e) => setRememberEmail(e.target.checked)}
                disabled={submitting}
                className="size-3.5 accent-[var(--color-brand)]"
              />
              Remember email
            </label>
            <a
              href={SUPPORT_MAILTO}
              className="text-xs font-medium text-[var(--color-link)] underline-offset-4 hover:underline"
            >
              Forgot password?
            </a>
          </div>
        </div>

        <Button
          type="submit"
          disabled={submitting}
          aria-busy={submitting}
          className={`group h-11 w-full bg-gradient-to-r from-[var(--plum-600)] to-[var(--plum-400)] text-white shadow-[0_8px_24px_color-mix(in_oklab,var(--plum-500)_30%,transparent)] transition-all hover:shadow-[0_10px_32px_color-mix(in_oklab,var(--plum-500)_40%,transparent)] hover:brightness-110 active:scale-[0.99] ${fieldStagger} [animation-delay:210ms]`}
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
      <div
        className={`mt-6 flex items-start gap-2.5 rounded-lg border border-border/60 bg-[var(--color-bg-surface-2)]/60 px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground ${fieldStagger} [animation-delay:280ms]`}
      >
        <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-[var(--color-success)]" />
        Internal use only. Unauthorized access is prohibited. All sign-in activity is monitored and
        logged.
      </div>
    </AuthLayout>
  );
}

/* ============================================================================
   Brand panel — dark "mission control" scene
   ========================================================================== */

function BrandLogo({ glow = false }: { glow?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        {glow && (
          <div className="absolute inset-0 rounded-xl bg-[var(--plum-500)] opacity-40 blur-lg" />
        )}
        <div className="relative grid size-10 place-items-center rounded-xl bg-gradient-to-br from-[var(--plum-400)] to-[var(--plum-600)] text-white shadow-lg">
          <LockKeyhole className="size-[18px]" />
        </div>
      </div>
      <div>
        <div className="text-sm font-semibold tracking-tight">DJ's Freight Broker LLC</div>
        <div className="text-[10px] uppercase tracking-[0.18em] opacity-60">
          Secure Agent Portal · TMS
        </div>
      </div>
    </div>
  );
}

function CompanyLink({ className }: { className?: string }) {
  return (
    <a href={COMPANY_URL} target="_blank" rel="noopener noreferrer" className={className}>
      Visit djsfreightbroker.com
      <ArrowUpRight className="size-3.5" />
    </a>
  );
}

function LoadCard() {
  return (
    <div className="relative mt-10 max-w-sm">
      <div className="animate-in fade-in slide-in-from-bottom-4 fill-mode-backwards [animation-delay:400ms] duration-700 rounded-2xl border border-white/10 bg-white/[0.06] p-5 shadow-2xl shadow-black/40 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs tracking-widest text-white/60">DJFB-2481</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--moss-400)]/15 px-2 py-0.5 text-[11px] font-semibold text-[var(--moss-400)]">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-75" />
              <span className="relative inline-flex size-1.5 rounded-full bg-current" />
            </span>
            In transit
          </span>
        </div>

        <div className="mt-4 flex items-center gap-2.5 text-sm font-medium text-white/90">
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
            {/* 6 8 dash period matches the dj-route-dash keyframes (-14) */}
            <line
              x1="1"
              y1="6"
              x2="63"
              y2="6"
              stroke="var(--plum-400)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray="6 8"
              className="dj-route-line"
            />
          </svg>
          <span>Dallas, TX</span>
        </div>

        <div className="mt-4">
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="dj-load-progress h-full w-[68%] rounded-full bg-gradient-to-r from-[var(--navy-400)] to-[var(--plum-400)]" />
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-white/50">
            <span>68% of route</span>
            <span>ETA tomorrow · 9:40 AM</span>
          </div>
        </div>
      </div>

      <div className="animate-float absolute -right-4 -top-5 rounded-xl border border-white/10 bg-[var(--ink-900)]/90 px-3 py-2 shadow-xl backdrop-blur">
        <span className="flex items-center gap-1.5 text-xs font-medium text-white/80">
          <BadgeCheck className="size-3.5 text-[var(--moss-400)]" />
          Rate confirmed · $2,340
        </span>
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="text-lg font-bold tracking-tight text-white">{value}</div>
      <div className="text-[11px] uppercase tracking-wider text-white/45">{label}</div>
    </div>
  );
}

function BrandPanel() {
  return (
    <div className="relative hidden overflow-hidden bg-[var(--navy-950)] p-10 text-[#f4efe6] lg:flex lg:flex-col lg:justify-between xl:p-14">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -right-32 -top-40 size-[34rem] rounded-full bg-[var(--plum-500)] opacity-25 blur-[120px]" />
        <div className="absolute -bottom-48 -left-32 size-[30rem] rounded-full bg-[var(--navy-500)] opacity-30 blur-[110px]" />
        <div className="theme-grid-pattern absolute inset-0 text-white opacity-[0.05] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
        <div className="dj-noise absolute inset-0 opacity-[0.05] mix-blend-overlay" />
        <svg
          viewBox="0 0 800 900"
          preserveAspectRatio="xMidYMid slice"
          className="absolute inset-0 h-full w-full"
          fill="none"
        >
          <path
            d="M-60 700 C 150 640, 260 520, 380 470 S 640 330, 860 160"
            stroke="white"
            strokeOpacity="0.09"
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

      <div className="relative">
        <BrandLogo glow />
      </div>

      <div className="relative max-w-md">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--plum-300)]">
          Nationwide agent network
        </p>
        <h2 className="mt-4 text-4xl font-bold leading-[1.1] tracking-tight xl:text-[2.75rem]">
          Every lane, every load, tracked{" "}
          <span className="bg-gradient-to-r from-[var(--plum-300)] to-[var(--plum-400)] bg-clip-text text-transparent">
            door to door.
          </span>
        </h2>
        <p className="mt-4 text-[15px] leading-relaxed text-[var(--ink-300)]">
          The dispatch desk for agents moving freight across the network — live rates, status pings,
          and paperwork in one view.
        </p>

        <LoadCard />

        <div className="mt-9 flex items-center gap-8">
          <Stat value="1.2k+" label="loads moved" />
          <div className="h-8 w-px bg-white/10" />
          <Stat value="38" label="states covered" />
          <div className="h-8 w-px bg-white/10" />
          <Stat value="99.2%" label="on-time" />
        </div>
      </div>

      <div className="relative flex items-center justify-between">
        <CompanyLink className="group inline-flex items-center gap-1.5 text-sm font-medium text-white/60 transition-colors hover:text-white" />
        <span className="text-xs text-white/35">
          © {new Date().getFullYear()} DJ's Freight Broker LLC
        </span>
      </div>
    </div>
  );
}

/* ============================================================================
   Layout
   ========================================================================== */

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <BrandPanel />

      <div className="relative flex items-center justify-center overflow-hidden bg-background px-4 py-12 sm:px-6">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_45%_at_50%_0%,var(--color-bg-surface-2),transparent)]"
        />

        <div className="relative w-full max-w-md">
          <div className="mb-8 flex justify-center lg:hidden">
            <BrandLogo glow />
          </div>

          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xl shadow-black/[0.07]">
            <div
              aria-hidden="true"
              className="h-1 w-full bg-gradient-to-r from-[var(--navy-400)] via-[var(--plum-500)] to-[var(--navy-400)]"
            />
            <div className="animate-in fade-in slide-in-from-bottom-3 p-6 duration-500 sm:p-8">
              {children}
            </div>
          </div>

          <div className="mt-6 space-y-4 text-center">
            <p className="text-xs text-muted-foreground">
              Locked out of your account?{" "}
              <a
                href={SUPPORT_MAILTO}
                className="font-medium text-[var(--color-link)] underline-offset-4 hover:underline"
              >
                Contact dispatch
              </a>
            </p>
            <CompanyLink className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground lg:hidden" />
          </div>
        </div>
      </div>
    </div>
  );
}
