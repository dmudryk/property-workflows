"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { MSG_EMPTY_CASE_NAME, needsConfirmation, validateCaseName } from "@/lib/runs/rules";
import { isVendor, requireActor } from "@/lib/auth/actor";

// Запуск шаблону для випадку (AC-RUN-01…09). Правила — src/lib/runs/rules.ts; запис — одна функція Postgres
// public.launch_run (design.md, D5), тож запуск і всі його задачі створюються в одній транзакції.
export async function launchRun(formData: FormData) {
  const { supabase, actor } = await requireActor();
  const templateId = String(formData.get("template_id") ?? "");
  const caseName = String(formData.get("case_name") ?? "");
  const back = (error: string) =>
    redirect(`/runs/new?template=${encodeURIComponent(templateId)}&error=${error}`);

  if (!actor) back("forbidden");
  if (!templateId) redirect("/runs/new");

  const name = validateCaseName(caseName);
  if (!name.ok) back(name.error === MSG_EMPTY_CASE_NAME ? "empty" : "too_long");

  // Поля assignee:<id задачі шаблону>; порожнє значення — менеджер запуску (AC-RUN-08, AC-RUN-09).
  const assignments: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("assignee:") && typeof value === "string" && value) {
      assignments[key.slice("assignee:".length)] = value;
    }
  }

  const { data: runId, error } = await supabase.rpc("launch_run", {
    p_template_id: templateId,
    p_case_name: caseName,
    p_assignments: assignments,
  });

  if (error || !runId) {
    const message = error?.message ?? "";
    if (message.includes("EMPTY_CASE_NAME")) back("empty");
    if (message.includes("CASE_NAME_TOO_LONG")) back("too_long");
    back("failed");
  }

  revalidatePath("/runs");
  redirect(`/runs/${runId}`);
}

type Session = Awaited<ReturnType<typeof requireActor>>;
type Actor = NonNullable<Session["actor"]>;

// AC-TASK-04, AC-TASK-16: остання обов'язкова задача — лише після підтвердження («This cannot be undone»).
// Вендор бачить лише свої задачі, тож для нього це вирішує база (public.completes_run; AC-VENDOR-05).
// null — перевірка не вдалась: тоді не позначаємо, інакше остання обов'язкова задача пройшла б без підтвердження,
// а запуск безповоротно став би «completed» (рев'ю CodeRabbit #44).
async function confirmationFirst(
  supabase: Session["supabase"],
  actor: Actor,
  runId: string,
  taskId: string,
): Promise<boolean | null> {
  if (isVendor(actor)) {
    const { data, error } = await supabase.rpc("completes_run", { p_task_id: taskId });
    return error ? null : data === true;
  }
  const { data: tasks, error } = await supabase.from("run_tasks").select("id, required, status").eq("run_id", runId);
  if (error) return null;
  const list = (tasks ?? []).map((t) => ({ id: t.id, required: t.required, status: t.status as "to_do" | "done" }));
  return needsConfirmation(list, taskId);
}

// Права перевіряє база (private.mark_task_done, ADR 0001); відмова в правах (42501 / NOT_ALLOWED) — повідомлення
// AC-TASK-03, інші збої — окреме повідомлення.
async function markTaskDone(supabase: Session["supabase"], taskId: string): Promise<"not_allowed" | "failed" | null> {
  const { error } = await supabase.rpc("mark_task_done", { p_task_id: taskId });
  if (!error) return null;
  return error.code === "42501" || error.message.includes("NOT_ALLOWED") ? "not_allowed" : "failed";
}

// Позначка задачі виконаною (AC-TASK-01…04, AC-TASK-07).
export async function markDone(formData: FormData) {
  const { supabase, actor } = await requireActor();
  const runId = String(formData.get("run_id") ?? "");
  const taskId = String(formData.get("task_id") ?? "");
  if (!runId || !taskId) redirect("/runs");
  if (!actor) redirect(`/runs/${runId}?error=not_allowed`);

  if (formData.get("confirmed") !== "1") {
    const confirmFirst = await confirmationFirst(supabase, actor, runId, taskId);
    if (confirmFirst === null) redirect(`/runs/${runId}?error=failed`);
    if (confirmFirst) redirect(`/runs/${runId}?confirm=${encodeURIComponent(taskId)}`);
  }

  const code = await markTaskDone(supabase, taskId);
  revalidatePath("/runs");
  revalidatePath(`/runs/${runId}`);
  redirect(code ? `/runs/${runId}?error=${code}` : `/runs/${runId}`);
}
