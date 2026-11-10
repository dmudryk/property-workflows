// Тест бази для run-tasks (openspec/specs/run-tasks, AC-TASK-19): справжній Postgres (PGlite) з нашими міграціями,
// запити від імені ролей (asUser) — без моків rpc. Позначку й статус запуску вирішує база (private.mark_task_done,
// тригер refresh_run_status), тож і доводить їх тест бази.
import { beforeEach, describe, expect, it } from "vitest";
import { progressLabel } from "@/lib/runs/rules";
import type { TemplateContent } from "@/lib/templates/content";
import { createTestDb, type TestDb } from "./supabase-pglite";

const REPAIR = "a1000000-0000-4000-8000-000000000002"; // версія 1: «Assessment» (1 обов'язкова), «Works» (1 обов'язкова, 1 ні)

let t: TestDb;
let ADMIN: string;
let MANAGER_A: string;
let MANAGER_B: string;

beforeEach(async () => {
  t = await createTestDb();
  ADMIN = t.users["admin@example.test"];
  MANAGER_A = t.users["manager.a@example.test"];
  MANAGER_B = t.users["manager.b@example.test"];
}, 60_000);

/** Адміністратор додає до «Repair» необов'язкову задачу «Order a part» і зберігає версію 2 — тими самими функціями, що й редактор. */
async function repairWithOrderAPart(): Promise<string> {
  const [tpl] = await t.asService<{ current_content: TemplateContent }>(
    "select current_content from public.templates where id = $1",
    [REPAIR],
  );
  const orderAPart = { id: crypto.randomUUID(), name: "Order a part", required: false };
  const sections = tpl.current_content.sections;
  const content: TemplateContent = {
    ...tpl.current_content,
    sections: sections.map((s, i) => (i === sections.length - 1 ? { ...s, tasks: [...s.tasks, orderAPart] } : s)),
  };
  await t.asUser(ADMIN, "select public.save_template_draft($1, $2)", [REPAIR, content]);
  await t.asUser(ADMIN, "select public.publish_template_version($1)", [REPAIR]);
  return orderAPart.id;
}

async function runTasks(runId: string) {
  return t.asService<{ id: string; name: string; required: boolean; status: "to_do" | "done" }>(
    "select id, name, required, status from public.run_tasks where run_id = $1 order by position",
    [runId],
  );
}

async function runStatusOf(runId: string) {
  const [run] = await t.asService<{ status: string }>("select status from public.runs where id = $1", [runId]);
  return run.status;
}

describe("run-tasks", () => {
  it("AC-TASK-19: виконавець позначає необов'язкову «Order a part» запуску «completed» — «done», запуск «completed», прогрес рахує її", async () => {
    const orderAPartTemplateTask = await repairWithOrderAPart();
    const [{ run_id: runId }] = await t.asUser<{ run_id: string }>(
      MANAGER_A,
      "select public.launch_run($1, 'Apartment 14, repair', $2::jsonb) as run_id",
      [REPAIR, { [orderAPartTemplateTask]: MANAGER_B }],
    );
    // Менеджер A виконує обов'язкові задачі — запуск «completed», «Order a part» менеджера B — «to do».
    for (const task of (await runTasks(runId)).filter((task) => task.required)) {
      await t.asUser(MANAGER_A, "select public.mark_task_done($1)", [task.id]);
    }
    expect(await runStatusOf(runId)).toBe("completed");
    const orderAPart = (await runTasks(runId)).find((task) => task.name === "Order a part")!;
    expect(orderAPart.status).toBe("to_do");
    expect(progressLabel(await runTasks(runId))).toBe("2 of 4 done");

    // Необов'язкова — без підтвердження; позначає виконавець.
    const [{ c }] = await t.asUser<{ c: boolean }>(MANAGER_B, "select public.completes_run($1) as c", [orderAPart.id]);
    expect(c).toBe(false);
    await t.asUser(MANAGER_B, "select public.mark_task_done($1)", [orderAPart.id]);

    const after = await runTasks(runId);
    expect(after.find((task) => task.id === orderAPart.id)?.status).toBe("done");
    expect(await runStatusOf(runId)).toBe("completed");
    // Прогрес рахує задачу виконаною — і в даних, і в тому, що бачить виконавець (усі задачі запуску, AC-TASK-17).
    expect(progressLabel(after)).toBe("3 of 4 done");
    const seenByB = await t.asUser<{ status: "to_do" | "done" }>(MANAGER_B, "select status from public.run_tasks where run_id = $1", [runId]);
    expect(progressLabel(seenByB)).toBe("3 of 4 done");
  }, 60_000);
});
