// Тести бази уточнень PM від 27.10 (openspec/specs/template-editor; impl-ws7-clarifications): справжній Postgres
// (PGlite) з нашими міграціями. Відмовні AC перевіряють і відмову, і незмінні дані (asService — в обхід RLS).
import { beforeEach, describe, expect, it } from "vitest";
import {
  countTasks,
  moveTask,
  renameTask,
  renameTemplate,
  type TemplateContent,
} from "@/lib/templates/content";
import { resolveRemove } from "@/lib/templates/editor-state";
import { createTestDb, type TestDb } from "./supabase-pglite";

const TENANT_MOVE_IN = "a1000000-0000-4000-8000-000000000001"; // версія 1: 2 секції, 5 задач, 3 обов'язкові
const MOVE_IN_DAY = "b1000000-0000-4000-8000-000000000002";
const SEEDED_REPAIR = "a1000000-0000-4000-8000-000000000002"; // «Repair» зрізу 1, версія 1

let t: TestDb;
let ADMIN_A: string;
let MANAGER_B: string;

beforeEach(async () => {
  t = await createTestDb();
  ADMIN_A = t.users["admin@example.test"];
  MANAGER_B = t.users["manager.b@example.test"];
}, 60_000);

async function template(id: string) {
  const [row] = await t.asService<{ name: string; current_version: number | null; current_content: TemplateContent | null }>(
    "select name, current_version, current_content from public.templates where id = $1",
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

async function count(table: "templates" | "runs") {
  const [row] = await t.asService<{ n: number }>(`select count(*)::int as n from public.${table}`);
  return row.n;
}

async function versionOne(): Promise<TemplateContent> {
  return (await template(TENANT_MOVE_IN)).current_content as TemplateContent;
}

function withTask(content: TemplateContent, sectionId: string, name: string, required = false): TemplateContent {
  return {
    ...content,
    sections: content.sections.map((s) =>
      s.id === sectionId ? { ...s, tasks: [...s.tasks, { id: crypto.randomUUID(), name, required }] } : s,
    ),
  };
}

const saveDraft = (userId: string, id: string, content: TemplateContent) =>
  t.asUser(userId, "select public.save_template_draft($1, $2)", [id, content]);

const publish = async (userId: string, id: string) => {
  const [{ version }] = await t.asUser<{ version: number | null }>(
    userId,
    "select public.publish_template_version($1) as version",
    [id],
  );
  return version;
};

// Новий «Repair», який ще ніколи не зберігали (AC-EDITOR-11, 16): назва унікальна, тож «Repair» зрізу 1 спершу
// отримує іншу назву.
async function createRepair(): Promise<string> {
  await t.asService("update public.templates set name = 'Repair (slice 1)' where id = $1", [SEEDED_REPAIR]);
  const [{ id }] = await t.asUser<{ id: string }>(ADMIN_A, "select public.create_template('Repair') as id");
  return id;
}

// Розклад задач з AC PM (AC-EDITOR-13, 14, 28): «Before move-in» — 2 задачі, «Move-in day» — 3. У даних зрізу 1 —
// 3 і 2, тож остання задача «Before move-in» переходить на початок «Move-in day» у версії 1.
async function usePmTaskLayout() {
  const v1 = await versionOne();
  const before = v1.sections.find((s) => s.id !== MOVE_IN_DAY)!;
  const layout = moveTask(v1, before.tasks[before.tasks.length - 1].id, 1);
  await t.asService("update public.template_versions set content = $2 where template_id = $1 and number = 1", [
    TENANT_MOVE_IN,
    layout,
  ]);
  await t.asService("update public.templates set current_content = $2 where id = $1", [TENANT_MOVE_IN, layout]);
}

// Новий «Repair» з 1 секцією і 3 задачами, одна обов'язкова — валідний для збереження.
function repairContent(): TemplateContent {
  return {
    sections: [
      {
        id: crypto.randomUUID(),
        name: "Works",
        tasks: ["Inspect", "Fix", "Clean up"].map((name, i) => ({ id: crypto.randomUUID(), name, required: i === 0 })),
      },
    ],
  };
}

describe("template-editor", () => {
  it("AC-EDITOR-11: прямий запуск незбереженого «Repair» — запуску немає, список запусків той самий", async () => {
    const repair = await createRepair();
    const runsBefore = await count("runs");

    await expect(
      t.asUser(ADMIN_A, "select public.launch_run($1, 'Repair, flat 3', '{}'::jsonb)", [repair]),
    ).rejects.toThrow(/TEMPLATE_NOT_FOUND/);

    expect(await count("runs")).toBe(runsBefore);
    expect((await template(repair)).current_version).toBeNull();
  }, 60_000);

  it("AC-EDITOR-12: збереження без незбережених змін — версії 3 немає, поточна лишається 2", async () => {
    await saveDraft(ADMIN_A, TENANT_MOVE_IN, withTask(await versionOne(), MOVE_IN_DAY, "Sign handover act"));
    expect(await publish(ADMIN_A, TENANT_MOVE_IN)).toBe(2);
    expect(await draft(TENANT_MOVE_IN)).toBeNull();

    // Прямий запит (як і кнопка редактора) — без незбережених змін нічого не створює.
    expect(await publish(ADMIN_A, TENANT_MOVE_IN)).toBe(2);

    expect(await versionCount(TENANT_MOVE_IN)).toBe(2);
    expect((await template(TENANT_MOVE_IN)).current_version).toBe(2);
  }, 60_000);

  it("AC-EDITOR-14: підтверджене видалення «Move-in day» — секції немає в незбережених змінах, версія 1 — 2 секції і 5 задач", async () => {
    await usePmTaskLayout();
    const v1 = await versionOne();
    const section = v1.sections.find((s) => s.id === MOVE_IN_DAY)!;
    expect(section.tasks).toHaveLength(3);

    await saveDraft(ADMIN_A, TENANT_MOVE_IN, resolveRemove(v1, { kind: "section", id: section.id, name: section.name }, true));

    const kept = (await draft(TENANT_MOVE_IN)) as TemplateContent;
    expect(kept.sections.map((s) => s.id)).not.toContain(MOVE_IN_DAY);
    expect(countTasks(kept)).toBe(2);
    const [v1After] = await t.asService<{ content: TemplateContent }>(
      "select content from public.template_versions where template_id = $1 and number = 1",
      [TENANT_MOVE_IN],
    );
    expect(v1After.content.sections).toHaveLength(2);
    expect(countTasks(v1After.content)).toBe(5);
  }, 60_000);

  it("AC-EDITOR-15: третя секція «After move-in» без задач — EMPTY_SECTION, версії 2 немає, незбережені зміни лишаються", async () => {
    const v1 = await versionOne();
    const withEmpty: TemplateContent = {
      ...v1,
      sections: [...v1.sections, { id: crypto.randomUUID(), name: "After move-in", tasks: [] }],
    };
    await saveDraft(ADMIN_A, TENANT_MOVE_IN, withEmpty);

    await expect(publish(ADMIN_A, TENANT_MOVE_IN)).rejects.toThrow(/EMPTY_SECTION/);

    expect(await versionCount(TENANT_MOVE_IN)).toBe(1);
    expect((await template(TENANT_MOVE_IN)).current_version).toBe(1);
    const kept = (await draft(TENANT_MOVE_IN)) as TemplateContent;
    expect(kept.sections.map((s) => s.name)).toContain("After move-in"); // позначка «Unpublished changes» лишається
  }, 60_000);

  it("AC-EDITOR-16: менеджер не читає незбережений «Repair» за прямим посиланням — ні шаблону, ні секцій", async () => {
    const repair = await createRepair();
    await saveDraft(ADMIN_A, repair, repairContent());

    expect(await t.asUser(MANAGER_B, "select id, name from public.templates where id = $1", [repair])).toHaveLength(0);
    expect(await t.asUser(MANAGER_B, "select content from public.template_drafts where template_id = $1", [repair])).toHaveLength(0);
    expect(await template(repair)).toBeDefined(); // шаблон є, але не для менеджера
  }, 60_000);

  it("AC-EDITOR-19: порожня назва чи лише пробіли — EMPTY_TEMPLATE_NAME, шаблон не створено", async () => {
    const before = await count("templates");

    await expect(t.asUser(ADMIN_A, "select public.create_template('')")).rejects.toThrow(/EMPTY_TEMPLATE_NAME/);
    await expect(t.asUser(ADMIN_A, "select public.create_template('   ')")).rejects.toThrow(/EMPTY_TEMPLATE_NAME/);

    expect(await count("templates")).toBe(before);
  }, 60_000);

  it("AC-EDITOR-20: задача з очищеною назвою — EMPTY_NAME, версії 2 немає, незбережені зміни лишаються", async () => {
    const v1 = await versionOne();
    const taskId = v1.sections[0].tasks[0].id;
    await saveDraft(ADMIN_A, TENANT_MOVE_IN, renameTask(v1, taskId, "   "));

    await expect(publish(ADMIN_A, TENANT_MOVE_IN)).rejects.toThrow(/EMPTY_NAME/);

    expect(await versionCount(TENANT_MOVE_IN)).toBe(1);
    const kept = (await draft(TENANT_MOVE_IN)) as TemplateContent;
    expect(kept.sections[0].tasks[0].name).toBe(""); // зміна збережена, позначка «Unpublished changes» лишається
  }, 60_000);

  it("AC-EDITOR-21: перейменування на «Tenant move-in (2026)» — версія 2 з новою назвою, менеджер бачить її в списку", async () => {
    await saveDraft(ADMIN_A, TENANT_MOVE_IN, renameTemplate(await versionOne(), "Tenant move-in (2026)"));
    // До збереження менеджер бачить попередню назву.
    const [beforeSave] = await t.asUser<{ name: string }>(MANAGER_B, "select name from public.templates where id = $1", [
      TENANT_MOVE_IN,
    ]);
    expect(beforeSave.name).toBe("Tenant move-in");

    expect(await publish(ADMIN_A, TENANT_MOVE_IN)).toBe(2);

    const [v2] = await t.asService<{ content: TemplateContent }>(
      "select content from public.template_versions where template_id = $1 and number = 2",
      [TENANT_MOVE_IN],
    );
    expect(v2.content.name).toBe("Tenant move-in (2026)");
    const list = await t.asUser<{ name: string }>(MANAGER_B, "select name from public.templates order by name");
    expect(list.map((r) => r.name)).toContain("Tenant move-in (2026)");
  }, 60_000);

  it("AC-EDITOR-22: запуск з версії 1 — «Tenant move-in», з версії 2 — «Tenant move-in (2026)»", async () => {
    const launch = async (caseName: string) => {
      const [{ run_id }] = await t.asUser<{ run_id: string }>(
        MANAGER_B,
        "select public.launch_run($1, $2, '{}'::jsonb) as run_id",
        [TENANT_MOVE_IN, caseName],
      );
      return run_id;
    };
    const fromV1 = await launch("Apartment 12, move-in");
    await saveDraft(ADMIN_A, TENANT_MOVE_IN, renameTemplate(await versionOne(), "Tenant move-in (2026)"));
    await publish(ADMIN_A, TENANT_MOVE_IN);
    const fromV2 = await launch("Apartment 14, move-in");

    const runs = await t.asUser<{ id: string; template_name: string; template_version: number }>(
      MANAGER_B,
      "select id, template_name, template_version from public.runs where id = any($1)",
      [[fromV1, fromV2]],
    );
    const byId = Object.fromEntries(runs.map((r) => [r.id, [r.template_name, r.template_version]]));
    expect(byId[fromV1]).toEqual(["Tenant move-in", 1]);
    expect(byId[fromV2]).toEqual(["Tenant move-in (2026)", 2]);
  }, 60_000);

  it("AC-EDITOR-23: новий шаблон « tenant MOVE-IN » — NAME_TAKEN, шаблон не створено", async () => {
    const before = await count("templates");

    await expect(t.asUser(ADMIN_A, "select public.create_template(' tenant MOVE-IN ')")).rejects.toThrow(/NAME_TAKEN/);

    expect(await count("templates")).toBe(before);
  }, 60_000);

  it("AC-EDITOR-24: «Repair» перейменовано на «Tenant move-in» — NAME_TAKEN, нової версії немає, незбережені зміни лишаються", async () => {
    const repair = SEEDED_REPAIR;
    const saved = (await template(repair)).current_content as TemplateContent;
    await saveDraft(ADMIN_A, repair, renameTemplate(saved, "Tenant move-in"));

    await expect(publish(ADMIN_A, repair)).rejects.toThrow(/NAME_TAKEN/);

    expect(await versionCount(repair)).toBe(1);
    expect((await template(repair)).name).toBe("Repair");
    expect(((await draft(repair)) as TemplateContent).name).toBe("Tenant move-in");
  }, 60_000);

  it("AC-EDITOR-26: відвідувач без входу напряму — відмова, шаблон на версії 1 з 5 задачами без незбережених змін", async () => {
    const sixTasks = withTask(await versionOne(), MOVE_IN_DAY, "Sign handover act");

    await expect(t.asAnon("select public.save_template_draft($1, $2)", [TENANT_MOVE_IN, sixTasks])).rejects.toThrow(
      /permission denied/,
    );
    await expect(t.asAnon("select public.publish_template_version($1)", [TENANT_MOVE_IN])).rejects.toThrow(
      /permission denied/,
    );
    await expect(t.asAnon("select public.create_template('Repair')")).rejects.toThrow(/permission denied/);
    await expect(
      t.asAnon("update public.templates set current_content = $2 where id = $1", [TENANT_MOVE_IN, sixTasks]),
    ).rejects.toThrow(/permission denied/);
    // Нічого про шаблон не розкрито.
    await expect(t.asAnon("select name from public.templates")).rejects.toThrow(/permission denied/);

    const after = await template(TENANT_MOVE_IN);
    expect(after.current_version).toBe(1);
    expect(countTasks(after.current_content as TemplateContent)).toBe(5);
    expect(await draft(TENANT_MOVE_IN)).toBeNull();
  }, 60_000);

  it("AC-EDITOR-28: задачу з «Move-in day» перенесено в «Before move-in» — нова версія: 3 і 2 задачі", async () => {
    await usePmTaskLayout();
    const v1 = await versionOne();
    const before = v1.sections.find((s) => s.id !== MOVE_IN_DAY)!;
    const moveInDay = v1.sections.find((s) => s.id === MOVE_IN_DAY)!;
    expect([before.name, before.tasks.length, moveInDay.name, moveInDay.tasks.length]).toEqual([
      "Before move-in",
      2,
      "Move-in day",
      3,
    ]);

    // Перша задача «Move-in day» на крок угору переходить у кінець попередньої секції.
    await saveDraft(ADMIN_A, TENANT_MOVE_IN, moveTask(v1, moveInDay.tasks[0].id, -1));
    expect(await publish(ADMIN_A, TENANT_MOVE_IN)).toBe(2);

    const v2 = (await template(TENANT_MOVE_IN)).current_content as TemplateContent;
    expect(v2.sections.map((s) => [s.name, s.tasks.length])).toEqual([
      ["Before move-in", 3],
      ["Move-in day", 2],
    ]);
  }, 60_000);

  it("AC-EDITOR-29: менеджер напряму просить версію 1, список версій і незбережені зміни — лише поточна версія 2, шаблон без змін", async () => {
    await saveDraft(ADMIN_A, TENANT_MOVE_IN, withTask(await versionOne(), MOVE_IN_DAY, "Sign handover act"));
    expect(await publish(ADMIN_A, TENANT_MOVE_IN)).toBe(2);
    const v2 = (await template(TENANT_MOVE_IN)).current_content as TemplateContent;
    await saveDraft(ADMIN_A, TENANT_MOVE_IN, withTask(v2, MOVE_IN_DAY, "Hand over keys")); // 7 задач

    expect(
      await t.asUser(MANAGER_B, "select content from public.template_versions where template_id = $1 and number = 1", [
        TENANT_MOVE_IN,
      ]),
    ).toHaveLength(0);
    expect(await t.asUser(MANAGER_B, "select number from public.template_versions")).toHaveLength(0);
    expect(await t.asUser(MANAGER_B, "select content from public.template_drafts")).toHaveLength(0);
    const [seen] = await t.asUser<{ current_version: number; current_content: TemplateContent }>(
      MANAGER_B,
      "select current_version, current_content from public.templates where id = $1",
      [TENANT_MOVE_IN],
    );
    expect(seen.current_version).toBe(2);
    expect(countTasks(seen.current_content)).toBe(6);

    expect(await versionCount(TENANT_MOVE_IN)).toBe(2);
    expect((await template(TENANT_MOVE_IN)).current_version).toBe(2);
    expect(countTasks((await draft(TENANT_MOVE_IN)) as TemplateContent)).toBe(7);
  }, 60_000);
});

describe("template-editor: запуски до появи версій", () => {
  const LEGACY_MANAGER = "a0000000-0000-0000-0000-0000000000a7";
  const LEGACY_RUN = "c2700000-0000-4000-8000-000000000027";

  it("AC-EDITOR-27: запуск «Apartment 12, move-in», створений до появи версій, — «Template version 1» і ті самі задачі", async () => {
    // Дані зрізу 1: менеджер і запуск з копією задач шаблону — до міграції templates_versions.
    t = await createTestDb({
      before: {
        migration: "templates_versions",
        sql: `
          insert into auth.users (id, email, raw_user_meta_data)
          values ('${LEGACY_MANAGER}', 'legacy.manager@example.test', '{}');
          update public.profiles set role = 'manager' where id = '${LEGACY_MANAGER}';
          insert into public.runs (id, template_id, template_name, case_name, status, manager_id)
          values ('${LEGACY_RUN}', '${TENANT_MOVE_IN}', 'Tenant move-in', 'Apartment 12, move-in', 'in_progress',
                  '${LEGACY_MANAGER}');
          insert into public.run_tasks (run_id, section_name, name, required, position, assignee_id)
          select '${LEGACY_RUN}', s.name, tt.name, tt.required, s.position * 1000 + tt.position, '${LEGACY_MANAGER}'
          from public.template_sections as s
          join public.template_tasks as tt on tt.section_id = s.id
          where s.template_id = '${TENANT_MOVE_IN}';
        `,
      },
    });

    const [run] = await t.asUser<{ case_name: string; template_version: number }>(
      LEGACY_MANAGER,
      "select case_name, template_version from public.runs where id = $1",
      [LEGACY_RUN],
    );
    expect(run).toEqual({ case_name: "Apartment 12, move-in", template_version: 1 });
    const tasks = await t.asUser<{ name: string }>(
      LEGACY_MANAGER,
      "select name from public.run_tasks where run_id = $1 order by position",
      [LEGACY_RUN],
    );
    const v1 = (await template(TENANT_MOVE_IN)).current_content as TemplateContent;
    expect(tasks.map((r) => r.name)).toEqual(v1.sections.flatMap((s) => s.tasks.map((task) => task.name)));
  }, 60_000);
});
