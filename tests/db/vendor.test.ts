// Тести бази зрізу 3 (openspec/specs/vendor-access): справжній Postgres (PGlite) з нашими міграціями, запити від імені
// вендора (asUser) — без моків rpc. Відмовні AC перевіряють і відмову, і незмінні дані (asService — в обхід RLS).
import { beforeEach, describe, expect, it } from "vitest";
import { yourTasksLabel } from "@/lib/runs/list-view";
import { MSG_NOT_ALLOWED_TO_MARK, MSG_RUN_NOT_FOUND } from "@/lib/runs/rules";
import type { TemplateContent } from "@/lib/templates/content";
import { createTestDb, type TestDb } from "./supabase-pglite";

const TENANT_MOVE_IN = "a1000000-0000-4000-8000-000000000001"; // версія 1: 2 секції, 5 задач (1, 2, 4 — обов'язкові)

let t: TestDb;
let ADMIN: string;
let MANAGER_A: string;
let MANAGER_B: string;
let VENDOR: string;
let TASK_IDS: string[]; // id задач шаблону 1…5 у порядку секцій

beforeEach(async () => {
  t = await createTestDb();
  ADMIN = t.users["admin@example.test"];
  MANAGER_A = t.users["manager.a@example.test"];
  MANAGER_B = t.users["manager.b@example.test"];
  VENDOR = t.users["vendor@example.test"];
  const [tpl] = await t.asService<{ current_content: TemplateContent }>(
    "select current_content from public.templates where id = $1",
    [TENANT_MOVE_IN],
  );
  TASK_IDS = tpl.current_content.sections.flatMap((s) => s.tasks.map((task) => task.id));
}, 60_000);

/** Менеджер A запускає «Tenant move-in» для випадку; assignments — {номер задачі 1…5: виконавець}. */
async function launchAsA(caseName: string, assignments: Record<number, string> = {}) {
  const map = Object.fromEntries(Object.entries(assignments).map(([n, user]) => [TASK_IDS[Number(n) - 1], user]));
  const [{ run_id }] = await t.asUser<{ run_id: string }>(
    MANAGER_A,
    "select public.launch_run($1, $2, $3::jsonb) as run_id",
    [TENANT_MOVE_IN, caseName, map],
  );
  return run_id;
}

async function tasksAsService(runId: string) {
  return t.asService<{ id: string; position: number; assignee_id: string; status: string }>(
    "select id, position, assignee_id, status from public.run_tasks where run_id = $1 order by position",
    [runId],
  );
}

async function runStatusOf(runId: string) {
  const [run] = await t.asService<{ status: string }>("select status from public.runs where id = $1", [runId]);
  return run.status;
}

