import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProfilePage from "@/app/profile/page";
import EditTemplatePage from "@/app/templates/[id]/edit/page";
import TemplatePage from "@/app/templates/[id]/page";
import TemplateVersionsPage from "@/app/templates/[id]/versions/page";
import TemplatesPage from "@/app/templates/page";
import RunPage from "./[id]/page";
import NewRunPage from "./new/page";
import RunsPage from "./page";

// Сторінки очима вендора: справжній requireActor() і справжні сторінки, замокано лише клієнт Supabase. Таблиці
// містять рівно ті рядки, які вендор отримав би від бази: RLS віддає йому лише запуски й задачі, де він виконавець
// (це доводить tests/db/vendor.test.ts); тут — що сторінка показує з цими рядками.
const db = vi.hoisted(() => ({
  tables: {} as Record<string, unknown[]>,
  rpc: {} as Record<string, unknown>,
}));

vi.mock("@/lib/supabase/server", () => {
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
  const vendorProfile = [{ role: "vendor", email: "vendor@example.test", full_name: null }];
  return {
    createClient: async () => ({
      auth: { getClaims: async () => ({ data: { claims: { sub: "vendor-v" } }, error: null }) },
      from: (table: string) => query(table === "profiles" ? vendorProfile : (db.tables[table] ?? [])),
      rpc: async (name: string) => ({ data: db.rpc[name] ?? null, error: null }),
    }),
  };
});

const RUN_ID = "acde19d4-83ed-432b-a9e0-c75e12ab2d1e";
const OWN_TASKS = [
  { id: "t3", section_name: "Before move-in", name: "Order cleaning", required: false, position: 1003, assignee_id: "vendor-v", status: "to_do" },
  { id: "t4", section_name: "Move-in day", name: "Hand over the keys", required: true, position: 2001, assignee_id: "vendor-v", status: "to_do" },
];

const params = (id: string) => Promise.resolve({ id });
const noSearch = Promise.resolve({});

beforeEach(() => {
  db.tables = {};
  db.rpc = {};
});

