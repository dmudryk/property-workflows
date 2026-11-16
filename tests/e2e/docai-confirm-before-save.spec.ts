// AC-DOCAI-04 — людина підтверджує перед збереженням: менеджер запуску A вставляє лист про кран, що капає (GC-01),
// отримує пропозицію, змінює urgency на urgent і натискає «Save values»; до цього в запуску немає збережених значень.
// Пише в базу (@writes): A — синтетичний менеджер uat-…-a, запуск «Apartment 12, move-in» зі світу UAT
// (vendor-world.setup.ts); документ прибирає teardown (OWNED_ROWS: run_documents.created_by). Один запит до моделі.
import { expect, test } from "@playwright/test";
import { adminClient } from "./support/admin";
import { attachRuntimeErrors, given, thenStep, when } from "./support/uat";
import { authFile, readWorld } from "./support/vendor-world";

test.use({ storageState: authFile("a") });

test.afterEach(async ({ page }) => attachRuntimeErrors(page));

const TAP_EMAIL =
  "Subject: Dripping tap. Hi, the kitchen tap in apartment 12 has been dripping for three days. Please send someone this week. My phone is 555-0101. Lena Test";

async function savedDocuments(runId: string) {
  const { data, error } = await adminClient()
    .from("run_documents")
    .select("phone, urgency, category, created_by")
    .eq("run_id", runId);
  if (error) throw error;
  return data ?? [];
}

test(
  "AC-DOCAI-04: виправлене значення збережено лише після «Save values» — до того в запуску нічого",
  { tag: ["@uat", "@writes"], annotation: { type: "ac", description: "AC-DOCAI-04" } },
  async ({ page }) => {
    const world = readWorld();
    const A = world.users.a;
    const run = world.runs.apt12;

    await given(`run manager A (${A.email}) has received proposed values of the dripping-tap email in their run`, async () => {
      expect(await savedDocuments(run.id)).toEqual([]);
      await page.goto(`/runs/${run.id}`);
      await expect(page.getByTestId("user-email")).toHaveText(A.email);
      await page.getByTestId("docai-text").fill(TAP_EMAIL);
      await page.getByTestId("docai-propose").click();
      // Пропозиція моделі прийшла у форму (або стан «недоступний» — тоді UAT чесно впаде на наступному кроці).
      await expect(page.getByTestId("docai-phone")).toHaveValue("555-0101", { timeout: 90_000 });
      // Пропозиція нічого не записала.
      expect(await savedDocuments(run.id)).toEqual([]);
      await expect(page.getByTestId("saved-documents")).toHaveCount(0);
    });

    await when('A changes urgency to urgent and selects "Save values"', async () => {
      await page.getByRole("combobox", { name: "Urgency" }).click();
      await page.getByRole("option", { name: "urgent", exact: true }).click();
      await page.getByTestId("docai-save").click();
      await expect(page.getByTestId("docai-saved")).toHaveText("Values saved", { timeout: 30_000 });
    });

    await thenStep(
      page,
      {
        clause: "the run page shows the saved document with phone 555-0101 and urgency urgent",
        visible: ["«Saved documents» with phone 555-0101 and urgency «urgent»"],
        hidden: [
          "in the database: exactly one saved document of this run, by A, with urgency urgent",
          "before «Save values» the run had no saved values (checked in «Дано»)",
          "after saving, the form above is empty again (the saved proposal is not shown as a new one)",
        ],
      },
      async () => {
        const saved = page.getByTestId("saved-document");
        await expect(saved).toHaveCount(1);
        await expect(saved.getByTestId("saved-phone")).toHaveText("555-0101");
        await expect(saved.getByTestId("saved-urgency")).toHaveText("urgent");
        await expect(page.getByTestId("docai-phone")).toHaveValue("");
        // Кадр «Тоді» — це видима частина екрана: збережений документ — під формою.
        await page.getByTestId("saved-documents").scrollIntoViewIfNeeded();
        expect(await savedDocuments(run.id)).toEqual([
          { phone: "555-0101", urgency: "urgent", category: expect.any(String), created_by: A.id },
        ]);
      },
    );
  },
);
