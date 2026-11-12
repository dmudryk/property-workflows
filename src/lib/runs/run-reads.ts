import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

// Читання запусків для сторінок. Менеджер і адміністратор читають таблиці runs і run_tasks (RLS: can_see_run).
// Вендору ці таблиці закрито: RLS фільтрує рядки, а не колонки, тож рядок свого запуску він отримав би цілком —
// з назвою, версією й id шаблону та менеджером запуску. Вендор читає лише через функції бази з білим списком колонок
// vendor_runs і vendor_tasks (ADR 0005; матриця прав: «enforced for direct requests too»; AC-VENDOR-11, 17, 18).

export type RunListRow = {
  id: string;
  case_name: string;
  template_name?: string;
  status: string;
  created_at: string;
  run_tasks: { status: string }[];
};

/** Рядки списку запусків: вендору — без назви шаблону (у функції її немає), «Your tasks» — з його задач. */
export async function listRuns(supabase: Supabase, vendor: boolean): Promise<RunListRow[]> {
  if (!vendor) {
    const { data } = await supabase.from("runs").select("id, case_name, template_name, status, created_at, run_tasks(status)");
    return data ?? [];
  }
  const [{ data: runs }, { data: tasks }] = await Promise.all([supabase.rpc("vendor_runs", {}), supabase.rpc("vendor_tasks", {})]);
  return (runs ?? []).map((run) => ({
    ...run,
    run_tasks: (tasks ?? []).filter((task) => task.run_id === run.id).map((task) => ({ status: task.status })),
  }));
}

type RunTaskRow = {
  id: string;
  section_name: string;
  name: string;
  required: boolean;
  position: number;
  assignee_id: string;
  status: string;
};

/** Вендору — лише назва випадку й статус: полів шаблону й менеджера в його даних немає навіть у типі. */
export type RunPageData =
  | { vendor: true; run: { id: string; case_name: string; status: string }; tasks: RunTaskRow[] }
  | {
      vendor: false;
      run: { id: string; case_name: string; status: string; template_name: string; template_version: number; manager_id: string };
      tasks: RunTaskRow[];
    };

/** Запуск і його задачі; null — запуску немає або його не видно (сторінка — «Run not found»). */
export async function loadRun(supabase: Supabase, runId: string, vendorId: string | null): Promise<RunPageData | null> {
  if (vendorId) {
    const [{ data: runs }, { data: tasks }] = await Promise.all([
      supabase.rpc("vendor_runs", { p_run_id: runId }),
      supabase.rpc("vendor_tasks", { p_run_id: runId }),
    ]);
    const run = runs?.[0];
    if (!run) return null;
    return {
      vendor: true,
      run,
      // vendor_tasks віддає лише задачі самого вендора — виконавець кожної він сам.
      tasks: (tasks ?? []).map((task) => ({ ...task, assignee_id: vendorId })),
    };
  }
  const [{ data: run }, { data: tasks }] = await Promise.all([
    supabase.from("runs").select("id, case_name, template_name, template_version, status, manager_id").eq("id", runId).maybeSingle(),
    supabase
      .from("run_tasks")
      .select("id, section_name, name, required, position, assignee_id, status")
      .eq("run_id", runId)
      .order("position"),
  ]);
  return run ? { vendor: false, run, tasks: tasks ?? [] } : null;
}
