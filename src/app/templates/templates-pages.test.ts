import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MSG_NO_TEMPLATES_ADMIN, MSG_NO_TEMPLATES_MANAGER, MSG_NO_VERSIONS } from "@/lib/templates/empty-states";
import TemplatePage from "./[id]/page";
import TemplateVersionsPage from "./[id]/versions/page";
import TemplatesPage from "./page";

// Сторінки шаблонів читають дані через requireActor(). У тесті таблиці містять рівно ті рядки, які роль отримала б
// від бази (RLS перевіряють тести бази tests/db/*); тут — що сторінка показує з цими рядками.
const db = vi.hoisted(() => ({
  actor: { id: "manager-b", role: "manager" } as { id: string; role: "manager" | "admin" } | null,
  tables: {} as Record<string, unknown[]>,
}));

vi.mock("@/lib/auth/actor", async () => {
  const { canManageTemplates } = await import("@/lib/auth/roles");
  // Ланцюжок запиту supabase-js: фільтри не змінюють рядків; await — усі рядки, maybeSingle — перший.
  const query = (rows: unknown[]) => {
    const q = {
      select: () => q,
      eq: () => q,
      not: () => q,
      order: () => q,
      maybeSingle: async () => ({ data: rows[0] ?? null, error: null }),
      then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
        Promise.resolve({ data: rows, error: null }).then(resolve, reject),
    };
    return q;
  };
  return {
    canManageTemplates,
    requireActor: async () => ({
      supabase: { from: (table: string) => query(db.tables[table] ?? []) },
      actor: db.actor,
      email: "user@example.test",
    }),
  };
});

const MANAGER = { id: "manager-b", role: "manager" } as const;
const ADMIN = { id: "admin-a", role: "admin" } as const;
const TENANT_MOVE_IN = "a1000000-0000-4000-8000-000000000001";

// Версія 1 «Tenant move-in»: 2 секції, 5 задач, 3 обов'язкові.
const VERSION_1 = {
  sections: [
    {
      id: "s1",
      name: "Before move-in",
      tasks: [
        { id: "t1", name: "Sign the lease", required: true },
        { id: "t2", name: "Collect the deposit", required: true },
        { id: "t3", name: "Order cleaning", required: false },
      ],
    },
    {
      id: "s2",
      name: "Move-in day",
      tasks: [
        { id: "t4", name: "Hand over the keys", required: true },
        { id: "t5", name: "Read the meters", required: false },
      ],
    },
  ],
};

const page = (id: string, searchParams: Record<string, string> = {}) =>
  ({ params: Promise.resolve({ id }), searchParams: Promise.resolve(searchParams) }) as never;

beforeEach(() => {
  db.actor = MANAGER;
  db.tables = {};
});

describe("template-editor", () => {
  it("AC-EDITOR-02: менеджер відкриває шаблон зі списку — версія 1 з 5 задачами, кожна «required» чи «optional», без позначки незбережених змін", async () => {
    db.tables.templates = [{ id: TENANT_MOVE_IN, name: "Tenant move-in", current_version: 1, current_content: VERSION_1 }];
    // Незбережені зміни адміністратора менеджеру база не віддає (AC-EDITOR-02 у tests/db/templates.test.ts).

    const html = renderToStaticMarkup(await TemplatePage(page(TENANT_MOVE_IN)));

    expect(html).toContain("Version 1");
    expect(html.match(/data-testid="template-task"/g)).toHaveLength(5);
    const marks = [...html.matchAll(/data-testid="requirement"[^>]*>([^<]+)</g)].map((m) => m[1]);
    expect(marks).toEqual(["required", "required", "optional", "required", "optional"]);
    expect(html).not.toContain("Unpublished changes");
    expect(html).toMatch(/<a[^>]*href="\/runs\/new\?template=a1000000[^"]*"[^>]*>.*Launch<\/a>/);
  });

  it("AC-EDITOR-03: після збереження — «Version 2 saved» на сторінці шаблону з поточною версією 2", async () => {
    db.actor = ADMIN;
    db.tables.templates = [{ id: TENANT_MOVE_IN, name: "Tenant move-in", current_version: 2, current_content: VERSION_1 }];

    const html = renderToStaticMarkup(await TemplatePage(page(TENANT_MOVE_IN, { saved: "2" })));
    expect(html).toContain("Version 2 saved");
    expect(html).not.toContain("Unpublished changes");

    // Повідомлення лише про поточну версію: застарілий ?saved= нічого не показує.
    const stale = renderToStaticMarkup(await TemplatePage(page(TENANT_MOVE_IN, { saved: "1" })));
    expect(stale).not.toContain("saved</p>");
  });

  it("AC-EDITOR-16: менеджер відкриває незбережений «Repair» за прямим посиланням — «Template not found», без секцій і задач", async () => {
    db.tables.templates = []; // RLS не віддає менеджеру незбережений шаблон

    const html = renderToStaticMarkup(await TemplatePage(page("a1000000-0000-4000-8000-0000000000aa")));

    expect(html).toContain("Template not found");
    expect(html).not.toContain('data-testid="template-task"');
    expect(html).not.toContain("<h2");
  });

  it("AC-EDITOR-17: менеджер без збережених шаблонів — «No templates yet. An administrator creates them.», без таблиці", async () => {
    const html = renderToStaticMarkup(await TemplatesPage());

    expect(html).toContain(MSG_NO_TEMPLATES_MANAGER);
    expect(html).toContain('data-testid="empty-state"');
    expect(html).not.toContain("<table");
    expect(html).not.toContain("Create a template");

    // Адміністратор без шаблонів — свій текст і посилання «Create a template» (припущення PM).
    db.actor = ADMIN;
    const admin = renderToStaticMarkup(await TemplatesPage());
    expect(admin).toContain(MSG_NO_TEMPLATES_ADMIN);
    expect(admin).toMatch(/<a[^>]*href="\/templates\/new"[^>]*>Create a template<\/a>/);
    expect(admin).not.toContain("<table");
  });

  it("AC-EDITOR-18: незбережений «Repair» без версій — «No versions yet. Save the template to create version 1.», без таблиці", async () => {
    db.actor = ADMIN;
    db.tables.templates = [{ name: "Repair" }];
    db.tables.template_versions = [];

    const html = renderToStaticMarkup(await TemplateVersionsPage(page("a1000000-0000-4000-8000-0000000000aa")));

    expect(html).toContain(MSG_NO_VERSIONS);
    expect(html).toContain('data-testid="empty-state"');
    expect(html).not.toContain("<table");
  });
});
