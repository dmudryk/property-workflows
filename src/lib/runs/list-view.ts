// Список запусків: порожній стан замість порожньої таблиці (AC-DSYS-04). Тексти — дослівно з AC.
export const MSG_NO_RUNS = "No runs yet. Launch a template to start one.";
export const LINK_LAUNCH_TEMPLATE = "Launch a template";
export const LAUNCH_HREF = "/runs/new";

export function runsListView(count: number): "empty" | "table" {
  return count > 0 ? "table" : "empty";
}
