import { progressLabel } from "./rules";

// Список запусків: порожній стан замість порожньої таблиці (AC-DSYS-04). Тексти — дослівно з AC.
export const MSG_NO_RUNS = "No runs yet. Launch a template to start one.";
export const LINK_LAUNCH_TEMPLATE = "Launch a template";
export const LAUNCH_HREF = "/runs/new";

// Вендор: порожній список без посилання на запуск (AC-VENDOR-10) і прогрес лише своїх задач запуску (AC-VENDOR-03,
// AC-VENDOR-05) — RLS віддає вендору лише його задачі, тож рахуємо з того, що він бачить.
export const MSG_NO_TASKS_YET = "No tasks assigned to you yet.";

export function yourTasksLabel(tasks: readonly { status: string }[]): string {
  return `Your tasks: ${progressLabel(tasks)}`;
}

export function runsListView(count: number): "empty" | "table" {
  return count > 0 ? "table" : "empty";
}
