import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth, AuthProvider } from "@/lib/auth-context";
import {
  AlertCircle,
  ArrowUpRight,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  MapPin,
  Navigation,
} from "lucide-react";

const COMPANY_URL = "https://djsfreightbroker.com/";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const errorRef = useRef<HTMLDivElement>(null);

  // Already signed in? Send them to the dashboard.
  useEffect(() => {
    if (session) navigate({ to: "/dashboard", replace: true });
  }, [session, navigate]);

  // Avoid flashing the form for authenticated users mid-redirect.
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
      // Generic message — don't reveal whether an account exists.
      setError(err instanceof Error ? err.message : "Sign in failed. Please try again.");
      // Move focus to the error for keyboard/screen-reader users.
      requestAnimationFrame(() => errorRef.current?.focus());
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout>
      <div className="mb-7">
        <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-[var(--color-bg-surface-2)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-brand)]">
          <Navigation className="size-3" />
          Agent access
        </span>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Sign in to the portal</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Loads, lanes, and carriers — all in one place.
        </p>
      </div>

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
            className="h-11"
            placeholder="Enter your email"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
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
              className="h-11 pr-10"
              placeholder="Enter your password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((p) => !p)}
              className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
          className="h-11 w-full bg-[var(--color-cta-bg)] text-[var(--color-cta-text)] hover:bg-[var(--color-cta-bg-hover)]"
        >
          {submitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Signing in…
            </>
          ) : (
            "Sign in"
          )}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          Internal use only. Unauthorized access is prohibited.
        </p>
      </form>
    </AuthLayout>
  );
}

function BrandLogo({ gradient = false }: { gradient?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className={`grid size-9 place-items-center rounded-md text-[var(--color-cta-text)] ${
          gradient
            ? "bg-gradient-to-br from-[var(--color-brand)] to-[var(--color-cta-bg)]"
            : "bg-[var(--color-cta-bg)]"
        }`}
      >
        <LockKeyhole className="size-4" />
      </div>
      <div>
        <div className="text-sm font-semibold">DJ's Freight Broker LLC</div>
        <div className="text-[10px] uppercase tracking-wider opacity-70">
          Secure Agent Portal — TMS
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

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand / route panel — hidden on small screens */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-[var(--color-bg-sidebar)] p-10 text-[var(--color-text-primary)] lg:flex">
        <div className="theme-grid-pattern pointer-events-none absolute inset-0 opacity-[0.07]" />

        <div className="relative">
          <BrandLogo />
        </div>

        <div className="relative">
          <h2 className="max-w-sm text-3xl font-bold leading-tight tracking-tight">
            Every lane, every load, tracked door to door.
          </h2>
          <p className="mt-3 max-w-xs text-sm text-[var(--color-text-secondary)]">
            The dispatch desk for agents moving freight across the network.
          </p>

          {/* Signature: animated route line, origin to destination */}
          <div className="mt-10 flex items-center gap-3">
            <MapPin className="size-4 shrink-0 text-[var(--color-cta-bg)]" />
            <svg
              viewBox="0 0 240 16"
              className="h-4 w-full max-w-[220px] overflow-visible"
              aria-hidden="true"
            >
              <line x1="2" y1="8" x2="238" y2="8" stroke="rgba(255,255,255,0.25)" strokeWidth="2" />
              <line
                x1="2"
                y1="8"
                x2="238"
                y2="8"
                stroke="var(--color-cta-bg)"
                strokeWidth="2"
                strokeDasharray="6 8"
                className="dj-route-line"
              />
              <circle cx="2" cy="8" r="3.5" fill="var(--color-cta-bg)" />
              <circle cx="238" cy="8" r="3.5" fill="var(--color-cta-bg)" />
            </svg>
            <span className="shrink-0 text-[11px] font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">
              Live lanes
            </span>
          </div>
        </div>

        <CompanyLink className="relative inline-flex w-fit items-center gap-1.5 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]" />
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center bg-background px-4 py-12">
        <div className="w-full max-w-sm">
          {/* Compact brand header — mobile only */}
          <div className="mb-8 lg:hidden">
            <BrandLogo gradient />
          </div>

          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">{children}</div>

          <CompanyLink className="mt-6 flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground lg:hidden" />
        </div>
      </div>
    </div>
  );
}
