// НЕГАТИВНІ КОНТРОЛІ — навмисно хибні очікування, щоб показати, що UAT уміє падати. Не AC-тести: назви починаються
// з NC-, а не з AC ID, тож ac:coverage їх не рахує. У звичайному прогоні їх немає (проєкт chromium має grepInvert
// @negative-control); запуск: npm run uat:nc. Лише читання (AC-DSYS-04, manager.c@example.test): безпечно на проді.
// Формат — за зразком демо-репо курсу (tests/e2e/negative-controls.spec.ts, тег ws8-03-uat).
// Що мають показати:
//   NC-1 — у тесті неправильний очікуваний текст → перевірка падає → FAIL (R1), хоч би що сказав агент;
//   NC-2 — текст «Тоді» в анотації ac-text змінено, а тест і застосунок ні → перевірки зелені, агент звіряє кадр із
//          цим текстом і не погоджується → NEEDS-HUMAN (R3).
import { expect, test } from "@playwright/test";
import { attachRuntimeErrors, given, thenStep, when } from "./support/uat";

test.use({ storageState: "playwright/.auth/manager_c.json" });

const MANAGER = "manager.c@example.test";
const CLAUSE = 'B sees the message "No runs yet. Launch a template to start one." and the link "Launch a template", and no empty table';
const MESSAGE = "No runs yet. Launch a template to start one.";
const WRONG_MESSAGE = "No runs yet. Create a template to start one.";

test.afterEach(async ({ page }) => attachRuntimeErrors(page));

test(
  "NC-1 (AC-DSYS-04, навмисно хибне очікування в тесті: інший текст повідомлення)",
  {
    tag: ["@negative-control"],
    annotation: [
      { type: "ac", description: "AC-DSYS-04" },
      { type: "case", description: "NC-1" },
    ],
  },
  async ({ page }) => {
    await given(`manager B (${MANAGER}) who has no runs`, async () => {
      await page.goto("/templates");
    });
    await when("B opens the list of runs", async () => {
      await page.goto("/runs");
    });
    await thenStep(
      page,
      { clause: CLAUSE, visible: ["the message «No runs yet. Launch a template to start one.»"] },
      async () => {
        await expect(page.getByTestId("empty-state").getByText(WRONG_MESSAGE, { exact: true })).toBeVisible({
          timeout: 5_000,
        });
      },
    );
  },
);

test(
  "NC-2 (AC-DSYS-04, текст «Тоді» в анотації змінено, тест і застосунок — ні)",
  {
    tag: ["@negative-control"],
    annotation: [
      { type: "ac", description: "AC-DSYS-04" },
      { type: "case", description: "NC-2" },
      {
        type: "ac-text",
        description:
          'AC-DSYS-04: Given manager B who has no runs. When B opens the list of runs. Then B sees the message "No runs yet. Create a template to start one." and the link "Create a template", and no empty table.',
      },
    ],
  },
  async ({ page }) => {
    await given(`manager B (${MANAGER}) who has no runs`, async () => {
      await page.goto("/templates");
    });
    await when("B opens the list of runs", async () => {
      await page.goto("/runs");
    });
    await thenStep(
      page,
      { clause: CLAUSE, visible: ["the message «No runs yet. Launch a template to start one.»"] },
      async () => {
        await expect(page.getByTestId("empty-state").getByText(MESSAGE, { exact: true })).toBeVisible();
      },
    );
  },
);
