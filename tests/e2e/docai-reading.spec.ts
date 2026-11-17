// AC-DOCAI-03 — поки AI читає документ: «Reading the document…», кнопка «Propose values» вимкнена, жодного значення.
// Без запису в базу: менеджер запуску A, запуск «Apartment 12, move-in» зі світу UAT (vendor-world.setup.ts).
// Один запит до моделі (його відповідь чекаємо, щоб не лишати дію незавершеною).
import { expect, test } from "@playwright/test";
import { attachRuntimeErrors, given, thenStep, when } from "./support/uat";
import { authFile, readWorld } from "./support/vendor-world";

test.use({ storageState: authFile("a") });

test.afterEach(async ({ page }) => attachRuntimeErrors(page));

const TAP_EMAIL =
  "Subject: Dripping tap. Hi, the kitchen tap in apartment 12 has been dripping for three days. Please send someone this week. My phone is 555-0101. Lena Test";

test(
  "AC-DOCAI-03: поки AI читає — «Reading the document…», «Propose values» вимкнена, жодного значення",
  { tag: ["@uat"], annotation: { type: "ac", description: "AC-DOCAI-03" } },
  async ({ page }) => {
    const world = readWorld();
    const A = world.users.a;
    const run = world.runs.apt12;

    await given(`run manager A (${A.email}) has pasted a text on the page of their run`, async () => {
      await page.goto(`/runs/${run.id}`);
      await expect(page.getByTestId("user-email")).toHaveText(A.email);
      await page.getByTestId("docai-text").fill(TAP_EMAIL);
    });

    await when('A selects "Propose values" and the AI is still working', async () => {
      await page.getByTestId("docai-propose").click();
    });

    await thenStep(
      page,
      {
        clause: 'the block shows "Reading the document…", "Propose values" is disabled, and no value is shown',
        visible: ["«Reading the document…» under the text box", "the «Propose values» button greyed out"],
        hidden: ["no form with values (checked: docai-values is absent while the AI works)", "no message"],
      },
      async () => {
        await expect(page.getByTestId("docai-reading")).toHaveText("Reading the document…");
        await expect(page.getByTestId("docai-propose")).toBeDisabled();
        await expect(page.getByTestId("docai-propose")).toContainText("Propose values");
        await expect(page.getByTestId("docai-values")).toHaveCount(0);
        await expect(page.getByTestId("docai-message")).toHaveCount(0);
      },
    );

    // Відповідь моделі прийшла — стан читання зник (дію не лишаємо незавершеною).
    await expect(page.getByTestId("docai-reading")).toHaveCount(0, { timeout: 90_000 });
  },
);
