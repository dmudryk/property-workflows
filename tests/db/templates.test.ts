// Тести бази зрізу WS7 (openspec/specs/template-editor, openspec/specs/design-system): справжній Postgres (PGlite) з
// нашими міграціями. Відмовні AC перевіряють і відмову, і незмінні дані (asService — в обхід RLS).
import { beforeEach, describe, expect, it } from "vitest";
import { countTasks, type TemplateContent } from "@/lib/templates/content";
import { formatKyivDateTime } from "@/lib/templates/format";
import { createTestDb, type TestDb } from "./supabase-pglite";

const TENANT_MOVE_IN = "a1000000-0000-4000-8000-000000000001"; // версія 1: 2 секції, 5 задач, 3 обов'язкові
const MOVE_IN_DAY = "b1000000-0000-4000-8000-000000000002";

let t: TestDb;
let ADMIN_A: string;
let ADMIN_C: string;
let MANAGER_A: string;
let MANAGER_B: string;

beforeEach(async () => {
  t = await createTestDb();
  ADMIN_A = t.users["admin@example.test"];
  ADMIN_C = t.users["pm-admin@example.test"];
  MANAGER_A = t.users["manager.a@example.test"];
  MANAGER_B = t.users["manager.b@example.test"];
}, 60_000);

async function template(id: string) {
  const [row] = await t.asService<{ current_version: number | null; current_content: TemplateContent | null }>(
    "select current_version, current_content from public.templates where id = $1",
    [id],
  );
  return row;
}

async function draft(id: string) {
  const [row] = await t.asService<{ content: TemplateContent }>(
    "select content from public.template_drafts where template_id = $1",
    [id],
  );
  return row?.content ?? null;
}

async function versionCount(id: string) {
  const [row] = await t.asService<{ n: number }>(
    "select count(*)::int as n from public.template_versions where template_id = $1",
    [id],
  );
  return row.n;
}

// Зміст версії 1 «Tenant move-in» + шоста задача «Sign handover act» у секції «Move-in day» (AC-EDITOR-01).
async function withSixthTask(): Promise<TemplateContent> {
  const { current_content } = await template(TENANT_MOVE_IN);
  const content = current_content as TemplateContent;
  return {
    sections: content.sections.map((s) =>
      s.id === MOVE_IN_DAY
        ? { ...s, tasks: [...s.tasks, { id: crypto.randomUUID(), name: "Sign handover act", required: false }] }
        : s,
    ),
  };
}

async function saveDraftAs(userId: string, templateId: string, content: TemplateContent) {
  await t.asUser(userId, "select public.save_template_draft($1, $2)", [templateId, content]);
}

