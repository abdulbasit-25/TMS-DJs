import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fmtDate, fmtDateTime } from "@/lib/format";
import {
  Clock,
  Play,
  Square,
  Phone,
  MessageSquareText,
  StickyNote,
  CalendarClock,
  History as HistoryIcon,
  Plus,
  ChevronDown,
  ChevronRight,
  Save,
  Timer,
  Minus,
  LogOut,
} from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/activity")({ component: ActivityPage });

type DailySessionRow = {
  checkedInAt?: string;
  checkedOutAt?: string;
  clockStatus?: "checked_in" | "checked_out";
  endReason?: string;
  calls?: number;
  followups?: number;
  notes?: string;
};

type DailyLogRow = {
  id: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  date: string;
  checkedInAt?: string;
  checkedOutAt?: string;
  calls: number;
  followups: number;
  notes: string;
  clockStatus?: "checked_in" | "checked_out";
  endReason?: string;
  sessions?: DailySessionRow[];
};

function sessionDuration(inAt?: string, outAt?: string): string {
  if (!inAt) return "—";
  const start = new Date(inAt).getTime();
  const end = outAt ? new Date(outAt).getTime() : Date.now();
  const mins = Math.floor((end - start) / 60_000);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function totalDayDuration(log: DailyLogRow): string {
  const sessions = log.sessions?.length
    ? log.sessions
    : [{ checkedInAt: log.checkedInAt, checkedOutAt: log.checkedOutAt }];
  let totalMin = 0;
  for (const s of sessions) {
    if (!s.checkedInAt) continue;
    const end = s.checkedOutAt ? new Date(s.checkedOutAt).getTime() : Date.now();
    totalMin += Math.floor((end - new Date(s.checkedInAt).getTime()) / 60_000);
  }
  if (totalMin < 60) return `${totalMin}m`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function ActivityPage() {
  const { session, clockedIn, setClockedIn } = useAuth();
  const [checkedInAt, setCheckedInAt] = useState<string | null>(null);
  const [checkedOutAt, setCheckedOutAt] = useState<string | null>(null);
  const [callsInput, setCallsInput] = useState("0");
  const [followupsInput, setFollowupsInput] = useState("0");
  const [notes, setNotes] = useState("");
  const [history, setHistory] = useState<DailyLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkinModalOpen, setCheckinModalOpen] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const hasHydratedRef = useRef(false);
  const hasEditedRef = useRef(false);
  const isCheckedIn = Boolean(checkedInAt) || clockedIn;
  const canSeeNames = Boolean(
    session?.role && ["admin", "ops_manager", "team_manager"].includes(session.role),
  );
  const calls = Number(callsInput) || 0;
  const followups = Number(followupsInput) || 0;

  useEffect(() => {
    if (!isCheckedIn) {
      setElapsedSeconds(0);
      return;
    }
    const t0 = checkedInAt ? new Date(checkedInAt).getTime() : Date.now();
    const tick = () => setElapsedSeconds(Math.max(0, Math.floor((Date.now() - t0) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [checkedInAt, isCheckedIn]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await apiFetch<{ logs: DailyLogRow[] }>("/api/activity/logs");
        if (!alive) return;
        setHistory(data.logs);
        const today = new Date().toISOString().slice(0, 10);
        const cur = data.logs.find((l) => l.date === today) ?? data.logs[0];
        const active = cur?.sessions
          ?.slice()
          .reverse()
          .find((s) => s.clockStatus === "checked_in");
        if (!hasHydratedRef.current || !hasEditedRef.current) {
          if (cur?.clockStatus === "checked_in") {
            setCheckedInAt(cur.checkedInAt ?? null);
            setCheckedOutAt(null);
            setCallsInput(String(active?.calls ?? cur.calls ?? 0));
            setFollowupsInput(String(active?.followups ?? cur.followups ?? 0));
            setNotes(active?.notes ?? cur.notes ?? "");
            setClockedIn(true);
          } else {
            setCheckedInAt(null);
            setCheckedOutAt(cur?.checkedOutAt ?? null);
            setCallsInput(String(cur.calls ?? 0));
            setFollowupsInput(String(cur.followups ?? 0));
            setNotes(cur.notes ?? "");
            setClockedIn(false);
          }
        }
        hasHydratedRef.current = true;
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load history.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [session?.id]);

  async function saveLog() {
    try {
      const { data } = await apiFetch<{ log: DailyLogRow }>("/api/activity/log", {
        method: "POST",
        body: JSON.stringify({
          checkedInAt: checkedInAt ?? undefined,
          checkedOutAt: checkedOutAt ?? undefined,
          calls,
          followups,
          notes,
          date: new Date().toISOString().slice(0, 10),
        }),
      });
      hasEditedRef.current = true;
      setHistory((p) => [data.log, ...p.filter((i) => i.date !== data.log.date)]);
      toast.success("Saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save.");
    }
  }

  async function confirmCheckIn() {
    try {
      const { data } = await apiFetch<{ log: DailyLogRow; clockedIn: boolean }>(
        "/api/activity/clock-in",
        { method: "POST" },
      );
      setCheckedInAt(data.log.checkedInAt ?? null);
      setCheckedOutAt(null);
      setCallsInput("0");
      setFollowupsInput("0");
      setNotes("");
      setClockedIn(true);
      hasHydratedRef.current = true;
      hasEditedRef.current = false;
      setHistory((p) => [data.log, ...p.filter((i) => i.date !== data.log.date)]);
      setCheckinModalOpen(false);
      toast.success("Checked in");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to check in.");
    }
  }

  async function confirmCheckout() {
    try {
      const { data } = await apiFetch<{ log: DailyLogRow; clockedIn: boolean }>(
        "/api/activity/clock-out",
        {
          method: "POST",
          body: JSON.stringify({
            reason: "manual",
            calls,
            followups,
            notes,
            date: new Date().toISOString().slice(0, 10),
          }),
        },
      );
      setCheckedInAt(null);
      setCheckedOutAt(data.log.checkedOutAt ?? null);
      setClockedIn(false);
      hasHydratedRef.current = true;
      hasEditedRef.current = false;
      setHistory((p) => [data.log, ...p.filter((i) => i.date !== data.log.date)]);
      setCheckoutModalOpen(false);
      toast.success("Checked out");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to check out.");
    }
  }

  function toggleDay(id: string) {
    setExpandedDays((p) => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  const hh = String(Math.floor(elapsedSeconds / 3600)).padStart(2, "0");
  const mm = String(Math.floor((elapsedSeconds % 3600) / 60)).padStart(2, "0");
  const ss = String(elapsedSeconds % 60).padStart(2, "0");

  return (
    <div className="space-y-6">
      {/* Check-in dialog */}
      <Dialog open={checkinModalOpen} onOpenChange={setCheckinModalOpen}>
        <DialogContent className="sm:max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle>Start a new session?</DialogTitle>
            <DialogDescription>
              Your previous session data will be closed. A fresh session starts from zero.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-between rounded-lg border p-3 text-sm">
            <span className="text-muted-foreground">Today</span>
            <span className="font-medium">{fmtDate(new Date())}</span>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckinModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void confirmCheckIn()}>Start session</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Checkout dialog */}
      <Dialog open={checkoutModalOpen} onOpenChange={setCheckoutModalOpen}>
        <DialogContent className="sm:max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle>End this session?</DialogTitle>
            <DialogDescription>Review what you've logged before checking out.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {[
              { label: "Calls", value: calls, warn: calls <= 0 },
              { label: "Follow-ups", value: followups, warn: followups <= 0 },
              { label: "Notes", value: notes.trim() ? `"${notes}"` : "None", warn: !notes.trim() },
            ].map((item) => (
              <div
                key={item.label}
                className={cn(
                  "rounded-lg border p-3 text-sm",
                  item.warn &&
                    "border-amber-300 bg-amber-50 dark:border-amber-700/50 dark:bg-amber-950/30",
                )}
              >
                <span className="font-medium">
                  {item.label}: {item.value}
                </span>
                {item.warn && (
                  <p className="mt-0.5 text-xs text-amber-600 dark:text-amber-400">Not yet added</p>
                )}
              </div>
            ))}
          </div>
          <DialogFooter className="sm:justify-between">
            <Button variant="outline" onClick={() => setCheckoutModalOpen(false)}>
              Continue editing
            </Button>
            <Button
              onClick={() => {
                setCheckoutModalOpen(false);
                void confirmCheckout();
              }}
            >
              Check out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PageHeader title="Daily Activity" description="Track your work day" />

      {/* ── Today ── */}
      <div className="grid gap-4 lg:grid-cols-5">
        {/* Timer card */}
        <section className="lg:col-span-3 rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Clock className="size-4 text-muted-foreground" />
              Session
            </div>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
                isCheckedIn
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
                  : "bg-muted text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  isCheckedIn ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/40",
                )}
              />
              {isCheckedIn ? "Active" : "Inactive"}
            </span>
          </div>

          {isCheckedIn ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Started {checkedInAt ? fmtDateTime(checkedInAt) : "—"}.</span>
                <span className="text-muted-foreground/30">·</span>
                <span className="flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live
                </span>
              </div>

              <div className="flex items-center justify-center rounded-xl bg-muted/30 py-10">
                <div className="text-center">
                  <div className="text-6xl font-bold tabular-nums tracking-tight">
                    <span className={elapsedSeconds >= 3600 ? "" : "text-muted-foreground/30"}>
                      {hh}
                    </span>
                    <span className="text-muted-foreground/20 mx-1">:</span>
                    <span>{mm}</span>
                    <span className="text-muted-foreground/20 mx-1">:</span>
                    <span className="text-muted-foreground/50">{ss}</span>
                  </div>
                  <div className="mt-2 text-xs font-medium uppercase tracking-widest text-muted-foreground/40">
                    Hours : Minutes : Seconds
                  </div>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => setCheckoutModalOpen(true)}
              >
                <Square className="size-3.5" />
                Check out
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {checkedOutAt && (
                <p className="text-sm text-muted-foreground">
                  Last session ended at {fmtDateTime(checkedOutAt)}.
                </p>
              )}
              <Button className="w-full gap-2" onClick={() => setCheckinModalOpen(true)}>
                <Play className="size-3.5" />
                Check in
              </Button>
            </div>
          )}
        </section>

        {/* Today's log */}
        <section className="lg:col-span-2 rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-sm font-semibold mb-4">
            <StickyNote className="size-4 text-muted-foreground" />
            Today's log
          </div>

          <div className="space-y-3">
            {/* Calls */}
            <div>
              <Label className="mb-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Phone className="size-3" /> Calls
              </Label>
              <div className="flex gap-1.5">
                <Input
                  type="number"
                  min={0}
                  value={callsInput}
                  onChange={(e) => {
                    hasEditedRef.current = true;
                    setCallsInput(e.target.value.replace(/\D/g, ""));
                  }}
                  inputMode="numeric"
                  className="text-center tabular-nums"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  onClick={() => setCallsInput(String(calls + 1))}
                >
                  <Plus className="size-3.5" />
                </Button>
                {calls > 0 && (
                  <Button
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    onClick={() => setCallsInput(String(Math.max(0, calls - 1)))}
                  >
                    <Minus className="size-3.5" />
                  </Button>
                )}
              </div>
            </div>

            {/* Follow-ups */}
            <div>
              <Label className="mb-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                <MessageSquareText className="size-3" /> Follow-ups
              </Label>
              <div className="flex gap-1.5">
                <Input
                  type="number"
                  min={0}
                  value={followupsInput}
                  onChange={(e) => {
                    hasEditedRef.current = true;
                    setFollowupsInput(e.target.value.replace(/\D/g, ""));
                  }}
                  inputMode="numeric"
                  className="text-center tabular-nums"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  onClick={() => setFollowupsInput(String(followups + 1))}
                >
                  <Plus className="size-3.5" />
                </Button>
                {followups > 0 && (
                  <Button
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    onClick={() => setFollowupsInput(String(Math.max(0, followups - 1)))}
                  >
                    <Minus className="size-3.5" />
                  </Button>
                )}
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => {
                  hasEditedRef.current = true;
                  setNotes(e.target.value);
                }}
                rows={3}
                placeholder="Anything worth remembering…"
              />
            </div>

            <Button className="w-full gap-2" onClick={() => void saveLog()}>
              <Save className="size-3.5" />
              Save
            </Button>
          </div>
        </section>
      </div>

      {/* ── History ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <HistoryIcon className="size-4 text-muted-foreground" />
            History
          </div>
          {!loading && history.length > 0 && (
            <span className="text-xs text-muted-foreground/60">
              {history.length} {history.length === 1 ? "day" : "days"}
            </span>
          )}
        </div>

        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-14 animate-pulse rounded-xl border border-border/50 bg-muted/30"
              />
            ))}
          </div>
        ) : !history.length ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border/60 py-16 text-muted-foreground/40">
            <CalendarClock className="size-7" />
            <p className="text-sm font-medium">No activity logs yet</p>
            <p className="text-xs">Check in and save a log to start your history.</p>
          </div>
        ) : (
          <ul className="space-y-1.5">
            {history.map((log) => {
              const expanded = expandedDays.has(log.id);
              const sessions = log.sessions?.length
                ? log.sessions
                : [
                    {
                      checkedInAt: log.checkedInAt,
                      checkedOutAt: log.checkedOutAt,
                      calls: log.calls,
                      followups: log.followups,
                      notes: log.notes,
                    },
                  ];
              const dur = totalDayDuration(log);

              return (
                <li
                  key={log.id}
                  className="rounded-xl border border-border/50 bg-card transition-colors hover:bg-muted/20"
                >
                  <button
                    type="button"
                    onClick={() => toggleDay(log.id)}
                    className="flex w-full items-center gap-3 p-3.5 text-left sm:gap-4"
                  >
                    {expanded ? (
                      <ChevronDown className="size-4 shrink-0 text-muted-foreground/40" />
                    ) : (
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground/40" />
                    )}

                    <div className="min-w-[6.5rem] shrink-0">
                      <div className="text-sm font-semibold">{fmtDate(log.date)}</div>
                      {log.userName && canSeeNames && (
                        <div className="text-[11px] text-muted-foreground/60">{log.userName}</div>
                      )}
                    </div>

                    <div className="flex flex-1 flex-wrap items-center gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Timer className="size-3" />
                        <span className="font-semibold text-foreground">{dur}</span>
                      </span>
                      <span>
                        <span className="font-semibold text-foreground">{log.calls}</span> calls
                      </span>
                      <span>
                        <span className="font-semibold text-foreground">{log.followups}</span>{" "}
                        follow-ups
                      </span>
                      <span>
                        {sessions.length} session{sessions.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </button>

                  {expanded && (
                    <div className="border-t border-border/40 px-3.5 pb-3.5 pt-2.5">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/40 mb-2">
                        Sessions
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {sessions.map((s, i) => (
                          <div
                            key={i}
                            className="rounded-lg border border-border/40 bg-muted/20 p-3 text-xs space-y-1.5"
                          >
                            <div className="font-semibold text-foreground">Session {i + 1}</div>
                            <div className="flex justify-between text-muted-foreground/60">
                              <span>In</span>
                              <span className="font-medium text-foreground tabular-nums">
                                {s.checkedInAt ? fmtDateTime(s.checkedInAt) : "—"}
                              </span>
                            </div>
                            <div className="flex justify-between text-muted-foreground/60">
                              <span>Out</span>
                              <span className="font-medium text-foreground tabular-nums">
                                {s.checkedOutAt ? fmtDateTime(s.checkedOutAt) : "—"}
                              </span>
                            </div>
                            <div className="flex justify-between text-muted-foreground/60">
                              <span>Duration</span>
                              <span className="font-medium text-foreground">
                                {sessionDuration(s.checkedInAt, s.checkedOutAt)}
                              </span>
                            </div>
                            <div className="border-t border-border/30 pt-1.5 space-y-1">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground/60">Calls</span>
                                <span className="font-medium">{s.calls ?? 0}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground/60">Follow-ups</span>
                                <span className="font-medium">{s.followups ?? 0}</span>
                              </div>
                            </div>
                            {s.notes && (
                              <p className="border-t border-border/30 pt-1.5 text-muted-foreground/60">
                                {s.notes}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                      {log.notes && (
                        <div className="mt-2.5">
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/40 mb-1">
                            Day notes
                          </div>
                          <p className="text-xs text-muted-foreground/60">{log.notes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
