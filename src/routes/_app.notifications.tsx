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
  CheckCheck,
  Trash2,
  Search,
  Mail,
  MailOpen,
  Bell,
  Sparkles,
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

const GROUP_ORDER: NotificationGroup[] = ["today", "yesterday", "thisWeek", "earlier"];

type FilterTab = "all" | "unread" | "read";

/* -------------------------------------------------------------------------- */
/*  Skeleton Loader                                                           */
/* -------------------------------------------------------------------------- */

function NotificationSkeleton() {
  return (
    <li className="flex items-start gap-3 rounded-xl border border-border/50 bg-card/60 p-4">
      <div className="size-9 shrink-0 animate-pulse rounded-lg bg-muted" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="h-4 w-3/5 animate-pulse rounded-md bg-muted" />
          <div className="h-3 w-12 shrink-0 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-3 w-4/5 animate-pulse rounded-md bg-muted" />
        <div className="h-3 w-1/4 animate-pulse rounded-md bg-muted" />
      </div>
    </li>
  );
}

function GroupSkeleton() {
  return (
    <div className="space-y-2.5">
      <div className="h-3 w-16 animate-pulse rounded bg-muted" />
      <ul className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <NotificationSkeleton key={i} />
        ))}
      </ul>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Empty State                                                               */
/* -------------------------------------------------------------------------- */

