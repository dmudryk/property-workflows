// AC-VENDOR-16 — вендор позначає свою необов'язкову задачу 3 у запуску «completed»: «done», «Your tasks: 1 of 1 done»,
// запуск лишається «completed». Пише в базу (@writes): v16 — синтетичний вендор, виконавець лише задачі 3 у своєму
// «Apartment 12, move-in»; обов'язкові 1, 2 і 4 виконав менеджер A у setup (vendor-world.setup.ts), тож запуск —
// «completed». Статус запуску вендор бачить у списку запусків (на сторінці запуску його немає, AC-VENDOR-11).
import { expect, test } from "@playwright/test";
import { attachRuntimeErrors, given, thenStep, when } from "./support/uat";
import { CASE_APT12, authFile, readWorld, runStatus, runTaskRows, taskRow } from "./support/vendor-world";

test.use({ storageState: authFile("v16") });

test.afterEach(async ({ page }) => attachRuntimeErrors(page));

test(
  "AC-VENDOR-16: вендор V позначає необов'язкову задачу 3 запуску «completed» — «done», «Your tasks: 1 of 1 done», запуск лишається «completed»",
  { tag: ["@uat", "@writes"], annotation: { type: "ac", description: "AC-VENDOR-16" } },
  async ({ page }) => {
    const world = readWorld();
    const V = world.users.v16;
    const run = world.runs.apt12v16;
    const task3 = world.template.tasks[2];
    const row = page.getByTestId("run-task").filter({ hasText: task3.name });

    await given(
      `the run "Apartment 12, move-in" with status "completed" in which vendor V (${V.email}) is the assignee of the optional task 3 with status "to do"`,
      async () => {
        expect(task3.required).toBe(false);
        expect(await runStatus(run.id)).toBe("completed");
        const rows = await runTaskRows(run.id);
        expect(rows.filter((t) => t.assignee_id === V.id)).toEqual([expect.objectContaining({ id: run.taskIds[2], status: "to_do" })]);
        await page.goto(`/runs/${run.id}`);
        await expect(page.getByTestId("user-email")).toHaveText(V.email);
        await expect(row.getByTestId("task-status")).toHaveText("to do");
        await expect(page.getByTestId("run-progress")).toHaveText("Your tasks: 0 of 1 done");
      },
    );

    await when("V marks task 3 as done", async () => {
      const saved = page.waitForResponse(
        (r) => r.request().method() === "POST" && new URL(r.url()).pathname === `/runs/${run.id}`,
      );
      await row.getByRole("button", { name: "Mark as done" }).click();
      await saved;
      await page.reload();
    });

    await thenStep(
      page,
      {
        clause: 'task 3 has status "done", V sees "Your tasks: 1 of 1 done"',
        visible: [`task 3 «${task3.name}» with the status «done»`, "«Your tasks: 1 of 1 done»"],
        hidden: [
          "after reloading the page (the saved state, not only the optimistic one)",
          "in the database task 3 is done and marked by V",
          "no confirmation «This cannot be undone» was asked: task 3 is optional",
        ],
      },
      async () => {
        await expect(row.getByTestId("task-status")).toHaveText("done");
        await expect(page.getByTestId("run-progress")).toHaveText("Your tasks: 1 of 1 done");
        await expect(page.getByTestId("confirm-done")).toHaveCount(0);
        expect(await taskRow(run.taskIds[2])).toMatchObject({ status: "done", done_by: V.id });
      },
    );

    await thenStep(
      page,
      {
        clause: 'the run stays "completed"',
        visible: [`the row «${CASE_APT12}» in V's list of runs with the run status «completed»`, "«Your tasks: 1 of 1 done»"],
        hidden: ["in the database the run is still completed"],
      },
      async () => {
        await page.goto("/runs");
        const runRow = page.getByTestId("run-row").filter({ has: page.locator(`a[href="/runs/${run.id}"]`) });
        await expect(runRow.getByTestId("run-status")).toHaveText("completed");
        await expect(runRow.getByTestId("run-progress")).toHaveText("Your tasks: 1 of 1 done");
        expect(await runStatus(run.id)).toBe("completed");
      },
    );
  },
);
