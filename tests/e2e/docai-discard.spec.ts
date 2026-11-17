// AC-DOCAI-05 — «Discard»: менеджер запуску A отримав пропозицію листа про кран (GC-01) і відкидає її; блок знову
// порожній, сторінка запуску не показує збереженого запису. Без запису в базу (перевіряємо секретним ключем лише
// читання). Запуск «Apartment 14, repair» менеджера A зі світу UAT (vendor-world.setup.ts), а не «Apartment 12»: там
// AC-DOCAI-04 зберігає запис, і «Дано» PM («сторінка без збереженого запису») не виконувалось би. Один запит до моделі.
import { expect, test } from "@playwright/test";
import { adminClient } from "./support/admin";
import { attachRuntimeErrors, given, thenStep, when } from "./support/uat";
import { authFile, readWorld } from "./support/vendor-world";

test.use({ storageState: authFile("a") });

test.afterEach(async ({ page }) => attachRuntimeErrors(page));

const TAP_EMAIL =
  "Subject: Dripping tap. Hi, the kitchen tap in apartment 12 has been dripping for three days. Please send someone this week. My phone is 555-0101. Lena Test";

/** Скільки збережених документів у запуску (секретним ключем, в обхід RLS) — лише читання. */
async function documentsCount(runId: string) {
  const { count, error } = await adminClient()
    .from("run_documents")
    .select("*", { count: "exact", head: true })
    .eq("run_id", runId);
  if (error) throw error;
  return count ?? 0;
}

test(
  "AC-DOCAI-05: «Discard» — блок знову порожній, збереженого запису немає",
  { tag: ["@uat"], annotation: { type: "ac", description: "AC-DOCAI-05" } },
  async ({ page }) => {
    const world = readWorld();
    const A = world.users.a;
    const run = world.runs.apt14;

    await given(`run manager A (${A.email}) has values proposed in the block of a run without saved records`, async () => {
      expect(await documentsCount(run.id)).toBe(0);
      await page.goto(`/runs/${run.id}`);
      await expect(page.getByTestId("user-email")).toHaveText(A.email);
      await expect(page.getByTestId("saved-documents")).toHaveCount(0);
      await page.getByTestId("docai-text").fill(TAP_EMAIL);
      await page.getByTestId("docai-propose").click();
      // Пропозиція моделі прийшла у форму (або стан «недоступний» — тоді UAT чесно впаде тут).
      await expect(page.getByTestId("docai-phone")).toHaveValue("555-0101", { timeout: 90_000 });
    });

    await when('A selects "Discard"', async () => {
      await page.getByTestId("docai-discard").click();
    });

    await thenStep(
      page,
      {
        clause: "the block is empty again and the run page shows no saved record",
        visible: [
          "the empty text box with «Upload a text file» and «Propose values» under it",
          "the end of the page right under the block: no form with values and no «Saved documents» card",
        ],
        hidden: ["in the database: the run still has no saved documents (none before, checked in «Дано»)"],
      },
      async () => {
        // Кадр «Тоді» — видима частина екрана: прокручуємо до кінця сторінки, щоб було видно, що під блоком нічого немає.
        await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
        await expect(page.getByTestId("docai-text")).toHaveValue("");
        await expect(page.getByTestId("docai-values")).toHaveCount(0);
        await expect(page.getByTestId("docai-message")).toHaveCount(0);
        await expect(page.getByTestId("saved-documents")).toHaveCount(0);
        expect(await documentsCount(run.id)).toBe(0);
      },
    );
  },
);
