import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { relative } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  useNotifications,
  type NotificationItem,
  type NotificationGroup,
} from "@/hooks/use-notifications";
import {
  moduleIcon,
  typeColor,
  priorityClasses,
  priorityLabel,
  recordUrl,
} from "@/lib/notification-ui";
import { toast } from "sonner";
import {
  Inbox,
  Check,
  CheckCheck,
  Trash2,
  Search,
  Mail,
  MailOpen,
  Bell,
  BellOff,
  Filter,
} from "lucide-react";

export const Route = createFileRoute("/_app/notifications")({
  component: NotifsPage,
});

const GROUP_LABELS: Record<NotificationGroup, string> = {
  today: "Today",
  yesterday: "Yesterday",
  thisWeek: "This Week",
  earlier: "Earlier",
};

type Tab = "all" | "unread" | "read";

function NotifsPage() {
  const {
    notifications,
    unreadCount,
    totalCount,
    groups,
    loading,
    markRead,
    markAllRead,
    markUnread,
    deleteNotification,
    clearAll,
  } = useNotifications();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let r = notifications;
    if (tab === "unread") r = r.filter((n) => !n.isRead);
    else if (tab === "read") r = r.filter((n) => n.isRead);
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter((n) => n.title.toLowerCase().includes(q) || n.message.toLowerCase().includes(q));
    }
    return r;
  }, [notifications, tab, search]);

  const grouped = useMemo(() => {
    const g: Record<NotificationGroup, NotificationItem[]> = {
      today: [],
      yesterday: [],
      thisWeek: [],
      earlier: [],
    };
    for (const n of filtered) g[n.group]?.push(n);
    return g;
  }, [filtered]);

  const readCount = totalCount - unreadCount;

  function go(n: NotificationItem) {
    if (!n.isRead) void markRead(n.id);
    const url = n.actionUrl ?? recordUrl(n.recordType, n.recordId);
    if (url) navigate({ to: url });
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Notifications"
        description="System alerts, follow-ups and event notifications."
        actions={
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                <span className="size-1.5 rounded-full bg-primary" />
                {unreadCount}
              </span>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                void markAllRead();
                toast.success("All marked as read");
              }}
              disabled={unreadCount === 0}
            >
              <CheckCheck className="size-3.5" />
              <span className="hidden sm:inline">Mark all read</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                void clearAll();
                toast.success("Cleared all");
              }}
              disabled={totalCount === 0}
            >
              <Trash2 className="size-3.5" />
              <span className="hidden sm:inline">Clear all</span>
            </Button>
          </div>
        }
      />

      {/* Tabs + search */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex items-center gap-0.5 rounded-lg border border-border/60 bg-muted/30 p-0.5">
          {[
            { key: "all" as Tab, label: "All", count: totalCount },
            { key: "unread" as Tab, label: "Unread", count: unreadCount },
            { key: "read" as Tab, label: "Read", count: readCount },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "relative rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                tab === t.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
              {t.count > 0 && (
                <span
                  className={cn(
                    "ml-1.5 tabular-nums",
                    tab === "all"
                      ? "text-muted-foreground/50"
                      : t.key === "unread" && tab === t.key
                        ? "text-primary"
                        : "text-muted-foreground/50",
                  )}
                >
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="relative max-w-xs flex-1 sm:max-w-[220px]">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/40" />
          <Input
            placeholder="Search…"
            className="h-8 pl-8 text-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-xl border border-border/40 bg-card p-4"
            >
              <div className="size-8 animate-pulse rounded-lg bg-muted/50" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-3/4 animate-pulse rounded bg-muted/40" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-muted/30" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-border/50 py-16 text-muted-foreground/40">
          {tab === "unread" ? (
            <BellOff className="size-7 mb-2" />
          ) : (
            <Inbox className="size-7 mb-2" />
          )}
          <p className="text-sm font-medium">
            {tab === "unread"
              ? "No unread notifications"
              : tab === "read"
                ? "No read notifications"
                : search
                  ? "No matches"
                  : "All caught up"}
          </p>
          {search && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-3 text-xs"
              onClick={() => setSearch("")}
            >
              Clear search
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {(Object.keys(grouped) as NotificationGroup[]).map((gk) => {
            const items = grouped[gk];
            if (!items?.length) return null;
            return (
              <div key={gk}>
                <div className="mb-2 flex items-center gap-2">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/50">
                    {GROUP_LABELS[gk]}
                  </h3>
                  <span className="text-[10px] tabular-nums text-muted-foreground/30">
                    {items.length}
                  </span>
                </div>
                <ul className="space-y-0.5">
                  {items.map((n) => (
                    <Row
                      key={n.id}
                      n={n}
                      onClick={() => go(n)}
                      onRead={() => void markRead(n.id)}
                      onUnread={() => void markUnread(n.id)}
                      onDelete={() => void deleteNotification(n.id)}
                    />
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Row ──────────────────────────────────────────────────────────── */

function Row({
  n,
  onClick,
  onRead,
  onUnread,
  onDelete,
}: {
  n: NotificationItem;
  onClick: () => void;
  onRead: () => void;
  onUnread: () => void;
  onDelete: () => void;
}) {
  const Icon = moduleIcon(n.relatedModule);
  const color = typeColor(n.notificationType);
  const pCls = priorityClasses(n.priority);

  return (
    <li
      className={cn(
        "group relative flex items-start gap-3 rounded-xl px-4 py-3 transition-colors",
        n.isRead ? "hover:bg-muted/30" : "bg-primary/[0.03] hover:bg-primary/[0.05]",
      )}
    >
      {/* Unread indicator bar */}
      {!n.isRead && (
        <div className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-primary/60" />
      )}

      {/* Icon */}
      <button
        onClick={onClick}
        className={cn(
          "mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg transition-colors",
          color,
          !n.isRead && "ring-1 ring-primary/20",
        )}
        title={n.relatedModule}
      >
        <Icon className="size-4" />
      </button>

      {/* Body */}
      <button onClick={onClick} className="min-w-0 flex-1 text-left">
        <div className="flex items-start justify-between gap-3">
          <span
            className={cn(
              "text-sm leading-snug",
              n.isRead ? "text-muted-foreground/80" : "font-medium text-foreground",
            )}
          >
            {n.title}
          </span>
          <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground/40 whitespace-nowrap">
            {relative(n.createdAt)}
          </span>
        </div>

        <p
          className={cn(
            "mt-0.5 text-xs leading-relaxed",
            n.isRead ? "text-muted-foreground/40" : "text-muted-foreground/70",
          )}
        >
          {n.message}
        </p>

        <div className="mt-1.5 flex items-center gap-2">
          {n.senderName && (
            <span className="text-[11px] text-muted-foreground/40">from {n.senderName}</span>
          )}
          {n.priority && n.priority !== "normal" && (
            <span className={cn("rounded px-1.5 py-px text-[10px] font-semibold leading-4", pCls)}>
              {priorityLabel(n.priority)}
            </span>
          )}
        </div>
      </button>

      {/* Actions */}
      <div className="flex shrink-0 items-start gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        {n.isRead ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUnread();
            }}
            className="grid size-7 place-items-center rounded-md text-muted-foreground/50 transition-colors hover:bg-muted hover:text-foreground"
            title="Mark unread"
          >
            <Mail className="size-3.5" />
          </button>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRead();
            }}
            className="grid size-7 place-items-center rounded-md text-muted-foreground/50 transition-colors hover:bg-muted hover:text-foreground"
            title="Mark read"
          >
            <Check className="size-3.5" />
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="grid size-7 place-items-center rounded-md text-muted-foreground/50 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
          title="Delete"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </li>
  );
}