describe("template-editor", () => {
  it("AC-EDITOR-01: зміни без збереження — незбережені зміни з 6 задачами, версія лишається 1", async () => {
    await saveDraftAs(ADMIN_A, TENANT_MOVE_IN, await withSixthTask());

    // A «повертається»: незбережені зміни є (позначка «Unpublished changes»), у них 6 задач.
    const [mine] = await t.asUser<{ content: TemplateContent }>(
      ADMIN_A,
      "select content from public.template_drafts where template_id = $1",
      [TENANT_MOVE_IN],
    );
    expect(countTasks(mine.content)).toBe(6);
    expect((await template(TENANT_MOVE_IN)).current_version).toBe(1);
  }, 60_000);

  it("AC-EDITOR-02: менеджер бачить версію 1 з 5 задачами і не бачить незбережених змін", async () => {
    await saveDraftAs(ADMIN_A, TENANT_MOVE_IN, await withSixthTask());

    const [seen] = await t.asUser<{ current_version: number; current_content: TemplateContent }>(
      MANAGER_B,
      "select current_version, current_content from public.templates where id = $1",
      [TENANT_MOVE_IN],
    );
    expect(seen.current_version).toBe(1);
    expect(countTasks(seen.current_content)).toBe(5);
    const drafts = await t.asUser(MANAGER_B, "select * from public.template_drafts where template_id = $1", [
      TENANT_MOVE_IN,
    ]);
    expect(drafts).toHaveLength(0); // немає позначки про незбережені зміни
    expect(countTasks((await draft(TENANT_MOVE_IN)) as TemplateContent)).toBe(6); // а вони на місці
  }, 60_000);

  it("AC-EDITOR-03: збереження — версія 2 з 6 задачами стає поточною, незбережених змін немає", async () => {
    await saveDraftAs(ADMIN_A, TENANT_MOVE_IN, await withSixthTask());

    const [{ version }] = await t.asUser<{ version: number }>(
      ADMIN_A,
      "select public.publish_template_version($1) as version",
      [TENANT_MOVE_IN],
    );
    expect(version).toBe(2);
    const after = await template(TENANT_MOVE_IN);
    expect(after.current_version).toBe(2);
    expect(countTasks(after.current_content as TemplateContent)).toBe(6);
    expect(await draft(TENANT_MOVE_IN)).toBeNull(); // позначка «Unpublished changes» зникає
    const [v1] = await t.asService<{ content: TemplateContent }>(
      "select content from public.template_versions where template_id = $1 and number = 1",
      [TENANT_MOVE_IN],
    );
    expect(countTasks(v1.content)).toBe(5); // збережена версія не змінюється
  }, 60_000);

  it("AC-EDITOR-04: новий шаблон без обов'язкової задачі — версії немає, зміни й позначка лишаються", async () => {
    const [{ id }] = await t.asUser<{ id: string }>(ADMIN_A, "select public.create_template('Repair') as id");
    const optionalOnly: TemplateContent = {
      sections: [
        {
          id: crypto.randomUUID(),
          name: "Works",
          tasks: ["Inspect", "Fix", "Clean up"].map((name) => ({ id: crypto.randomUUID(), name, required: false })),
        },
      ],
    };
    await saveDraftAs(ADMIN_A, id, optionalOnly);

    await expect(t.asUser(ADMIN_A, "select public.publish_template_version($1)", [id])).rejects.toThrow(
      /NO_REQUIRED_TASK/,
    );
    expect(await versionCount(id)).toBe(0);
    expect((await template(id)).current_version).toBeNull();
    const kept = (await draft(id)) as TemplateContent;
    expect(kept.sections).toHaveLength(1);
    expect(countTasks(kept)).toBe(3);
    // Незбережений шаблон менеджер не бачить.
    expect(await t.asUser(MANAGER_B, "select id from public.templates where id = $1", [id])).toHaveLength(0);
  }, 60_000);

  it("AC-EDITOR-05: список версій від новішої — дата за Києвом і email адміністратора", async () => {
    await saveDraftAs(ADMIN_C, TENANT_MOVE_IN, await withSixthTask());
    await t.asUser(ADMIN_C, "select public.publish_template_version($1)", [TENANT_MOVE_IN]);
    // Дати з AC: 05.10.2026 09:30 і 12.10.2026 14:05 за Києвом (UTC+3, літній час).
    await t.asService(
      `update public.template_versions set created_at = '2026-10-05T06:30:00Z', created_by = $2
       where template_id = $1 and number = 1`,
      [TENANT_MOVE_IN, ADMIN_A],
    );
    await t.asService(
      "update public.template_versions set created_at = '2026-10-12T11:05:00Z' where template_id = $1 and number = 2",
      [TENANT_MOVE_IN],
    );

    const rows = await t.asUser<{ number: number; created_at: string; email: string | null }>(
      ADMIN_A,
      `select v.number, v.created_at, p.email
       from public.template_versions as v left join public.profiles as p on p.id = v.created_by
       where v.template_id = $1 order by v.number desc`,
      [TENANT_MOVE_IN],
    );
    expect(rows.map((r) => [r.number, formatKyivDateTime(r.created_at), r.email])).toEqual([
      [2, "12.10.2026 14:05", "pm-admin@example.test"],
      [1, "05.10.2026 09:30", "admin@example.test"],
    ]);
  }, 60_000);

  it("AC-EDITOR-06: запуск з версії 1 лишається на версії 1 з 5 задачами після збереження версії 2", async () => {
    const [{ run_id }] = await t.asUser<{ run_id: string }>(
      MANAGER_A,
      "select public.launch_run($1, 'Apartment 12, move-in', '{}'::jsonb) as run_id",
      [TENANT_MOVE_IN],
    );
    await saveDraftAs(ADMIN_A, TENANT_MOVE_IN, await withSixthTask());
    await t.asUser(ADMIN_A, "select public.publish_template_version($1)", [TENANT_MOVE_IN]);

    const [run] = await t.asUser<{ template_version: number }>(
      MANAGER_A,
      "select template_version from public.runs where id = $1",
      [run_id],
    );
    expect(run.template_version).toBe(1);
    const tasks = await t.asUser(MANAGER_A, "select id from public.run_tasks where run_id = $1", [run_id]);
    expect(tasks).toHaveLength(5);
  }, 60_000);

  it("AC-EDITOR-07: менеджер не бачить жодної версії шаблону", async () => {
    await saveDraftAs(ADMIN_A, TENANT_MOVE_IN, await withSixthTask());
    await t.asUser(ADMIN_A, "select public.publish_template_version($1)", [TENANT_MOVE_IN]);

    const seen = await t.asUser(MANAGER_B, "select number from public.template_versions where template_id = $1", [
      TENANT_MOVE_IN,
    ]);
    expect(seen).toHaveLength(0);
    expect(await versionCount(TENANT_MOVE_IN)).toBe(2); // версії є, але не для менеджера
  }, 60_000);

  it("AC-EDITOR-08: менеджер напряму не змінює шаблон і не зберігає версію — версія 1, 5 задач, без незбережених змін", async () => {
    const sixTasks = await withSixthTask();

    await expect(saveDraftAs(MANAGER_B, TENANT_MOVE_IN, sixTasks)).rejects.toThrow(/NOT_ALLOWED/);
    await expect(t.asUser(MANAGER_B, "select public.publish_template_version($1)", [TENANT_MOVE_IN])).rejects.toThrow(
      /NOT_ALLOWED/,
    );
    await expect(
      t.asUser(MANAGER_B, "insert into public.template_drafts (template_id, content) values ($1, $2)", [
        TENANT_MOVE_IN,
        sixTasks,
      ]),
    ).rejects.toThrow(/permission denied/);
    await expect(
      t.asUser(MANAGER_B, "update public.templates set current_content = $2 where id = $1", [TENANT_MOVE_IN, sixTasks]),
    ).rejects.toThrow(/permission denied/);
    await expect(
      t.asUser(MANAGER_B, "insert into public.template_versions (template_id, number, content) values ($1, 2, $2)", [
        TENANT_MOVE_IN,
        sixTasks,
      ]),
    ).rejects.toThrow(/permission denied/);

    const after = await template(TENANT_MOVE_IN);
    expect(after.current_version).toBe(1);
    expect(countTasks(after.current_content as TemplateContent)).toBe(5);
    expect(await draft(TENANT_MOVE_IN)).toBeNull();
    expect(await versionCount(TENANT_MOVE_IN)).toBe(1);
  }, 60_000);

  it("AC-EDITOR-09: відвідувач без входу не читає шаблон і не змінює його", async () => {
    await expect(t.asAnon("select current_content from public.templates where id = $1", [TENANT_MOVE_IN])).rejects.toThrow(
      /permission denied/,
    );
    await expect(t.asAnon("select content from public.template_drafts")).rejects.toThrow(/permission denied/);
    await expect(
      t.asAnon("select public.save_template_draft($1, $2)", [TENANT_MOVE_IN, await withSixthTask()]),
    ).rejects.toThrow(/permission denied/);

    expect((await template(TENANT_MOVE_IN)).current_version).toBe(1);
    expect(await draft(TENANT_MOVE_IN)).toBeNull();
  }, 60_000);
});

