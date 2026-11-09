// НЕГАТИВНІ КОНТРОЛІ — навмисно хибні очікування, щоб показати, що UAT уміє падати. Не AC-тести: назви починаються
// з NC-, а не з AC ID, тож ac:coverage їх не рахує. У звичайному прогоні їх немає (проєкт chromium має grepInvert
// @negative-control); запуск: npm run uat:nc. Лише читання (AC-VENDOR-08, vendor@example.test): безпечно на проді.
// Формат — за зразком демо-репо курсу (tests/e2e/negative-controls.spec.ts, тег ws8-03-uat).
// WS9: обидва контролі — на AC зрізу 3, що лише читає й не залежить від даних на проді (у WS8 вони стояли на
// AC-DSYS-04, «Дано» якого — «менеджер без запусків» — на проді вже не виконується: у manager.c з'явився запуск).
// Що мають показати:
//   NC-1 — у тесті неправильний очікуваний текст → перевірка падає → FAIL (R1), хоч би що сказав агент;
//   NC-2 — текст «Тоді» в анотації ac-text змінено, а тест і застосунок ні → перевірки зелені, агент звіряє кадр із
//          цим текстом і не погоджується → NEEDS-HUMAN (R3).
import { expect, test } from "@playwright/test";
import { attachRuntimeErrors, given, thenStep, when } from "./support/uat";

test.use({ storageState: "playwright/.auth/vendor.json" });

const VENDOR = "vendor@example.test";
const CLAUSE = 'V sees the message "Not enough rights" and no template';
const MESSAGE = "Not enough rights";
const WRONG_MESSAGE = "Not enough permissions";

test.afterEach(async ({ page }) => attachRuntimeErrors(page));

test(
  "NC-1 (AC-VENDOR-08, навмисно хибне очікування в тесті: інший текст повідомлення)",
  {
    tag: ["@negative-control"],
    annotation: [
      { type: "ac", description: "AC-VENDOR-08" },
      { type: "case", description: "NC-1" },
    ],
  },
  async ({ page }) => {
    await given(`vendor V (${VENDOR}) signed in`, async () => {
      await page.goto("/runs");
    });
    await when("V opens the list of templates by a direct link", async () => {
      await page.goto("/templates");
    });
    await thenStep(page, { clause: CLAUSE, visible: [`the message «${MESSAGE}»`] }, async () => {
      await expect(page.getByRole("main").getByRole("alert")).toHaveText(WRONG_MESSAGE, { timeout: 5_000 });
    });
  },
);

test(
  "NC-2 (AC-VENDOR-08, текст «Тоді» в анотації змінено, тест і застосунок — ні)",
  {
    tag: ["@negative-control"],
    annotation: [
      { type: "ac", description: "AC-VENDOR-08" },
      { type: "case", description: "NC-2" },
      {
        type: "ac-text",
        description:
          'AC-VENDOR-08: Given vendor V signed in. When V opens the list of templates by a direct link. Then V sees the message "Access denied" and the link "Back to runs", and no template.',
      },
    ],
  },
  async ({ page }) => {
    await given(`vendor V (${VENDOR}) signed in`, async () => {
      await page.goto("/runs");
    });
    await when("V opens the list of templates by a direct link", async () => {
      await page.goto("/templates");
    });
    await thenStep(page, { clause: CLAUSE, visible: [`the message «${MESSAGE}»`] }, async () => {
      await expect(page.getByRole("main").getByRole("alert")).toHaveText(MESSAGE);
    });
  },
);
