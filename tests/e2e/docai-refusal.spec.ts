// AC-DOCAI-09 — документ не заявка й не кошторис (GC-09, меню ресторану): «This document is not a maintenance request
// or an estimate.» і жодного запропонованого значення. Без запису в базу: менеджер запуску A, запуск
// «Apartment 12, move-in» зі світу UAT (vendor-world.setup.ts). Один запит до моделі.
import { expect, test } from "@playwright/test";
import { adminClient } from "./support/admin";
import { attachRuntimeErrors, given, thenStep, when } from "./support/uat";
import { authFile, readWorld } from "./support/vendor-world";

test.use({ storageState: authFile("a") });

test.afterEach(async ({ page }) => attachRuntimeErrors(page));

const MENU = "Tonight's menu: tomato soup 6.50, roast chicken 14.00, apple pie 5.00";

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
  "AC-DOCAI-09: меню ресторану — «This document is not a maintenance request or an estimate.», жодних значень",
  { tag: ["@uat"], annotation: { type: "ac", description: "AC-DOCAI-09" } },
  async ({ page }) => {
    const world = readWorld();
    const A = world.users.a;
    const run = world.runs.apt12;
    let before = 0;

    await given(`run manager A (${A.email}) has opened their run`, async () => {
      before = await documentsCount(run.id);
      await page.goto(`/runs/${run.id}`);
      await expect(page.getByTestId("user-email")).toHaveText(A.email);
      await expect(page.getByTestId("document-parser")).toBeVisible();
    });

    await when('A pastes the restaurant menu and selects "Propose values"', async () => {
      await page.getByTestId("docai-text").fill(MENU);
      await page.getByTestId("docai-propose").click();
      await expect(page.getByTestId("docai-message")).toBeVisible({ timeout: 90_000 });
    });

    await thenStep(
      page,
      {
        clause: 'A sees "This document is not a maintenance request or an estimate." and no proposed value',
        visible: ["«This document is not a maintenance request or an estimate.»", "no form with proposed values under it"],
        hidden: ["no notes block (checked: docai-notes is absent)", "nothing about this document is saved in the run"],
      },
      async () => {
        await expect(page.getByTestId("docai-message")).toHaveText("This document is not a maintenance request or an estimate.");
        await expect(page.getByTestId("docai-values")).toHaveCount(0);
        await expect(page.getByTestId("docai-notes")).toHaveCount(0);
        expect(await documentsCount(run.id)).toBe(before);
      },
    );
  },
);
