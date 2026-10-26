import { runStatusLabel, taskStatusLabel } from "@/lib/runs/rules";

// Статуси на всіх сторінках — одне слово й один колір на статус (DESIGN.md, розділи 2 і 5; «Вигляд і тон» PM:
// «to do» — сірий, «in progress» — синій, «done» і «completed» — зелений, «Unpublished changes» — теплий жовтий).
// Колір — лише токени status-*, слово — завжди поруч із кольором.
export const STATUS_TONES = {
  to_do: "bg-status-todo text-status-todo-foreground",
  in_progress: "bg-status-progress text-status-progress-foreground",
  done: "bg-status-done text-status-done-foreground",
  completed: "bg-status-done text-status-done-foreground",
  unpublished: "bg-status-unpublished text-status-unpublished-foreground",
} as const;

export type StatusKind = keyof typeof STATUS_TONES;

export const MSG_UNPUBLISHED_CHANGES = "Unpublished changes";

export function statusLabel(kind: StatusKind): string {
  switch (kind) {
    case "to_do":
    case "done":
      return taskStatusLabel(kind);
    case "in_progress":
    case "completed":
      return runStatusLabel(kind);
    case "unpublished":
      return MSG_UNPUBLISHED_CHANGES;
  }
}

export function statusView(kind: StatusKind): { label: string; tone: string } {
  return { label: statusLabel(kind), tone: STATUS_TONES[kind] };
}

// Статус запуску з бази → вид бейджа. Один і той самий для списку й сторінки запуску (AC-DSYS-01).
export function runStatusKind(status: string): "in_progress" | "completed" {
  return status === "completed" ? "completed" : "in_progress";
}

// Статус задачі з бази → вид бейджа.
export function taskStatusKind(status: string): "to_do" | "done" {
  return status === "done" ? "done" : "to_do";
}
