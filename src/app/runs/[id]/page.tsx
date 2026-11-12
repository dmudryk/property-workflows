import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { SubmitButton } from "@/components/submit-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { MSG_CANNOT_UNDO, MSG_RUN_NOT_FOUND, canMarkDone, needsConfirmation, staffLabel } from "@/lib/runs/rules";
import { isVendor, requireActor } from "@/lib/auth/actor";
import { loadRun } from "@/lib/runs/run-reads";
import { runStatusKind, taskStatusKind } from "@/lib/status";
import { templateVersionLabel } from "@/lib/templates/format";
import { markDone } from "../actions";
import { RUN_ERRORS, messageFor } from "../messages";
import { RunTasks, type RunTaskView } from "./run-tasks";

// Сторінка запуску: прогрес «N of M done» (AC-TASK-05), задачі групами за секціями (AC-TASK-12) з email виконавця
// (AC-TASK-11), статусом (AC-TASK-08) і позначкою «required»/«optional» (AC-TASK-15). «Mark as done» — лише тому, хто
// може позначити задачу (AC-TASK-18); остання обов'язкова — з підтвердженням (AC-TASK-04, AC-TASK-16). Права перевіряє
// й база, відмова — повідомлення AC-TASK-03. Запуск, якого користувач не бачить (RLS), — «Run not found» (AC-TASK-10).
// Версія шаблону, з якої створено запуск, — «Template version N» (AC-EDITOR-06). Прогрес і задачі показує RunTasks
// (позначка «Mark as done» — оптимістично, DESIGN.md, розділ 6).
// Вендор бачить лише свої задачі — назву, секцію, «required»/«optional», статус — і «Your tasks: N of K done»;
// без шаблону, версії, менеджера запуску, email і прогресу всього запуску (AC-VENDOR-04, AC-VENDOR-05). Таблиці runs і
// run_tasks вендору закрито: запуск і задачі приходять з функцій бази vendor_runs і vendor_tasks, де шаблону, версії й
// менеджера немає взагалі (loadRun; ADR 0005). Запуск без його задач функція не віддає — «Run not found» (AC-VENDOR-06).
// Підтвердження останньої обов'язкової — за public.completes_run.
export default async function RunPage({ params, searchParams }: PageProps<"/runs/[id]">) {
  const { id } = await params;
  const { error, confirm } = await searchParams;
  const message = messageFor(RUN_ERRORS, error);
  const { supabase, actor } = await requireActor();
  const vendor = isVendor(actor);

  const loaded = await loadRun(supabase, id, vendor && actor ? actor.id : null);
  if (!loaded) {
    return (
      <main className="flex flex-col gap-4">
        <Link href="/runs" className="text-sm underline-offset-4 hover:underline">
          Back to runs
        </Link>
        <p role="alert" data-testid="run-not-found" className="text-lg font-semibold">
          {MSG_RUN_NOT_FOUND}
        </p>
      </main>
    );
  }

  const { run, tasks: rows } = loaded;
  const managerId = loaded.vendor ? null : loaded.run.manager_id;
  // Вендору email інших користувачів не показуємо (і база йому їх не віддає).
  const { data: staff } = vendor ? { data: [] } : await supabase.rpc("list_staff");
  const people = new Map((staff ?? []).map((member) => [member.id, member]));
  // Вендор сам не бачить, чи його задача — остання обов'язкова «to do» у запуску: це каже база.
  const completes = new Map(
    await Promise.all(
      (vendor ? (rows ?? []).filter((t) => t.status === "to_do") : []).map(
        async (t) => [t.id, (await supabase.rpc("completes_run", { p_task_id: t.id })).data === true] as const,
      ),
    ),
  );
  const tasks: RunTaskView[] = (rows ?? []).map((t) => ({
    id: t.id,
    sectionName: t.section_name,
    name: t.name,
    required: t.required,
    position: t.position,
    status: taskStatusKind(t.status),
    assigneeLabel: vendor ? "" : staffLabel(people.get(t.assignee_id)),
    canMark: actor ? canMarkDone(actor, { managerId: managerId ?? "" }, { assigneeId: t.assignee_id }) : false,
    completesRun: completes.get(t.id),
  }));

  const confirmable = (taskId: string) =>
    vendor ? tasks.some((t) => t.id === taskId && t.completesRun) : needsConfirmation(tasks, taskId);
  const confirmTask = typeof confirm === "string" && confirmable(confirm) ? tasks.find((t) => t.id === confirm) : undefined;

  // Вендору — назва випадку заголовком і «Your tasks: N of K done» (RunTasks), без статусу запуску, назви й версії
  // шаблону (AC-VENDOR-11; solomchaak/property-workflows-spec#41).
  const header = loaded.vendor ? (
    <>
      <Link href="/runs" className="text-sm underline-offset-4 hover:underline">
        Back to runs
      </Link>
      <h1 className="text-2xl font-semibold">{run.case_name}</h1>
    </>
  ) : (
    <>
      <Link href="/runs" className="text-sm underline-offset-4 hover:underline">
        Back to runs
      </Link>
      <h1 className="text-2xl font-semibold">{run.case_name}</h1>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
        <span>{loaded.run.template_name}</span>
        <span data-testid="template-version" className="tabular-nums">
          {templateVersionLabel(loaded.run.template_version)}
        </span>
        <StatusBadge data-testid="run-status" kind={runStatusKind(run.status)} />
        <span>
          Run manager: <span data-testid="run-manager">{staffLabel(people.get(loaded.run.manager_id))}</span>
        </span>
      </div>
    </>
  );

  const notices = (
    <>
      {message ? (
        <Alert variant="destructive">
          <AlertDescription className="text-destructive">{message}</AlertDescription>
        </Alert>
      ) : null}

      {confirmTask ? (
        <Alert role="alertdialog" data-testid="confirm-done" className="border-destructive">
          <AlertTitle>Mark &quot;{confirmTask.name}&quot; as done?</AlertTitle>
          <AlertDescription className="text-foreground">{MSG_CANNOT_UNDO}</AlertDescription>
          <div className="mt-3 flex gap-3">
            <form action={markDone}>
              <input type="hidden" name="run_id" value={run.id} />
              <input type="hidden" name="task_id" value={confirmTask.id} />
              <input type="hidden" name="confirmed" value="1" />
              <SubmitButton variant="destructive" pendingLabel="Confirming…">
                Confirm
              </SubmitButton>
            </form>
            <Link href={`/runs/${run.id}`} className={buttonVariants({ variant: "outline" })}>
              Cancel
            </Link>
          </div>
        </Alert>
      ) : null}
    </>
  );

  return (
    <main className="flex flex-col gap-6">
      <RunTasks runId={run.id} tasks={tasks} header={header} notices={notices} vendor={vendor} />
    </main>
  );
}
