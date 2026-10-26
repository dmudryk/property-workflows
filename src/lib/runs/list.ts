import type { RunStatus } from "@/lib/runs/rules";

// Список запусків (/runs): фільтр за статусом і пошук за назвою випадку працюють на клієнті над уже прочитаними
// рядками — які запуски видно, як і раніше, вирішує база (RLS).
export type RunFilter = "all" | RunStatus;

export type RunListItem = {
  id: string;
  caseName: string;
  templateName: string;
  status: RunStatus;
  done: number;
  total: number;
  progress: string;
};

// Ті самі N і M, що в «N of M done» (progressLabel): N — задачі «done», M — усі задачі запуску.
export function progressCounts(tasks: readonly { status: string }[]): { done: number; total: number } {
  return { done: tasks.filter((t) => t.status === "done").length, total: tasks.length };
}

// Заповнення смуги прогресу у відсотках; запуск без задач — порожня смуга.
export function progressPercent({ done, total }: { done: number; total: number }): number {
  return total > 0 ? Math.round((done / total) * 100) : 0;
}

export function countByStatus(runs: readonly Pick<RunListItem, "status">[]): Record<RunFilter, number> {
  const inProgress = runs.filter((r) => r.status === "in_progress").length;
  return { all: runs.length, in_progress: inProgress, completed: runs.length - inProgress };
}

// Пошук — підрядок назви випадку без урахування регістру; пробіли на краях запиту не враховуються.
export function filterRuns<T extends Pick<RunListItem, "status" | "caseName">>(
  runs: readonly T[],
  filter: RunFilter,
  query: string,
): T[] {
  const needle = query.trim().toLocaleLowerCase();
  return runs.filter(
    (r) => (filter === "all" || r.status === filter) && (!needle || r.caseName.toLocaleLowerCase().includes(needle)),
  );
}
