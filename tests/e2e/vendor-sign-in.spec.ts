// AC-VENDOR-13 — вендор входить: потрапляє на список запусків, навігація — лише «Runs» і «Profile». Вхід — через форму
// /login у самій специфікації (видно у відео), тож сесії з setup немає. «Дано» — синтетичний світ (@writes:
// vendor-world.setup.ts / cleanup.teardown.ts): v13 — виконавець 2 задач у своєму «Apartment 12, move-in». Пароль —
// з файлу світу (0600, у .gitignore), у звіт і трасу не потрапляє (fillSignInForm вводить його через evaluate).
import { expect, test } from "@playwright/test";
import { attachRuntimeErrors, fillSignInForm, given, thenStep, when } from "./support/uat";
import { CASE_APT12, readWorld, runTaskRows } from "./support/vendor-world";

test.use({ storageState: { cookies: [], origins: [] } });

test.afterEach(async ({ page }) => attachRuntimeErrors(page));

test(
  "AC-VENDOR-13: вендор V входить — список запусків, навігація лише «Runs» і «Profile»",
  { tag: ["@uat", "@writes"], annotation: { type: "ac", description: "AC-VENDOR-13" } },
  async ({ page }) => {
    const world = readWorld();
    const V = world.users.v13;

    await given(`vendor V (${V.email}) who is the assignee of 2 tasks in the run "Apartment 12, move-in"`, async () => {
      const rows = await runTaskRows(world.runs.apt12v13.id);
      expect(rows.filter((t) => t.assignee_id === V.id)).toHaveLength(2);
      await page.goto("/login");
      await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
    });

    await when("V signs in", async () => {
      await fillSignInForm(page, V.email, world.signInPassword);
      await page.waitForURL((url) => url.pathname !== "/login");
    });

    await thenStep(
      page,
      {
        clause: 'V sees the list of runs, and the navigation shows only "Runs" and "Profile"',
        visible: [
          `the list of runs (the page «Runs» with the run «${CASE_APT12}»)`,
          "the navigation with exactly two items: «Runs» and «Profile»",
        ],
        hidden: [`signed in as V (${V.email}); the page after signing in is /runs`, "no «Templates» item in the navigation"],
      },
      async () => {
        await expect(page).toHaveURL((url) => url.pathname === "/runs");
        await expect(page.getByTestId("user-email")).toHaveText(V.email);
        await expect(page.getByRole("heading", { level: 1, name: "Runs" })).toBeVisible();
        await expect(page.getByTestId("run-row").getByRole("link", { name: CASE_APT12, exact: true })).toBeVisible();
        const nav = page.getByRole("navigation", { name: "Workspace" });
        await expect(nav.getByRole("link")).toHaveText(["Runs", "Profile"]);
        await expect(nav.getByRole("link", { name: "Templates" })).toHaveCount(0);
      },
    );
  },
);