function EmptyState({ filter, search }: { filter: FilterTab; search: string }) {
  const messages: Record<FilterTab, { title: string; sub: string }> = {
    unread: {
      title: "All caught up",
      sub: "You have no unread notifications right now.",
    },
    read: {
      title: "No read notifications",
      sub: "Notifications you read will appear here.",
    },
    all: search
      ? { title: "No results found", sub: `Nothing matches "${search}".` }
      : {
          title: "Your inbox is empty",
          sub: "System alerts and event notifications will show up here.",
        },
  };

  const { title, sub } = messages[filter];

  return (
    <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-border/60 bg-gradient-to-b from-card/80 to-card/20 px-6 py-20">
      {/* Decorative glow */}
      <div className="pointer-events-none absolute -top-20 left-1/2 h-60 w-60 -translate-x-1/2 rounded-full bg-primary/5 blur-3xl" />

      <div className="relative grid size-16 place-items-center rounded-2xl bg-muted/60 ring-1 ring-border/50">
        <Inbox className="size-7 text-muted-foreground/50" />
      </div>
      <h3 className="mt-5 text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-1.5 max-w-xs text-center text-xs leading-relaxed text-muted-foreground">
        {sub}
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Notification Row                                                          */
/* -------------------------------------------------------------------------- */

function NotificationRow({
  notification: n,
  onClick,
  onMarkRead,
  onMarkUnread,
  onDelete,
  index,
}: {
  notification: NotificationItem;
  onClick: () => void;
  onMarkRead: () => void;
  onMarkUnread: () => void;
  onDelete: () => void;
  index: number;
}) {
  const Icon = moduleIcon(n.relatedModule);
  const iconBg = typeColor(n.notificationType);
  const pClass = priorityClasses(n.priority);

  return (
    <li
      className={cn(
        "animate-in fade-in-0 slide-in-from-2 group relative flex items-start gap-3.5 rounded-xl border p-3.5 transition-all duration-200",
        "hover:shadow-sm hover:shadow-black/[0.03]",
        n.isRead
          ? "border-border/40 bg-card/30 hover:border-border/60 hover:bg-card/50"
          : "border-border/70 bg-card shadow-xs shadow-black/[0.02] hover:border-border hover:bg-card/80",
      )}
      style={{ animationDelay: `${index * 40}ms`, animationFillMode: "both" }}
    >
      {/* Unread indicator line */}
      {!n.isRead && (
        <div className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full bg-primary/80" />
      )}

      {/* Icon */}
      <button
        onClick={onClick}
        className={cn(
          "mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg transition-transform duration-150 hover:scale-105",
          iconBg,
        )}
      >
        <Icon className="size-4" />
      </button>

      {/* Content */}
      <button
        onClick={onClick}
        className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-md"
      >
        <div className="flex items-start justify-between gap-3">
          <span
            className={cn(
              "text-[13px] leading-snug",
              n.isRead ? "font-normal text-muted-foreground" : "font-medium text-foreground",
            )}
          >
            {n.title}
          </span>
          <span className="shrink-0 pt-px text-[11px] tabular-nums text-muted-foreground/70">
            {relative(n.createdAt)}
          </span>
        </div>
        <p
          className={cn(
            "mt-1 text-xs leading-relaxed",
            n.isRead ? "text-muted-foreground/60" : "text-muted-foreground/80",
          )}
        >
          {n.message}
        </p>
        <div className="mt-1.5 flex items-center gap-2">
          {n.senderName && (
            <span className="text-[11px] text-muted-foreground/50">
              from <span className="font-medium text-muted-foreground/70">{n.senderName}</span>
            </span>
          )}
          {n.relatedModule && (
            <span className="text-[11px] text-muted-foreground/40">in {n.relatedModule}</span>
          )}
        </div>
      </button>

      {/* Right column: priority badge + actions */}
      <div className="flex shrink-0 flex-col items-end gap-2">
        <span
          className={cn(
            "rounded-md px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
            pClass,
          )}
        >
          {priorityLabel(n.priority)}
        </span>

        {/* Hover actions */}
        <div className="flex items-center gap-0.5 opacity-0 transition-all duration-150 group-hover:opacity-100">
          {n.isRead ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMarkUnread();
              }}
              className="grid size-7 place-items-center rounded-md text-muted-foreground/50 transition-colors hover:bg-accent hover:text-foreground"
              title="Mark as unread"
            >
              <Mail className="size-3.5" />
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMarkRead();
              }}
              className="grid size-7 place-items-center rounded-md text-muted-foreground/50 transition-colors hover:bg-accent hover:text-foreground"
              title="Mark as read"
            >
              <MailOpen className="size-3.5" />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="grid size-7 place-items-center rounded-md text-muted-foreground/50 transition-colors hover:bg-destructive/10 hover:text-destructive"
            title="Delete"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main Page                                                                 */
/* -------------------------------------------------------------------------- */

function NotifsPage() {
  const {
    notifications,
    unreadCount,
    totalCount,
    loading,
    markRead,
    markAllRead,
    markUnread,
    deleteNotification,
    clearAll,
  } = useNotifications();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let result = notifications;
    if (filter === "unread") result = result.filter((n) => !n.isRead);
    else if (filter === "read") result = result.filter((n) => n.isRead);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (n) => n.title.toLowerCase().includes(q) || n.message.toLowerCase().includes(q),
      );
    }
    return result;
  }, [notifications, filter, search]);

  const filteredGroups = useMemo(() => {
    const g: Record<NotificationGroup, NotificationItem[]> = {
      today: [],
      yesterday: [],
      thisWeek: [],
      earlier: [],
    };
    for (const n of filtered) {
      g[n.group]?.push(n);
    }
    return g;
  }, [filtered]);

  const readCount = totalCount - unreadCount;

  async function handleClick(n: NotificationItem) {
    if (!n.isRead) {
      void markRead(n.id);
    }
    const url = n.actionUrl ?? recordUrl(n.recordType, n.recordId);
    if (url) {
      navigate({ to: url });
    }
  }

  function handleClearAll() {
    if (totalCount === 0) return;
    void clearAll();
    toast.success("All notifications cleared");
  }

  function handleMarkAllRead() {
    if (unreadCount === 0) return;
    void markAllRead();
    toast.success("All marked as read");
  }

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: "all", label: "All", count: totalCount },
    { key: "unread", label: "Unread", count: unreadCount },
    { key: "read", label: "Read", count: readCount },
  ];

  let itemIndex = 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Notifications"
        description="Stay on top of alerts, follow-ups, and system events."
        actions={
          <div className="flex items-center gap-2.5">
            {unreadCount > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary ring-1 ring-primary/20">
                <span className="relative flex size-1.5">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/60" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
                </span>
                {unreadCount} unread
              </span>
            )}
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 text-xs"
              onClick={handleMarkAllRead}
              disabled={unreadCount === 0}
            >
              <CheckCheck className="size-3.5" />
              Mark all read
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 text-xs text-destructive/70 hover:border-destructive/30 hover:bg-destructive/5 hover:text-destructive"
              onClick={handleClearAll}
              disabled={totalCount === 0}
            >
              <Trash2 className="size-3.5" />
              Clear all
            </Button>
          </div>
        }
      />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Filter tabs */}
        <div className="inline-flex items-center gap-0.5 rounded-xl border border-border/60 bg-muted/30 p-1 shadow-xs shadow-black/[0.02]">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={cn(
                "relative rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all duration-200",
                filter === tab.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
              {tab.count > 0 && (
                <span
                  className={cn(
                    "ml-1.5 text-[10px] tabular-nums",
                    filter === tab.key ? "text-muted-foreground" : "text-muted-foreground/60",
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Search */}
        <div className="relative w-full max-w-[240px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/40" />
          <Input
            placeholder="Search…"
            className="h-8 rounded-lg border-border/60 bg-muted/30 pl-9 text-xs shadow-none placeholder:text-muted-foreground/40 focus-visible:border-border focus-visible:bg-background"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-8">
          {GROUP_ORDER.map((g) => (
            <GroupSkeleton key={g} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState filter={filter} search={search} />
      ) : (
        <div className="space-y-8">
          {GROUP_ORDER.map((groupKey) => {
            const groupItems = filteredGroups[groupKey];
            if (!groupItems?.length) return null;

            return (
              <div key={groupKey}>
                {/* Group heading */}
                <div className="mb-3 flex items-center gap-2.5">
                  <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                    {GROUP_LABELS[groupKey]}
                  </h3>
                  <div className="h-px flex-1 bg-border/40" />
                  <span className="text-[10px] tabular-nums text-muted-foreground/40">
                    {groupItems.length}
                  </span>
                </div>

                {/* Notification list */}
                <ul className="space-y-2">
                  {groupItems.map((n) => {
                    const idx = itemIndex++;
                    return (
                      <NotificationRow
                        key={n.id}
                        notification={n}
                        onClick={() => void handleClick(n)}
                        onMarkRead={() => void markRead(n.id)}
                        onMarkUnread={() => void markUnread(n.id)}
                        onDelete={() => void deleteNotification(n.id)}
                        index={idx}
                      />
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
