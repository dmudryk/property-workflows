import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  MSG_CANNOT_UNDO,
  MSG_RUN_NOT_FOUND,
  canMarkDone,
  groupBySection,
  needsConfirmation,
  progressLabel,
  requiredLabel,
  staffLabel,
} from "@/lib/runs/rules";
import { markDone } from "../actions";
import { requireActor } from "../actor";
import { RUN_ERRORS, messageFor } from "../messages";

// Сторінка запуску: прогрес «N of M done» (AC-TASK-05), задачі групами за секціями (AC-TASK-12) з email виконавця
// (AC-TASK-11), статусом (AC-TASK-08) і позначкою «required»/«optional» (AC-TASK-15). «Mark as done» — лише тому, хто
// може позначити задачу (AC-TASK-18); остання обов'язкова — з підтвердженням (AC-TASK-04, AC-TASK-16). Права перевіряє
// й база, відмова — повідомлення AC-TASK-03. Запуск, якого користувач не бачить (RLS), — «Run not found» (AC-TASK-10).
export default async function RunPage({ params, searchParams }: PageProps<"/runs/[id]">) {
  const { id } = await params;
  const { error, confirm } = await searchParams;
  const message = messageFor(RUN_ERRORS, error);
  const { supabase, actor } = await requireActor();

  const { data: run } = await supabase
    .from("runs")
    .select("id, case_name, template_name, status, manager_id")
    .eq("id", id)
    .maybeSingle();
  if (!run) {
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

  const [{ data: rows }, { data: staff }] = await Promise.all([
    supabase
      .from("run_tasks")
      .select("id, section_name, name, required, position, assignee_id, status")
      .eq("run_id", id)
      .order("position"),
    supabase.rpc("list_staff"),
  ]);
  const people = new Map((staff ?? []).map((member) => [member.id, member]));
  const tasks = (rows ?? []).map((t) => ({ ...t, sectionName: t.section_name }));
  const sections = groupBySection(tasks);

  const confirmTask =
    typeof confirm === "string"
      ? tasks.find(
          (t) =>
            t.id === confirm &&
            needsConfirmation(
              tasks.map((x) => ({ id: x.id, required: x.required, status: x.status as "to_do" | "done" })),
              t.id,
            ),
        )
      : undefined;

  return (
    <main className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link href="/runs" className="text-sm underline-offset-4 hover:underline">
          Back to runs
        </Link>
        <h1 className="text-2xl font-semibold">{run.case_name}</h1>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span>{run.template_name}</span>
          <StatusBadge data-testid="run-status" kind={run.status === "completed" ? "completed" : "in_progress"} />
          <span>
            Run manager: <span data-testid="run-manager">{staffLabel(people.get(run.manager_id))}</span>
          </span>
        </div>
        <p data-testid="run-progress" className="text-lg font-semibold tabular-nums">
          {progressLabel(tasks)}
        </p>
      </div>

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
              <Button type="submit" variant="destructive">
                Confirm
              </Button>
            </form>
            <Link href={`/runs/${run.id}`} className={buttonVariants({ variant: "outline" })}>
              Cancel
            </Link>
          </div>
        </Alert>
      ) : null}

      {sections.map((section) => (
        <Card key={section.name} size="sm">
          <CardHeader>
            <CardTitle>
              <h2 className="text-lg font-semibold">{section.name}</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col divide-y">
              {section.tasks.map((task) => (
                <li
                  key={task.id}
                  data-testid="run-task"
                  className="flex flex-wrap items-center justify-between gap-2 py-2"
                >
                  <span className="flex flex-col">
                    <span className="font-medium">{task.name}</span>
                    <span data-testid="task-assignee" className="text-sm text-muted-foreground">
                      {staffLabel(people.get(task.assignee_id))}
                    </span>
                  </span>
                  <span className="flex items-center gap-3">
                    <span data-testid="task-required" className="text-sm text-muted-foreground">
                      {requiredLabel(task.required)}
                    </span>
                    <StatusBadge data-testid="task-status" kind={task.status === "done" ? "done" : "to_do"} />
                    {task.status === "to_do" &&
                    actor &&
                    canMarkDone(actor, { managerId: run.manager_id }, { assigneeId: task.assignee_id }) ? (
                      <form action={markDone}>
                        <input type="hidden" name="run_id" value={run.id} />
                        <input type="hidden" name="task_id" value={task.id} />
                        <Button type="submit" variant="outline">
                          Mark as done
                        </Button>
                      </form>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
    </main>
  );
}
