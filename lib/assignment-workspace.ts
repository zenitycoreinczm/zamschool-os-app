export type AssignmentWorkspaceItem = {
  id: string;
  title: string;
  class: string;
  teacher: string;
  dueAt: string;
  totalMarks: number;
  description: string;
};

type FilterMode = "all" | "due-soon" | "overdue";

export function buildAssignmentSummary(
  items: AssignmentWorkspaceItem[],
  today: string = todayIso()
) {
  const dueSoon = items.filter((item) => isDueSoon(item.dueAt, today)).length;
  const overdue = items.filter((item) => isOverdue(item.dueAt, today)).length;
  const missingDescription = items.filter((item) => !item.description.trim()).length;

  return {
    total: items.length,
    dueSoon,
    overdue,
    missingDescription,
  };
}

export function filterAssignments(
  items: AssignmentWorkspaceItem[],
  {
    query,
    mode,
    today = todayIso(),
  }: {
    query: string;
    mode: FilterMode;
    today?: string;
  }
) {
  const needle = query.trim().toLowerCase();

  return items.filter((item) => {
    if (mode === "due-soon" && !isDueSoon(item.dueAt, today)) {
      return false;
    }
    if (mode === "overdue" && !isOverdue(item.dueAt, today)) {
      return false;
    }

    if (!needle) {
      return true;
    }

    return `${item.title} ${item.class} ${item.teacher}`.toLowerCase().includes(needle);
  });
}

export function getAssignmentActionItems() {
  return [
    { key: "edit", label: "Edit assignment", tone: "neutral" },
    { key: "delete", label: "Delete assignment", tone: "danger" },
  ] as const;
}

function isDueSoon(dueAt: string, today: string) {
  const diffDays = dayDiff(today, dueAt);
  return diffDays >= 0 && diffDays <= 2;
}

function isOverdue(dueAt: string, today: string) {
  return dayDiff(today, dueAt) < 0;
}

function dayDiff(left: string, right: string) {
  const start = Date.parse(`${left}T00:00:00.000Z`);
  const end = Date.parse(`${right}T00:00:00.000Z`);
  return Math.round((end - start) / 86400000);
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}
