// AC-VENDOR-12 — рядок списку запусків очима вендора: назва випадку, статус запуску й «Your tasks: 0 of 2 done», без
// назви шаблону. Сторінка лише читає; «Дано» — синтетичний світ (@writes: vendor-world.setup.ts / cleanup.teardown.ts):
// V — uat-…-v, виконавець 2 задач у «Apartment 12, move-in», запущеному з «Tenant move-in».
import { expect, test } from "@playwright/test";
import { attachRuntimeErrors, given, thenStep, when } from "./support/uat";
import { CASE_APT12, TEMPLATE_NAME, authFile, readWorld, runTaskRows } from "./support/vendor-world";

test.use({ storageState: authFile("v") });

test.afterEach(async ({ page }) => attachRuntimeErrors(page));

test(
  "AC-VENDOR-12: вендор V відкриває список запусків — рядок «Apartment 12, move-in» з випадком, статусом і «Your tasks: 0 of 2 done», без назви шаблону «Tenant move-in»",
  { tag: ["@uat", "@writes"], annotation: { type: "ac", description: "AC-VENDOR-12" } },
  async ({ page }) => {
    const world = readWorld();
    const V = world.users.v;

    await given(
      `vendor V (${V.email}) who is the assignee of 2 tasks in the run "Apartment 12, move-in", launched from the template "Tenant move-in"`,
      async () => {
        const rows = await runTaskRows(world.runs.apt12.id);
        expect(rows.filter((t) => t.assignee_id === V.id && t.status === "to_do")).toHaveLength(2);
        expect(world.template.tasks).toHaveLength(5); // шаблон світу — «Tenant move-in» (vendor-world.setup.ts)
      },
    );

    await when("V opens the list of runs", async () => {
      await page.goto("/runs");
      await expect(page.getByTestId("user-email")).toHaveText(V.email);
    });

    await thenStep(
      page,
      {
        clause:
          'the row of this run shows the case name, the run status and "Your tasks: 0 of 2 done", and does not show the template name "Tenant move-in"',
        visible: [`the row with the case name «${CASE_APT12}»`, "the run status «in progress»", "«Your tasks: 0 of 2 done»"],
        hidden: [`the template name «${TEMPLATE_NAME}» is nowhere on the page`],
      },
      async () => {
        const row = page.getByTestId("run-row");
        await expect(row).toHaveCount(1);
        await expect(row.getByRole("link", { name: CASE_APT12, exact: true })).toBeVisible();
        await expect(row.getByTestId("run-status")).toHaveText("in progress");
        await expect(row.getByTestId("run-progress")).toHaveText("Your tasks: 0 of 2 done");
        await expect(page.getByText(TEMPLATE_NAME)).toHaveCount(0);
      },
    );
  },
);