describe("design-system", () => {
  it("AC-DSYS-02: менеджер не бачить вмісту редактора, шаблон лишається на версії 1 без незбережених змін", async () => {
    await saveDraftAs(ADMIN_A, TENANT_MOVE_IN, await withSixthTask());
    await t.asService("delete from public.template_drafts where template_id = $1", [TENANT_MOVE_IN]);

    // Вміст редактора — незбережені зміни: для менеджера їх немає, а спроба записати — відмова.
    expect(await t.asUser(MANAGER_B, "select * from public.template_drafts")).toHaveLength(0);
    await expect(saveDraftAs(MANAGER_B, TENANT_MOVE_IN, await withSixthTask())).rejects.toThrow(/NOT_ALLOWED/);

    expect((await template(TENANT_MOVE_IN)).current_version).toBe(1);
    expect(await draft(TENANT_MOVE_IN)).toBeNull();
  }, 60_000);

  it("AC-DSYS-03: відвідувач без входу не читає запуск і його задачі — дані запуску не показано", async () => {
    const [{ run_id }] = await t.asUser<{ run_id: string }>(
      MANAGER_A,
      "select public.launch_run($1, 'Apartment 12, move-in', '{}'::jsonb) as run_id",
      [TENANT_MOVE_IN],
    );

    await expect(t.asAnon("select case_name from public.runs where id = $1", [run_id])).rejects.toThrow(
      /permission denied/,
    );
    await expect(t.asAnon("select name from public.run_tasks where run_id = $1", [run_id])).rejects.toThrow(
      /permission denied/,
    );

    const [run] = await t.asService<{ case_name: string }>("select case_name from public.runs where id = $1", [run_id]);
    expect(run.case_name).toBe("Apartment 12, move-in"); // запуск на місці, просто не для відвідувача
  }, 60_000);
});
