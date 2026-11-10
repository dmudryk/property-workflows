// AC-VENDOR-15 — відмова напряму, оминаючи сторінки: вендор V надсилає «позначити задачу 1 виконаною» прямо в Data API
// для «Apartment 14, repair», де не має жодної задачі. Правило живе в базі (private.mark_task_done) — його доводить
// tests/db/vendor.test.ts (SQL-мутант V12); тут — виняток WS8: запит напряму і крок, що показує на екрані «що не
// змінилося» — сторінку запуску очима менеджера A (вендор цього запуску не бачить). «Дано» — синтетичний світ (@writes).
import { expect, test } from "@playwright/test";
import { attachRuntimeErrors, given, thenStep, when } from "./support/uat";
import { CASE_APT14, authFile, directRpc, readWorld, runTaskRows, taskRow } from "./support/vendor-world";

test.use({ storageState: authFile("a"), viewport: { width: 1280, height: 1000 } });

test.afterEach(async ({ page }) => attachRuntimeErrors(page));

test(
  "AC-VENDOR-15: вендор V напряму позначає задачу 1 «Apartment 14, repair», де не має задач, — задача 1 лишається «to do», відповідь «Run not found»",
  { tag: ["@uat", "@writes"], annotation: { type: "ac", description: "AC-VENDOR-15" } },
  async ({ page }) => {
    const world = readWorld();
    const A = world.users.a;
    const V = world.users.v;
    const run = world.runs.apt14;
    const task1 = world.template.tasks[0];
    const row1 = page.getByTestId("run-task").nth(0);
    let response: Awaited<ReturnType<typeof directRpc>> | null = null;

    await given(
      `the run "Apartment 14, repair" in which vendor V (${V.email}) has no task and task 1 is assigned to manager A (${A.email})`,
      async () => {
        const rows = await runTaskRows(run.id);
        expect(rows.filter((t) => t.assignee_id === V.id)).toHaveLength(0);
        await page.goto(`/runs/${run.id}`);
        await expect(page.getByRole("heading", { level: 1, name: CASE_APT14, exact: true })).toBeVisible();
        await expect(row1.getByText(task1.name, { exact: true })).toBeVisible();
        await expect(row1.getByTestId("task-assignee")).toHaveText(A.email);
        await expect(row1.getByTestId("task-status")).toHaveText("to do");
      },
    );

    await when("V tries to mark task 1 as done directly, bypassing the pages of the application", async () => {
      response = await directRpc(world.vendorAccessToken, "mark_task_done", { p_task_id: run.taskIds[0] });
    });

    await thenStep(
      page,
      {
        clause: 'task 1 stays "to do", and V gets the message "Run not found"',
        visible: [`task 1 «${task1.name}» with the status «to do» on the page of the run «${CASE_APT14}» (run manager A)`],
        hidden: [
          "V's direct request was refused with the message «Run not found» (HTTP 404, code PT404)",
          "in the database task 1 is still to_do and nobody marked it (done_by is empty)",
          "the page was reloaded after the request",
        ],
      },
      async () => {
        await page.reload();
        await expect(row1.getByText(task1.name, { exact: true })).toBeVisible();
        await expect(row1.getByTestId("task-status")).toHaveText("to do");
        await expect(row1).toBeInViewport();
        expect(response).toMatchObject({ status: 404, code: "PT404", message: "Run not found" });
        expect(await taskRow(run.taskIds[0])).toMatchObject({ status: "to_do", done_by: null });
      },
    );
  },
);
