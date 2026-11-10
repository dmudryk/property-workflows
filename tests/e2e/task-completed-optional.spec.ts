// AC-TASK-19 — виконавець позначає необов'язкову задачу запуску «completed»: «done», запуск лишається «completed»,
// прогрес рахує задачу. Пише в базу (@writes): B — синтетичний менеджер uat-…-b, виконавець необов'язкової задачі 5 у
// запуску менеджера A; обов'язкові 1, 2 і 4 A виконав у setup (vendor-world.setup.ts). На проді в шаблонах немає
// задачі «Order a part» з AC, тож її роль грає необов'язкова задача 5 «Tenant move-in» (назва — у «Дано»); точну назву
// «Order a part» доводить тест бази tests/db/run-tasks.test.ts (SQL-мутант V14).
import { expect, test } from "@playwright/test";
import { attachRuntimeErrors, given, thenStep, when } from "./support/uat";
import { authFile, readWorld, runStatus, runTaskRows, taskRow } from "./support/vendor-world";

test.use({ storageState: authFile("b") });

test.afterEach(async ({ page }) => attachRuntimeErrors(page));

test(
  "AC-TASK-19: виконавець позначає необов'язкову задачу запуску «completed» — «done», запуск лишається «completed», прогрес рахує задачу",
  { tag: ["@uat", "@writes"], annotation: { type: "ac", description: "AC-TASK-19" } },
  async ({ page }) => {
    const world = readWorld();
    const B = world.users.b;
    const run = world.runs.task19;
    const task5 = world.template.tasks[4];
    const row = page.getByTestId("run-task").filter({ hasText: task5.name });

    await given(
      `a run with status "completed" that has the optional task "Order a part" with status "to do" — on prod the optional task 5 «${task5.name}» — and the assignee of this task, manager B (${B.email})`,
      async () => {
        expect(task5.required).toBe(false);
        expect(await runStatus(run.id)).toBe("completed");
        expect(await taskRow(run.taskIds[4])).toMatchObject({ status: "to_do", assignee_id: B.id });
        await page.goto(`/runs/${run.id}`);
        await expect(page.getByTestId("user-email")).toHaveText(B.email);
        await expect(page.getByTestId("run-status")).toHaveText("completed");
        await expect(row.getByTestId("task-status")).toHaveText("to do");
        await expect(page.getByTestId("run-progress")).toHaveText("3 of 5 done");
      },
    );

    await when(`the assignee marks "Order a part" (task 5 «${task5.name}») as done`, async () => {
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
        clause: 'the task has status "done", the run stays "completed", and the progress counts the task as done',
        visible: [`task 5 «${task5.name}» with the status «done»`, "the run status «completed»", "the progress «4 of 5 done»"],
        hidden: [
          "after reloading the page (the saved state, not only the optimistic one)",
          "in the database the task is done and marked by B, the run is still completed",
          "no confirmation «This cannot be undone» was asked: the task is optional",
        ],
      },
      async () => {
        await expect(row.getByTestId("task-status")).toHaveText("done");
        await expect(page.getByTestId("run-status")).toHaveText("completed");
        await expect(page.getByTestId("run-progress")).toHaveText("4 of 5 done");
        await expect(page.getByTestId("confirm-done")).toHaveCount(0);
        expect(await taskRow(run.taskIds[4])).toMatchObject({ status: "done", done_by: B.id });
        expect(await runStatus(run.id)).toBe("completed");
        expect((await runTaskRows(run.id)).filter((t) => t.status === "done")).toHaveLength(4);
      },
    );
  },
);
