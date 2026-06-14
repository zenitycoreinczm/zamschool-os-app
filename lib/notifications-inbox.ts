export type InboxItem = {
  id: string;
  title: string;
  body: string;
  type: "notification" | "announcement" | "event" | (string & {});
  status: "read" | "unread";
  href: string;
  timestamp: string;
};

type InboxMode = "all" | "unread" | "read";

export function buildInboxCounts(items: InboxItem[]) {
  const unread = items.filter((item) => item.status === "unread").length;
  return {
    all: items.length,
    unread,
    read: items.length - unread,
  };
}

export function filterInboxItems(
  items: InboxItem[],
  {
    query,
    mode,
  }: {
    query: string;
    mode: InboxMode;
  }
) {
  const needle = query.trim().toLowerCase();
  return items.filter((item) => {
    if (mode !== "all" && item.status !== mode) {
      return false;
    }
    if (!needle) {
      return true;
    }
    return `${item.title} ${item.body} ${item.type}`.toLowerCase().includes(needle);
  });
}

export function canMarkAllAsRead(items: InboxItem[]) {
  return items.some((item) => item.status === "unread");
}

export function getInboxActionItems(item: InboxItem) {
  if (item.status === "unread") {
    return [
      { key: "open", label: "Open item", tone: "neutral" },
      { key: "mark-read", label: "Mark as read", tone: "neutral" },
    ] as const;
  }
  return [{ key: "open", label: "Open item", tone: "neutral" }] as const;
}
