// AC-VENDOR-17 — читання напряму, оминаючи сторінки: вендор V запитує задачі «Apartment 12, move-in» прямо в Data API
// своїм токеном — отримує лише задачі 3 і 4. Джерело задач для вендора — функція бази vendor_tasks з білим списком
// колонок; таблицю run_tasks вендору закрито цілком (ADR 0005). Правила доводить tests/db/vendor.test.ts (SQL-мутанти V4,
// V16); тут — виняток WS8: запити напряму і крок на екрані — сторінка цього запуску очима V з тими самими двома
// задачами. Лише читання; «Дано» — синтетичний світ (@writes: vendor-world.setup.ts).
import { expect, test } from "@playwright/test";
import { attachRuntimeErrors, given, thenStep, when } from "./support/uat";
import { CASE_APT12, authFile, directSelect, readWorld, runTaskRows } from "./support/vendor-world";

test.use({ storageState: authFile("v") });

test.afterEach(async ({ page }) => attachRuntimeErrors(page));

test(
  "AC-VENDOR-17: вендор V напряму запитує задачі «Apartment 12, move-in» — отримує лише задачі 3 і 4",
  { tag: ["@uat", "@writes"], annotation: { type: "ac", description: "AC-VENDOR-17" } },
  async ({ page }) => {
    const world = readWorld();
    const V = world.users.v;
    const run = world.runs.apt12;
    const [, , task3, task4] = world.template.tasks;
    let response: Awaited<ReturnType<typeof directSelect>> | null = null;
    let table: Awaited<ReturnType<typeof directSelect>> | null = null;

    await given(`vendor V (${V.email}) who is the assignee of tasks 3 and 4 in the run "Apartment 12, move-in" (5 tasks)`, async () => {
      const rows = await runTaskRows(run.id);
      expect(rows).toHaveLength(5);
      expect(rows.map((t) => t.assignee_id === V.id)).toEqual([false, false, true, true, false]);
    });

    await when("V requests the tasks of this run directly, bypassing the pages of the application", async () => {
      response = await directSelect(world.vendorAccessToken, "rpc/vendor_tasks", `p_run_id=${run.id}`);
      table = await directSelect(world.vendorAccessToken, "run_tasks", `select=*&run_id=eq.${run.id}`);
    });

    await thenStep(
      page,
      {
        clause: "V receives only tasks 3 and 4",
        visible: [`the page of the run «${CASE_APT12}» signed in as V: exactly tasks 3 «${task3.name}» and 4 «${task4.name}»`],
        hidden: [
          "V's direct request for the tasks of this run (Data API, own token, rpc vendor_tasks) returned exactly 2 rows: tasks 3 and 4, each only with id, run_id, section_name, name, required, position, status",
          "the same token on the table itself (run_tasks?select=*) returned 0 rows",
          "the run has 5 tasks in the database",
        ],
      },
      async () => {
        expect(response?.status).toBe(200);
        expect(response?.rows?.map((t) => t.id)).toEqual([run.taskIds[2], run.taskIds[3]]);
        expect(Object.keys(response?.rows?.[0] ?? {}).sort()).toEqual(["id", "name", "position", "required", "run_id", "section_name", "status"]);
        expect(table).toMatchObject({ status: 200, rows: [] });
        await page.goto(`/runs/${run.id}`);
        await expect(page.getByTestId("user-email")).toHaveText(V.email);
        const tasks = page.getByTestId("run-task");
        await expect(tasks).toHaveCount(2);
        await expect(tasks.nth(0)).toContainText(task3.name);
        await expect(tasks.nth(1)).toContainText(task4.name);
      },
    );
  },
);