describe("vendor-access", () => {
  it("AC-VENDOR-01: менеджер A призначає вендора V виконавцем задач 3 і 4 — у задач 1, 2 і 5 виконавець A", async () => {
    const runId = await launchAsA("Apartment 12, move-in", { 3: VENDOR, 4: VENDOR });

    // Задачі в порядку шаблону (position — за секціями: 1001, 1002, …), номер задачі — її місце в цьому порядку.
    const tasks = await tasksAsService(runId);
    expect(tasks.map((task, i) => [i + 1, task.assignee_id])).toEqual([
      [1, MANAGER_A],
      [2, MANAGER_A],
      [3, VENDOR],
      [4, VENDOR],
      [5, MANAGER_A],
    ]);
  }, 60_000);

  it("AC-VENDOR-02: вибір виконавця показує менеджеру A email B, адміністратора й V — без імен і ролей", async () => {
    const staff = await t.asUser<Record<string, unknown>>(MANAGER_A, "select * from public.list_staff()");

    const emails = staff.map((s) => s.email);
    expect(emails).toEqual(expect.arrayContaining(["manager.b@example.test", "admin@example.test", "vendor@example.test"]));
    expect(staff.every((s) => Object.keys(s).sort().join(",") === "email,id")).toBe(true);
    expect(staff.find((s) => s.email === "vendor@example.test")?.id).toBe(VENDOR);
  }, 60_000);

  it("AC-VENDOR-03: вендор бачить лише «Apartment 12, move-in» зі статусом і «Your tasks: 0 of 2 done», без «Apartment 14, repair»", async () => {
    const apt12 = await launchAsA("Apartment 12, move-in", { 3: VENDOR, 4: VENDOR });
    await launchAsA("Apartment 14, repair", { 2: MANAGER_B });

    const runs = await t.asUser<{ id: string; case_name: string; status: string }>(
      VENDOR,
      "select id, case_name, status from public.runs order by case_name",
    );
    expect(runs.map((r) => [r.case_name, r.status])).toEqual([["Apartment 12, move-in", "in_progress"]]);

    const ownTasks = await t.asUser<{ status: "to_do" | "done" }>(
      VENDOR,
      "select status from public.run_tasks where run_id = $1",
      [apt12],
    );
    expect(yourTasksLabel(ownTasks)).toBe("Your tasks: 0 of 2 done");
  }, 60_000);

  it("AC-VENDOR-04: вендор у запуску бачить рівно задачі 3 і 4 (назва, секція, позначка, статус) — без задач 1, 2, 5 і email інших", async () => {
    const runId = await launchAsA("Apartment 12, move-in", { 3: VENDOR, 4: VENDOR });

    const all = await tasksAsService(runId);
    const visible = await t.asUser<{ id: string; name: string; section_name: string; required: boolean; status: string }>(
      VENDOR,
      "select id, name, section_name, required, status from public.run_tasks where run_id = $1 order by position",
      [runId],
    );
    expect(visible.map((task) => task.id)).toEqual([all[2].id, all[3].id]);
    expect(visible.map((task) => ({ name: task.name, section_name: task.section_name, required: task.required, status: task.status }))).toEqual([
      { name: "Order cleaning", section_name: "Before move-in", required: false, status: "to_do" },
      { name: "Hand over the keys", section_name: "Move-in day", required: true, status: "to_do" },
    ]);
    // Email інших користувачів: вибір виконавця й профілі вендору порожні, крім власного профілю.
    expect(await t.asUser(VENDOR, "select * from public.list_staff()")).toEqual([]);
    const profiles = await t.asUser<{ email: string }>(VENDOR, "select email from public.profiles");
    expect(profiles.map((p) => p.email)).toEqual(["vendor@example.test"]);
    // Прогресу всього запуску з даних вендору не обчислити: усіх 5 задач він не бачить.
    expect(await tasksAsService(runId)).toHaveLength(5);
  }, 60_000);

  it("AC-VENDOR-05: вендор позначає задачу 3 (не останню обов'язкову) — «done» і «Your tasks: 1 of 2 done»", async () => {
    const runId = await launchAsA("Apartment 12, move-in", { 3: VENDOR, 4: VENDOR });
    const run3 = (await tasksAsService(runId))[2];

    // Не остання обов'язкова: підтвердження не потрібне.
    const [{ completes }] = await t.asUser<{ completes: boolean }>(VENDOR, "select public.completes_run($1) as completes", [run3.id]);
    expect(completes).toBe(false);

    await t.asUser(VENDOR, "select public.mark_task_done($1)", [run3.id]);

    const [after] = await t.asService<{ status: string }>("select status from public.run_tasks where id = $1", [run3.id]);
    expect(after.status).toBe("done");
    const own = await t.asUser<{ status: "to_do" | "done" }>(VENDOR, "select status from public.run_tasks where run_id = $1", [runId]);
    expect(yourTasksLabel(own)).toBe("Your tasks: 1 of 2 done");
  }, 60_000);

  it("AC-VENDOR-05: остання обов'язкова задача запуску вендора — з підтвердженням (completes_run), чужа задача — ні", async () => {
    const runId = await launchAsA("Apartment 12, move-in", { 3: VENDOR, 4: VENDOR });
    const tasks = await tasksAsService(runId);
    for (const position of [1, 2]) {
      await t.asUser(MANAGER_A, "select public.mark_task_done($1)", [tasks[position - 1].id]);
    }

    const completes = (userId: string, position: number) =>
      t
        .asUser<{ c: boolean }>(userId, "select public.completes_run($1) as c", [tasks[position - 1].id])
        .then(([row]) => row.c);
    expect(await completes(VENDOR, 4)).toBe(true); // задача 4 — остання обов'язкова «to do»
    expect(await completes(VENDOR, 3)).toBe(false); // необов'язкова
    expect(await completes(VENDOR, 5)).toBe(false); // не його задача
  }, 60_000);

  it("AC-VENDOR-06: чужий запуск «Apartment 14, repair» для вендора — жодного рядка запуску й задач", async () => {
    await launchAsA("Apartment 12, move-in", { 3: VENDOR, 4: VENDOR });
    const apt14 = await launchAsA("Apartment 14, repair");

    expect(await t.asUser(VENDOR, "select id from public.runs where id = $1", [apt14])).toEqual([]);
    expect(await t.asUser(VENDOR, "select id from public.run_tasks where run_id = $1", [apt14])).toEqual([]);
    expect(await tasksAsService(apt14)).toHaveLength(5); // запуск на місці, просто не для вендора
  }, 60_000);

  it("AC-VENDOR-07: вендор напряму позначає задачу 1 менеджера A — задача 1 лишається «to do», повідомлення AC-TASK-03", async () => {
    const runId = await launchAsA("Apartment 12, move-in", { 3: VENDOR, 4: VENDOR });
    const [task1] = await tasksAsService(runId);

    await expect(t.asUser(VENDOR, "select public.mark_task_done($1)", [task1.id])).rejects.toMatchObject({
      code: "42501",
      message: MSG_NOT_ALLOWED_TO_MARK,
    });

    const [after] = await t.asService<{ status: string }>("select status from public.run_tasks where id = $1", [task1.id]);
    expect(after.status).toBe("to_do");
  }, 60_000);

  it("AC-VENDOR-07: completes_run про чужу останню обов'язкову задачу — вендору false (нічого не розкрито), менеджеру запуску true", async () => {
    // Вендор — на необов'язкових задачах 3 і 5; обов'язкові 1, 2, 4 — у менеджера A. A позначає 1 і 2: задача 4
    // (A) лишається останньою обов'язковою «to do». completes_run — security definer, тож межу «лише виконавець,
    // менеджер запуску чи адміністратор» тримає сама функція (рев'ю CodeRabbit #44).
    const runId = await launchAsA("Apartment 12, move-in", { 3: VENDOR, 5: VENDOR });
    const tasks = await tasksAsService(runId);
    for (const position of [1, 2]) await t.asUser(MANAGER_A, "select public.mark_task_done($1)", [tasks[position - 1].id]);
    const task4 = tasks[3].id;

    const [asVendor] = await t.asUser<{ c: boolean }>(VENDOR, "select public.completes_run($1) as c", [task4]);
    const [asManager] = await t.asUser<{ c: boolean }>(MANAGER_A, "select public.completes_run($1) as c", [task4]);
    expect(asVendor.c).toBe(false);
    expect(asManager.c).toBe(true);
  }, 60_000);

  it("AC-VENDOR-15: вендор напряму позначає задачу 1 «Apartment 14, repair», де не має задач, — «to do» і «Run not found»", async () => {
    await launchAsA("Apartment 12, move-in", { 3: VENDOR, 4: VENDOR }); // свої задачі в іншому запуску — не рахуються
    const apt14 = await launchAsA("Apartment 14, repair");
    const [task1] = await tasksAsService(apt14);
    expect(task1.assignee_id).toBe(MANAGER_A);

    // Код PT404 — PostgREST відповідає HTTP 404 (з P0002 була б HTTP 500 — так показав UAT на проді 10.11).
    await expect(t.asUser(VENDOR, "select public.mark_task_done($1)", [task1.id])).rejects.toMatchObject({
      code: "PT404",
      message: MSG_RUN_NOT_FOUND,
    });
    // Задачі, якої немає, — те саме: вендор не відрізнить чужий запуск від неіснуючого.
    await expect(
      t.asUser(VENDOR, "select public.mark_task_done($1)", ["00000000-0000-4000-8000-000000000000"]),
    ).rejects.toMatchObject({ code: "PT404", message: MSG_RUN_NOT_FOUND });

    const [after] = await t.asService<{ status: string }>("select status from public.run_tasks where id = $1", [task1.id]);
    expect(after.status).toBe("to_do");
  }, 60_000);

  it("AC-VENDOR-16: вендор позначає необов'язкову задачу 3 запуску «completed» — «done», «Your tasks: 1 of 1 done», запуск «completed»", async () => {
    const runId = await launchAsA("Apartment 12, move-in", { 3: VENDOR });
    const tasks = await tasksAsService(runId);
    // Менеджер A виконує обов'язкові 1, 2 і 4 — запуск «completed», необов'язкова задача 3 вендора — «to do».
    for (const position of [1, 2, 4]) {
      await t.asUser(MANAGER_A, "select public.mark_task_done($1)", [tasks[position - 1].id]);
    }
    expect(await runStatusOf(runId)).toBe("completed");

    // Необов'язкова — без підтвердження.
    const [{ c }] = await t.asUser<{ c: boolean }>(VENDOR, "select public.completes_run($1) as c", [tasks[2].id]);
    expect(c).toBe(false);
    await t.asUser(VENDOR, "select public.mark_task_done($1)", [tasks[2].id]);

    const own = await t.asUser<{ status: "to_do" | "done" }>(VENDOR, "select status from public.run_tasks where run_id = $1", [runId]);
    expect(yourTasksLabel(own)).toBe("Your tasks: 1 of 1 done");
    expect(await runStatusOf(runId)).toBe("completed");
  }, 60_000);

  it("AC-VENDOR-17: вендор напряму запитує задачі «Apartment 12, move-in» — отримує лише задачі 3 і 4", async () => {
    const runId = await launchAsA("Apartment 12, move-in", { 3: VENDOR, 4: VENDOR });
    const all = await tasksAsService(runId);

    // Запит напряму — без фільтра за запуском і з фільтром: обидва віддають лише його задачі.
    const direct = await t.asUser<{ id: string; assignee_id: string }>(VENDOR, "select id, assignee_id from public.run_tasks order by position");
    expect(direct.map((task) => task.id)).toEqual([all[2].id, all[3].id]);
    expect(direct.every((task) => task.assignee_id === VENDOR)).toBe(true);
    const byRun = await t.asUser<{ id: string }>(VENDOR, "select id from public.run_tasks where run_id = $1 order by position", [runId]);
    expect(byRun.map((task) => task.id)).toEqual([all[2].id, all[3].id]);
    expect(all).toHaveLength(5);
  }, 60_000);

  it("AC-VENDOR-18: вендор напряму запитує email і профілі інших і задачі «Apartment 14, repair» — нічого про інших і про цей запуск", async () => {
    await launchAsA("Apartment 12, move-in", { 3: VENDOR, 4: VENDOR });
    const apt14 = await launchAsA("Apartment 14, repair", { 2: MANAGER_B });

    // Профілі й email: лише власний профіль; вибір виконавця — порожньо; профілю іншого за id — немає.
    const profiles = await t.asUser<{ id: string; email: string }>(VENDOR, "select id, email from public.profiles");
    expect(profiles).toEqual([{ id: VENDOR, email: "vendor@example.test" }]);
    expect(await t.asUser(VENDOR, "select * from public.list_staff()")).toEqual([]);
    expect(await t.asUser(VENDOR, "select email from public.profiles where id = $1", [MANAGER_A])).toEqual([]);
    // «Apartment 14, repair»: ні запуску, ні задач, ні виконавців.
    expect(await t.asUser(VENDOR, "select id from public.runs where id = $1", [apt14])).toEqual([]);
    expect(await t.asUser(VENDOR, "select id, assignee_id from public.run_tasks where run_id = $1", [apt14])).toEqual([]);
    // Дані на місці — просто не для вендора.
    expect(await tasksAsService(apt14)).toHaveLength(5);
    expect(await t.asService("select id from public.profiles")).not.toHaveLength(1);
  }, 60_000);

  it("AC-VENDOR-08: вендор не бачить жодного шаблону, версії чи незбережених змін", async () => {
    await t.asUser(ADMIN, "select public.save_template_draft($1, current_content) from public.templates where id = $1", [
      TENANT_MOVE_IN,
    ]);

    expect(await t.asUser(VENDOR, "select id from public.templates")).toEqual([]);
    expect(await t.asUser(VENDOR, "select template_id from public.template_versions")).toEqual([]);
    expect(await t.asUser(VENDOR, "select template_id from public.template_drafts")).toEqual([]);
    expect(await t.asService("select id from public.templates where id = $1", [TENANT_MOVE_IN])).toHaveLength(1);
    expect(await t.asService("select template_id from public.template_drafts")).toHaveLength(1);
  }, 60_000);

  it("AC-VENDOR-09: вендор напряму запускає «Tenant move-in» — відмова, запусків не додалось", async () => {
    const before = await t.asService<{ n: number }>("select count(*)::int as n from public.runs");

    await expect(
      t.asUser(VENDOR, "select public.launch_run($1, 'Apartment 12, move-in', '{}'::jsonb)", [TENANT_MOVE_IN]),
    ).rejects.toThrow(/NOT_ALLOWED/);

    const after = await t.asService<{ n: number }>("select count(*)::int as n from public.runs");
    expect(after[0].n).toBe(before[0].n);
  }, 60_000);

  it("AC-VENDOR-10: вендор без жодної задачі не бачить жодного запуску", async () => {
    await launchAsA("Apartment 12, move-in");
    await launchAsA("Apartment 14, repair", { 2: MANAGER_B });

    expect(await t.asUser(VENDOR, "select id from public.runs")).toEqual([]);
    expect(await t.asUser(VENDOR, "select id from public.run_tasks")).toEqual([]);
    // Менеджер і адміністратор бачать свої / усі запуски, як і раніше (AC-TASK-06).
    expect(await t.asUser(ADMIN, "select id from public.runs")).toHaveLength(2);
  }, 60_000);
});
