// AC-DOCAI-11 — порожнє поле тексту або лише пробіли: «Paste the text of a document» і жодного значення. Без запиту
// до моделі й без запису в базу: менеджер запуску A, запуск «Apartment 12, move-in» зі світу UAT (vendor-world.setup.ts).
import { expect, test } from "@playwright/test";
import { attachRuntimeErrors, given, thenStep, when } from "./support/uat";
import { authFile, readWorld } from "./support/vendor-world";

test.use({ storageState: authFile("a") });

test.afterEach(async ({ page }) => attachRuntimeErrors(page));

test(
  "AC-DOCAI-11: порожнє поле чи лише пробіли — «Paste the text of a document», жодного значення",
  { tag: ["@uat"], annotation: { type: "ac", description: "AC-DOCAI-11" } },
  async ({ page }) => {
    const world = readWorld();
    const A = world.users.a;
    const run = world.runs.apt12;

    await given(`run manager A (${A.email}) has only spaces in the text box`, async () => {
      await page.goto(`/runs/${run.id}`);
      await expect(page.getByTestId("user-email")).toHaveText(A.email);
      // Спершу зовсім порожнє поле — той самий результат; кадр «Тоді» — для пробілів.
      await page.getByTestId("docai-propose").click();
      await expect(page.getByTestId("docai-message")).toHaveText("Paste the text of a document", { timeout: 30_000 });
      await page.getByTestId("docai-text").fill("     ");
    });

    await when('A selects "Propose values"', async () => {
      await page.getByTestId("docai-propose").click();
      await expect(page.getByTestId("docai-reading")).toHaveCount(0, { timeout: 30_000 });
    });

    await thenStep(
      page,
      {
        clause: 'the block shows "Paste the text of a document" and no value is proposed',
        visible: ["«Paste the text of a document»", "no form with values"],
        hidden: ["the same message for a completely empty text box (checked in «Дано»)"],
      },
      async () => {
        await expect(page.getByTestId("docai-message")).toHaveText("Paste the text of a document");
        await expect(page.getByTestId("docai-values")).toHaveCount(0);
      },
    );
  },
);