describe("vendor-access", () => {
  it("AC-VENDOR-03: список запусків вендора — «Apartment 12, move-in» зі статусом і «Your tasks: 0 of 2 done», без запуску шаблону", async () => {
    db.tables.runs = [
      {
        id: RUN_ID,
        case_name: "Apartment 12, move-in",
        template_name: "Tenant move-in",
        status: "in_progress",
        created_at: "2026-11-02T10:00:00Z",
        run_tasks: OWN_TASKS.map((t) => ({ status: t.status })),
      },
    ];

    const html = renderToStaticMarkup(await RunsPage());

    expect(html).toContain("Apartment 12, move-in");
    expect(html).toContain("in progress");
    expect(html).toContain("Your tasks: 0 of 2 done");
    expect(html).not.toContain("Launch a template");
    expect(html).not.toContain("Apartment 14, repair");
  });

  it("AC-VENDOR-10: вендор без задач — «No tasks assigned to you yet.», без таблиці й без посилання на запуск", async () => {
    const html = renderToStaticMarkup(await RunsPage());

    expect(html).toContain("No tasks assigned to you yet.");
    expect(html).toContain('data-testid="empty-state"');
    expect(html).not.toContain("<table");
    expect(html).not.toContain("Launch a template");
  });

  it("AC-VENDOR-04: вендор у запуску бачить лише задачі 3 і 4 — назва, секція, позначка, статус; без email, прогресу запуску й менеджера", async () => {
    db.tables.runs = [
      { id: RUN_ID, case_name: "Apartment 12, move-in", template_name: "Tenant move-in", template_version: 1, status: "in_progress", manager_id: "manager-a" },
    ];
    db.tables.run_tasks = OWN_TASKS;
    db.rpc.completes_run = false;

    const html = renderToStaticMarkup(await RunPage({ params: params(RUN_ID), searchParams: noSearch }));

    expect(html.match(/data-testid="run-task"/g)).toHaveLength(2);
    for (const text of ["Order cleaning", "Hand over the keys", "Before move-in", "Move-in day", "optional", "required", "to do"]) {
      expect(html, text).toContain(text);
    }
    expect(html).toContain("Your tasks: 0 of 2 done");
    expect(html).not.toMatch(/\d+ of 5 done/);
    expect(html).not.toContain("@example.test");
    expect(html).not.toContain("Run manager");
    expect(html).not.toContain("Template version");
    expect(html).not.toContain('data-testid="task-assignee"');
  });

  it("AC-VENDOR-08: вендор відкриває список шаблонів — «Not enough rights» і «Back to runs», жодного шаблону", async () => {
    db.tables.templates = [{ id: "a1", name: "Tenant move-in", current_version: 1 }];

    const html = renderToStaticMarkup(await TemplatesPage());

    expect(html).toContain("Not enough rights");
    expect(html).toContain('href="/runs"');
    expect(html).toContain("Back to runs");
    expect(html).not.toContain("Back to templates");
    expect(html).not.toContain("Tenant move-in");
    expect(html).not.toContain("<table");
  });

  it("AC-VENDOR-05: остання обов'язкова задача вендора — на сторінці підтвердження «This cannot be undone» з назвою задачі", async () => {
    db.tables.runs = [
      { id: RUN_ID, case_name: "Apartment 12, move-in", template_name: "Tenant move-in", template_version: 1, status: "in_progress", manager_id: "manager-a" },
    ];
    db.tables.run_tasks = OWN_TASKS;
    db.rpc.completes_run = true; // база: задача 4 — остання обов'язкова «to do» у запуску (вендор інших задач не бачить)

    const html = renderToStaticMarkup(await RunPage({ params: params(RUN_ID), searchParams: Promise.resolve({ confirm: "t4" }) }));

    expect(html).toContain('data-testid="confirm-done"');
    expect(html).toContain("Mark &quot;Hand over the keys&quot; as done?");
    expect(html).toContain("This cannot be undone");
  });

  it("AC-VENDOR-11: сторінка запуску вендора — заголовок «Apartment 12, move-in» і «Your tasks: 1 of 2 done», без статусу запуску, назви й версії шаблону", async () => {
    db.tables.runs = [
      { id: RUN_ID, case_name: "Apartment 12, move-in", template_name: "Tenant move-in", template_version: 1, status: "in_progress", manager_id: "manager-a" },
    ];
    db.tables.run_tasks = [{ ...OWN_TASKS[0], status: "done" }, OWN_TASKS[1]];
    db.rpc.completes_run = false;

    const html = renderToStaticMarkup(await RunPage({ params: params(RUN_ID), searchParams: noSearch }));

    expect(html).toMatch(/<h1[^>]*>Apartment 12, move-in<\/h1>/);
    expect(html).toContain("Your tasks: 1 of 2 done");
    expect(html).not.toContain('data-testid="run-status"');
    expect(html).not.toContain("in progress");
    expect(html).not.toContain("Tenant move-in");
    expect(html).not.toContain("Template version");
    expect(html).not.toContain('data-testid="template-version"');
  });

  it("AC-VENDOR-12: рядок «Apartment 12, move-in» у списку вендора — випадок, статус і «Your tasks: 0 of 2 done», без назви шаблону «Tenant move-in»", async () => {
    db.tables.runs = [
      {
        id: RUN_ID,
        case_name: "Apartment 12, move-in",
        template_name: "Tenant move-in",
        status: "in_progress",
        created_at: "2026-11-02T10:00:00Z",
        run_tasks: OWN_TASKS.map((t) => ({ status: t.status })),
      },
    ];

    const html = renderToStaticMarkup(await RunsPage());
    const row = html.match(/<tr[^>]*data-testid="run-row"[\s\S]*?<\/tr>/)?.[0] ?? "";

    expect(row).toContain("Apartment 12, move-in");
    expect(row).toContain("in progress");
    expect(row).toContain("Your tasks: 0 of 2 done");
    expect(html).not.toContain("Tenant move-in");
  });

  it("AC-VENDOR-14: форма запуску, сторінка шаблону, список версій і редактор для вендора — «Not enough rights» і «Back to runs», без вмісту шаблону", async () => {
    db.tables.templates = [
      { id: "a1", name: "Tenant move-in", current_version: 1, current_content: { sections: [{ id: "s1", name: "Before move-in", tasks: [] }] } },
    ];
    db.tables.template_versions = [{ number: 1, created_at: "2026-10-05T07:30:00Z", author: { email: "admin@example.test" } }];
    const tpl = { params: Promise.resolve({ id: "a1" }), searchParams: noSearch };
    const pages = {
      "launch form": await NewRunPage({ params: Promise.resolve({}), searchParams: noSearch }),
      "template page": await TemplatePage(tpl),
      "versions": await TemplateVersionsPage(tpl),
      "editor": await EditTemplatePage(tpl),
    };

    for (const [page, element] of Object.entries(pages)) {
      const html = renderToStaticMarkup(element);
      expect(html, page).toContain("Not enough rights");
      expect(html, page).toContain("Back to runs");
      expect(html, page).not.toContain("Back to templates");
      expect(html, page).not.toContain("Tenant move-in");
      expect(html, page).not.toContain("Before move-in");
      expect(html, page).not.toContain("admin@example.test");
    }
  });

  it("AC-VENDOR-16: запуск «completed», необов'язкова задача 3 вендора виконана — «Your tasks: 1 of 1 done», без статусу запуску", async () => {
    db.tables.runs = [
      { id: RUN_ID, case_name: "Apartment 12, move-in", template_name: "Tenant move-in", template_version: 1, status: "completed", manager_id: "manager-a" },
    ];
    db.tables.run_tasks = [{ ...OWN_TASKS[0], status: "done" }];

    const html = renderToStaticMarkup(await RunPage({ params: params(RUN_ID), searchParams: noSearch }));

    expect(html).toContain("Your tasks: 1 of 1 done");
    expect(html).toContain("done");
    expect(html).not.toContain("Mark as done");
  });

  it("AC-VENDOR-13: «Profile» вендора — лише власні email і роль", async () => {
    const html = renderToStaticMarkup(await ProfilePage());

    expect(html).toContain("Profile");
    expect(html).toContain("vendor@example.test");
    expect(html).toContain("vendor");
  });

  it("AC-VENDOR-09: форма запуску для вендора — «Not enough rights» і «Back to runs», без шаблонів (матриця прав: вендор не запускає)", async () => {
    db.tables.templates = [{ id: "a1", name: "Tenant move-in", current_version: 1, current_content: null }];

    const html = renderToStaticMarkup(await NewRunPage({ params: Promise.resolve({}), searchParams: noSearch }));

    expect(html).toContain("Not enough rights");
    expect(html).toContain("Back to runs");
    expect(html).not.toContain("Tenant move-in");
  });
});
