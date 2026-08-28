import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { PageHeader } from "@/components/page-header";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS } from "@/lib/roles";
import { AppShell } from "@/components/app-shell";
import { Toaster } from "@/components/ui/sonner";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";
import {
  Lock,
  User,
  Building2,
  ShieldCheck,
  KeyRound,
  Eye,
  EyeOff,
  Check,
  X,
  Mail,
  Phone,
  Clock,
  CalendarDays,
  Sparkles,
  Shield,
  AtSign,
  UserCircle,
  Briefcase,
  Calendar,
  AlertCircle,
  Loader2,
} from "lucide-react";

export const Route = createFileRoute("/profile")({
  component: () => (
    <AuthProvider>
      <ProfilePage />
    </AuthProvider>
  ),
});

type Profile = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  name: string;
  username: string | null;
  email: string;
  phone: string | null;
  role: string;
  status: string;
  team: string | null;
  employmentType: string | null;
  ownerName: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  isTemporaryPassword: boolean;
  passwordLastChangedAt: string | null;
  passwordChangeCount: number;
  passwordChangeCountMax: number;
};

/* ─── Info field with icon ──────────────────────────────────────────── */

function InfoField({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon?: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-border/40 bg-muted/20 p-3.5 transition-all duration-200 hover:border-border/60 hover:bg-muted/30">
      <div className="flex items-center gap-1.5">
        {Icon && <Icon className="size-3 text-muted-foreground/50" aria-hidden="true" />}
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/50">
          {label}
        </span>
      </div>
      <div className="mt-2 truncate text-sm font-medium text-foreground">{children}</div>
    </div>
  );
}

/* ─── Initials helper ───────────────────────────────────────────────── */

function getInitials(name?: string | null) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const initials =
    parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : parts[0].slice(0, 2);
  return initials.toUpperCase();
}

/* ─── Premium skeleton ──────────────────────────────────────────────── */

