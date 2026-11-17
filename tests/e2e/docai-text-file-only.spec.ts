// AC-DOCAI-12 — кнопкою «Upload a text file» завантажено «photo.png»: «Only plain text files (.txt) are accepted» і
// жодного значення. Наприкінці — файл .txt зчитується в поле тексту (Припущення PM). Без запиту до моделі й без запису в
// базу: менеджер запуску A, запуск «Apartment 12, move-in» зі світу UAT (vendor-world.setup.ts).
import { expect, test } from "@playwright/test";
import { attachRuntimeErrors, given, thenStep, when } from "./support/uat";
import { authFile, readWorld } from "./support/vendor-world";

test.use({ storageState: authFile("a") });

test.afterEach(async ({ page }) => attachRuntimeErrors(page));

// Найменший справжній PNG (1×1): підпис формату й заголовок — браузер визначає тип image/png за розширенням.
const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);
const TAP_EMAIL = "The oven in apartment 5 does not heat up anymore. Thanks, Maria Demo";

test(
  "AC-DOCAI-12: «photo.png» кнопкою «Upload a text file» — «Only plain text files (.txt) are accepted», жодного значення",
  { tag: ["@uat"], annotation: { type: "ac", description: "AC-DOCAI-12" } },
  async ({ page }) => {
    const world = readWorld();
    const A = world.users.a;
    const run = world.runs.apt12;

    await given(`run manager A (${A.email}) has opened their run`, async () => {
      await page.goto(`/runs/${run.id}`);
      await expect(page.getByTestId("user-email")).toHaveText(A.email);
      await expect(page.getByTestId("docai-upload")).toHaveText("Upload a text file");
    });

    await when('A uploads the file "photo.png" with "Upload a text file"', async () => {
      const chooser = page.waitForEvent("filechooser");
      await page.getByTestId("docai-upload").click();
      await (await chooser).setFiles({ name: "photo.png", mimeType: "image/png", buffer: PNG_1X1 });
    });

    await thenStep(
      page,
      {
        clause: 'the block shows "Only plain text files (.txt) are accepted" and no value is proposed',
        visible: ["«Only plain text files (.txt) are accepted»", "the empty text box", "no form with values"],
        hidden: ["a plain .txt file afterwards is read into the text box (Assumptions of the requirement)"],
      },
      async () => {
        await expect(page.getByTestId("docai-message")).toHaveText("Only plain text files (.txt) are accepted");
        await expect(page.getByTestId("docai-text")).toHaveValue("");
        await expect(page.getByTestId("docai-values")).toHaveCount(0);
      },
    );

    // Файл .txt — у поле тексту, повідомлення про формат зникає (без запиту до моделі).
    const chooser = page.waitForEvent("filechooser");
    await page.getByTestId("docai-upload").click();
    await (await chooser).setFiles({ name: "request.txt", mimeType: "text/plain", buffer: Buffer.from(TAP_EMAIL) });
    await expect(page.getByTestId("docai-text")).toHaveValue(TAP_EMAIL);
    await expect(page.getByTestId("docai-message")).toHaveCount(0);
  },
);
