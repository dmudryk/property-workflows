// AC-VENDOR-08 — відмова в браузері (заборонена роль): вендор відкриває список шаблонів за прямим посиланням —
// «Not enough rights» і жодного шаблону. Лише читання: акаунт vendor@example.test з accounts.zip, як у PM.
// Правило даних живе в базі (templates_select_visible) — його доводить tests/db/vendor.test.ts (SQL-мутант V7).
import { expect, test } from "@playwright/test";
import { attachRuntimeErrors, given, thenStep, when } from "./support/uat";

test.use({ storageState: "playwright/.auth/vendor.json" });

const VENDOR = "vendor@example.test";
// Шаблони на проді — з міграції 20261020123813_runs_launch.sql (синтетичні назви).
const TEMPLATES = ["Tenant move-in", "Repair"];

test.afterEach(async ({ page }) => attachRuntimeErrors(page));

test(
  "AC-VENDOR-08: вендор V відкриває список шаблонів за прямим посиланням — «Not enough rights», жодного шаблону",
  { tag: ["@uat"], annotation: { type: "ac", description: "AC-VENDOR-08" } },
  async ({ page }) => {
    await given(`vendor V (${VENDOR}) signed in`, async () => {
      await page.goto("/runs");
      await expect(page.getByTestId("user-email")).toHaveText(VENDOR);
    });

    await when("V opens the list of templates by a direct link", async () => {
      await page.goto("/templates");
    });

    await thenStep(
      page,
      {
        clause: 'V sees the message "Not enough rights" and no template',
        visible: ["the message «Not enough rights»"],
        hidden: [
          `no template: no table and none of the template names ${TEMPLATES.map((t) => `«${t}»`).join(", ")} on the page`,
          `the page is the list of templates (/templates), signed in as V (${VENDOR})`,
        ],
      },
      async () => {
        await expect(page).toHaveURL((url) => url.pathname === "/templates");
        await expect(page.getByTestId("user-email")).toHaveText(VENDOR);
        await expect(page.getByRole("main").getByRole("alert")).toHaveText("Not enough rights");
        await expect(page.getByRole("table")).toHaveCount(0);
        for (const name of TEMPLATES) await expect(page.getByText(name, { exact: true })).toHaveCount(0);
      },
    );
  },
);