function ProfileSkeleton() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Hero skeleton */}
      <div className="relative overflow-hidden rounded-2xl border border-border/40">
        <div className="h-24 animate-pulse bg-gradient-to-r from-muted/60 via-muted/40 to-muted/60" />
        <div className="relative -mt-10 px-6 pb-6">
          <div className="flex items-end gap-4">
            <div className="size-20 animate-pulse rounded-2xl bg-muted/60 ring-4 ring-background" />
            <div className="mb-1 flex-1 space-y-2">
              <div className="h-6 w-48 animate-pulse rounded-lg bg-muted/50" />
              <div className="h-4 w-64 animate-pulse rounded-md bg-muted/40" />
            </div>
          </div>
        </div>
      </div>

      {/* Cards skeleton */}
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-border/40">
          <div className="flex items-center gap-3 border-b border-border/30 px-5 py-4">
            <div className="size-8 animate-pulse rounded-lg bg-muted/50" />
            <div className="space-y-1.5">
              <div className="h-4 w-32 animate-pulse rounded-md bg-muted/50" />
              <div className="h-3 w-48 animate-pulse rounded-md bg-muted/30" />
            </div>
          </div>
          <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((j) => (
              <div key={j} className="h-20 animate-pulse rounded-xl bg-muted/30" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════ */

function ProfilePage() {
  const { session, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [changePasswordForm, setChangePasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [changingPassword, setChangingPassword] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const loadProfile = async () => {
    try {
      const payload = await apiFetch<{ profile: Profile }>("/api/profile");
      setProfile(payload.data.profile);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      loadProfile();
    }
  }, [session]);

  if (typeof window !== "undefined") {
    if (!authLoading && !loading && !session) {
      window.location.replace("/login");
      return null;
    }
  }

  const changePassword = async () => {
    setChangingPassword(true);
    try {
      await apiFetch("/api/auth/change-password", {
        method: "POST",
        body: JSON.stringify(changePasswordForm),
      });
      setChangePasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      loadProfile();
      toast.success("Password changed successfully!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error changing password");
    } finally {
      setChangingPassword(false);
    }
  };

  const passwordLimitReached =
    !!profile && profile.passwordChangeCount >= profile.passwordChangeCountMax;

  const passwordsMatch =
    changePasswordForm.newPassword.length > 0 &&
    changePasswordForm.newPassword === changePasswordForm.confirmPassword;
  const hasMinLength = changePasswordForm.newPassword.length >= 6;
  const hasUppercase = /[A-Z]/.test(changePasswordForm.newPassword);
  const hasLowercase = /[a-z]/.test(changePasswordForm.newPassword);
  const hasNumber = /\d/.test(changePasswordForm.newPassword);

  const allRequirementsMet = hasMinLength && hasUppercase && hasLowercase && hasNumber;

  const isButtonDisabled =
    !profile ||
    passwordLimitReached ||
    !changePasswordForm.currentPassword ||
    !changePasswordForm.newPassword ||
    !changePasswordForm.confirmPassword ||
    changePasswordForm.newPassword !== changePasswordForm.confirmPassword ||
    !allRequirementsMet;

  const isInputsDisabled = !profile || passwordLimitReached;

  const formatDate = (dateStr: string | null) =>
    dateStr
      ? new Date(dateStr).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "—";

  const showPasswordHints =
    changePasswordForm.newPassword.length > 0 || changePasswordForm.confirmPassword.length > 0;

  const passwordStrength =
    changePasswordForm.newPassword.length === 0
      ? 0
      : [hasMinLength, hasUppercase, hasLowercase, hasNumber].filter(Boolean).length;

  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"][passwordStrength];
  const strengthColor = ["bg-muted", "bg-red-500", "bg-amber-500", "bg-blue-500", "bg-emerald-500"][
    passwordStrength
  ];

  return (
    <>
      <AppShell>
        <div className="mx-auto max-w-4xl space-y-8">
          <PageHeader
            title="My Profile"
            description="Manage your account information and security"
          />

          {authLoading || loading ? (
            <ProfileSkeleton />
          ) : (
            <div className="space-y-6">
              {/* ── Hero Identity Card ── */}
              <div className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm transition-all duration-300 hover:shadow-lg hover:shadow-primary/[0.02]">
                {/* Background gradient */}
                <div className="pointer-events-none absolute inset-0">
                  <div className="h-32 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent" />
                  <div className="absolute right-0 top-0 size-64 rounded-full bg-primary/5 blur-3xl" />
                </div>

                <div className="relative px-6 pb-6 pt-6 sm:px-8">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                    <div className="flex items-start gap-5">
                      {/* Avatar */}
                      <div className="relative -mt-2">
                        <div className="grid size-20 place-items-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-xl font-bold text-primary-foreground shadow-lg shadow-primary/20 ring-4 ring-background transition-transform duration-300 group-hover:scale-105">
                          {getInitials(profile?.name)}
                        </div>
                        <div className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full border-2 border-background bg-emerald-500 shadow-sm">
                          <Check className="size-3 text-white" />
                        </div>
                      </div>

                      {/* Name & email */}
                      <div className="min-w-0 pt-1">
                        <h2 className="text-2xl font-bold tracking-tight">
                          {profile?.name || "—"}
                        </h2>
                        <div className="mt-1.5 flex flex-wrap items-center gap-3">
                          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Mail className="size-3.5" />
                            {profile?.email}
                          </span>
                          {profile?.phone && (
                            <>
                              <span className="text-muted-foreground/30">·</span>
                              <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                                <Phone className="size-3.5" />
                                {profile.phone}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="rounded-xl border border-primary/20 bg-primary/5 px-3.5 py-2">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-primary/60">
                          Role
                        </div>
                        <div className="mt-0.5 text-sm font-bold text-primary">
                          {ROLE_LABELS[(profile?.role || "agent") as keyof typeof ROLE_LABELS]}
                        </div>
                      </div>
                      <div className="rounded-xl border border-border/50 bg-muted/20 px-3.5 py-2">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50">
                          Status
                        </div>
                        <div className="mt-0.5">
                          <StatusBadge value={profile?.status || "active"} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Personal Information ── */}
              <div className="group overflow-hidden rounded-2xl border border-border/50 bg-card transition-all duration-300 hover:border-border/60 hover:shadow-sm">
                <div className="flex items-center gap-3 border-b border-border/30 px-6 py-4">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-blue-500/10">
                    <User className="size-4.5 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold tracking-tight">Personal Information</h3>
                    <p className="text-xs text-muted-foreground/60">Your personal details</p>
                  </div>
                </div>
                <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
                  <InfoField label="First Name" icon={UserCircle}>
                    {profile?.firstName || "—"}
                  </InfoField>
                  <InfoField label="Last Name" icon={UserCircle}>
                    {profile?.lastName || "—"}
                  </InfoField>
                  <InfoField label="Full Name" icon={User}>
                    {profile?.name || "—"}
                  </InfoField>
                  <InfoField label="Username" icon={AtSign}>
                    {profile?.username || "—"}
                  </InfoField>
                  <InfoField label="Email" icon={Mail}>
                    {profile?.email || "—"}
                  </InfoField>
                  <InfoField label="Phone" icon={Phone}>
                    {profile?.phone || "—"}
                  </InfoField>
                </div>
              </div>

              {/* ── Organization ── */}
              <div className="group overflow-hidden rounded-2xl border border-border/50 bg-card transition-all duration-300 hover:border-border/60 hover:shadow-sm">
                <div className="flex items-center gap-3 border-b border-border/30 px-6 py-4">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-violet-500/10">
                    <Building2 className="size-4.5 text-violet-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold tracking-tight">Organization</h3>
                    <p className="text-xs text-muted-foreground/60">Your role and team</p>
                  </div>
                </div>
                <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
                  <InfoField label="Role">
                    <Badge
                      variant="outline"
                      className="rounded-lg border-primary/20 bg-primary/5 font-semibold text-primary"
                    >
                      {ROLE_LABELS[(profile?.role || "agent") as keyof typeof ROLE_LABELS]}
                    </Badge>
                  </InfoField>
                  <InfoField label="Team" icon={Users}>
                    {profile?.team || "—"}
                  </InfoField>
                  <InfoField label="Owner" icon={UserCircle}>
                    {profile?.ownerName || "—"}
                  </InfoField>
                  <InfoField label="Employment Type" icon={Briefcase}>
                    {profile?.employmentType ? (
                      <Badge variant="outline" className="rounded-lg">
                        {profile.employmentType}
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </InfoField>
                </div>
              </div>

              {/* ── Account Details ── */}
              <div className="group overflow-hidden rounded-2xl border border-border/50 bg-card transition-all duration-300 hover:border-border/60 hover:shadow-sm">
                <div className="flex items-center gap-3 border-b border-border/30 px-6 py-4">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/10">
                    <CalendarDays className="size-4.5 text-emerald-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold tracking-tight">Account Details</h3>
                    <p className="text-xs text-muted-foreground/60">Status and timeline</p>
                  </div>
                </div>
                <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
                  <InfoField label="Status">
                    <StatusBadge value={profile?.status || "active"} />
                  </InfoField>
                  <InfoField label="Last Login" icon={Clock}>
                    {formatDate(profile?.lastLoginAt ?? null)}
                  </InfoField>
                  <InfoField label="Account Created" icon={Calendar}>
                    {formatDate(profile?.createdAt ?? null)}
                  </InfoField>
                  <InfoField label="Last Updated" icon={Calendar}>
                    {formatDate(profile?.updatedAt ?? null)}
                  </InfoField>
                </div>
              </div>

              {/* ── Security ── */}
              <div className="group overflow-hidden rounded-2xl border border-border/50 bg-card transition-all duration-300 hover:border-border/60 hover:shadow-sm">
                <div className="flex items-center gap-3 border-b border-border/30 px-6 py-4">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-amber-500/10">
                    <ShieldCheck className="size-4.5 text-amber-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold tracking-tight">Security</h3>
                    <p className="text-xs text-muted-foreground/60">Password management</p>
                  </div>
                </div>

                <div className="space-y-6 p-6">
                  {/* Password status */}
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 rounded-xl border border-border/40 bg-muted/20 px-4 py-2.5">
                      <Shield className="size-4 text-muted-foreground/50" />
                      <span className="text-xs font-semibold text-muted-foreground/70">
                        Password Status
                      </span>
                    </div>
                    {profile?.isTemporaryPassword ? (
                      <Badge variant="destructive" className="gap-1.5 rounded-lg px-3 py-1">
                        <Lock className="size-3" />
                        Temporary Password
                      </Badge>
                    ) : (
                      <Badge variant="success" className="gap-1.5 rounded-lg px-3 py-1">
                        <Check className="size-3" />
                        Permanent Password
                      </Badge>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <InfoField label="Last Changed" icon={Clock}>
                      {formatDate(profile?.passwordLastChangedAt ?? null)}
                    </InfoField>
                    <InfoField label="Changes This Month" icon={Calendar}>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold tabular-nums">
                          {profile?.passwordChangeCount ?? 0}
                        </span>
                        <span className="text-muted-foreground/40">/</span>
                        <span className="tabular-nums text-muted-foreground/60">
                          {profile?.passwordChangeCountMax ?? 0}
                        </span>
                        {passwordLimitReached && (
                          <AlertCircle className="size-4 text-destructive" />
                        )}
                      </div>
                    </InfoField>
                  </div>

                  {/* Limit warning */}
                  {passwordLimitReached && (
                    <div className="relative overflow-hidden rounded-xl border border-red-500/20 bg-gradient-to-r from-red-50/80 to-orange-50/50 p-4 dark:from-red-950/30 dark:to-orange-950/20">
                      <div className="pointer-events-none absolute -right-8 -top-8 size-24 rounded-full bg-red-500/5 blur-2xl" />
                      <div className="relative flex items-start gap-3">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-red-500/10 ring-1 ring-red-500/20">
                          <X className="size-4 text-red-500" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                            Limit reached
                          </p>
                          <p className="mt-0.5 text-sm text-red-600/80 dark:text-red-400/70">
                            You have reached your monthly password change limit. Contact your
                            administrator for assistance.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Change password form */}
                  <div className="space-y-5 rounded-2xl border border-border/40 bg-muted/10 p-6">
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
                        <KeyRound className="size-4 text-primary" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold">Change Password</h4>
                        <p className="text-xs text-muted-foreground/60">
                          Update your account password
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                      {/* Current password */}
                      <div className="space-y-2">
                        <Label
                          htmlFor="currentPassword"
                          className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70"
                        >
                          Current Password
                        </Label>
                        <div className="relative">
                          <Input
                            type={showCurrent ? "text" : "password"}
                            id="currentPassword"
                            autoComplete="current-password"
                            value={changePasswordForm.currentPassword}
                            onChange={(e) =>
                              setChangePasswordForm((p) => ({
                                ...p,
                                currentPassword: e.target.value,
                              }))
                            }
                            disabled={isInputsDisabled}
                            className="h-10 rounded-xl border-border/50 bg-background pr-10 transition-colors focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                            placeholder="Enter current"
                          />
                          <button
                            type="button"
                            onClick={() => setShowCurrent((v) => !v)}
                            disabled={isInputsDisabled}
                            className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground/50 transition-colors hover:text-foreground disabled:opacity-40"
                            aria-label={showCurrent ? "Hide" : "Show"}
                          >
                            {showCurrent ? (
                              <EyeOff className="size-4" />
                            ) : (
                              <Eye className="size-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* New password */}
                      <div className="space-y-2">
                        <Label
                          htmlFor="newPassword"
                          className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70"
                        >
                          New Password
                        </Label>
                        <div className="relative">
                          <Input
                            type={showNew ? "text" : "password"}
                            id="newPassword"
                            autoComplete="new-password"
                            value={changePasswordForm.newPassword}
                            onChange={(e) =>
                              setChangePasswordForm((p) => ({ ...p, newPassword: e.target.value }))
                            }
                            disabled={isInputsDisabled}
                            className="h-10 rounded-xl border-border/50 bg-background pr-10 transition-colors focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                            placeholder="Enter new"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNew((v) => !v)}
                            disabled={isInputsDisabled}
                            className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground/50 transition-colors hover:text-foreground disabled:opacity-40"
                            aria-label={showNew ? "Hide" : "Show"}
                          >
                            {showNew ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Confirm password */}
                      <div className="space-y-2">
                        <Label
                          htmlFor="confirmPassword"
                          className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70"
                        >
                          Confirm Password
                        </Label>
                        <div className="relative">
                          <Input
                            type={showConfirm ? "text" : "password"}
                            id="confirmPassword"
                            autoComplete="new-password"
                            value={changePasswordForm.confirmPassword}
                            onChange={(e) =>
                              setChangePasswordForm((p) => ({
                                ...p,
                                confirmPassword: e.target.value,
                              }))
                            }
                            disabled={isInputsDisabled}
                            className="h-10 rounded-xl border-border/50 bg-background pr-10 transition-colors focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                            placeholder="Confirm new"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirm((v) => !v)}
                            disabled={isInputsDisabled}
                            className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground/50 transition-colors hover:text-foreground disabled:opacity-40"
                            aria-label={showConfirm ? "Hide" : "Show"}
                          >
                            {showConfirm ? (
                              <EyeOff className="size-4" />
                            ) : (
                              <Eye className="size-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Password strength indicator */}
                    {showPasswordHints && (
                      <div className="space-y-3">
                        {/* Strength bar */}
                        <div className="flex items-center gap-3">
                          <div className="flex flex-1 gap-1">
                            {[0, 1, 2, 3].map((i) => (
                              <div
                                key={i}
                                className={cn(
                                  "h-1.5 flex-1 rounded-full transition-all duration-300",
                                  i < passwordStrength ? strengthColor : "bg-muted/50",
                                )}
                              />
                            ))}
                          </div>
                          <span className="text-xs font-semibold text-muted-foreground/60 min-w-[40px] text-right">
                            {strengthLabel}
                          </span>
                        </div>

                        {/* Requirements checklist */}
                        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 sm:grid-cols-4">
                          {[
                            { met: hasMinLength, label: "6+ characters" },
                            { met: hasUppercase, label: "Uppercase (A-Z)" },
                            { met: hasLowercase, label: "Lowercase (a-z)" },
                            { met: hasNumber, label: "Number (0-9)" },
                          ].map((req) => (
                            <div
                              key={req.label}
                              className={cn(
                                "flex items-center gap-1.5 text-xs transition-colors",
                                req.met
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-muted-foreground/40",
                              )}
                            >
                              {req.met ? (
                                <Check className="size-3.5 shrink-0" />
                              ) : (
                                <X className="size-3.5 shrink-0" />
                              )}
                              <span className="font-medium">{req.label}</span>
                            </div>
                          ))}
                          <div
                            className={cn(
                              "flex items-center gap-1.5 text-xs transition-colors sm:col-span-2 sm:col-start-3",
                              passwordsMatch
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-muted-foreground/40",
                            )}
                          >
                            {passwordsMatch ? (
                              <Check className="size-3.5 shrink-0" />
                            ) : (
                              <X className="size-3.5 shrink-0" />
                            )}
                            <span className="font-medium">Passwords match</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Submit button */}
                    <div className="flex items-center gap-3">
                      <Button
                        className="rounded-xl shadow-lg shadow-primary/10"
                        onClick={changePassword}
                        disabled={isButtonDisabled || changingPassword}
                      >
                        {changingPassword ? (
                          <>
                            <Loader2 className="size-4 animate-spin" />
                            Changing…
                          </>
                        ) : (
                          <>
                            <KeyRound className="size-4" />
                            Change Password
                          </>
                        )}
                      </Button>
                      {passwordLimitReached && (
                        <span className="text-xs text-muted-foreground/50">
                          Contact admin to reset limit
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </AppShell>
      <Toaster richColors position="top-right" />
    </>
  );
}

// Need to import Users icon that was used in Organization section
import { Users } from "lucide-react";

// Need cn utility
import { cn } from "@/lib/utils";
