// AC-DSYS-04 — стан інтерфейсу: порожній список запусків з дослівним текстом і посиланням, без порожньої таблиці.
// Лише читання: безпечно на проді. manager.c@example.test на проді не має жодного запуску (ні як менеджер запуску,
// ні як виконавець) — під ним нічого не запускайте, інакше «Дано» цього AC зникне.
import { expect, test } from "@playwright/test";
import { attachRuntimeErrors, given, thenStep, when } from "./support/uat";

test.use({ storageState: "playwright/.auth/manager_c.json" });

const MANAGER = "manager.c@example.test";
const MESSAGE = "No runs yet. Launch a template to start one.";

test.afterEach(async ({ page }) => attachRuntimeErrors(page));

test(
  "AC-DSYS-04: менеджер без запусків відкриває список запусків — «No runs yet. Launch a template to start one.» і «Launch a template», без таблиці",
  { tag: ["@uat"], annotation: { type: "ac", description: "AC-DSYS-04" } },
  async ({ page }) => {
    await given(`manager B (${MANAGER}) who has no runs`, async () => {
      await page.goto("/templates");
      await expect(page.getByTestId("user-email")).toHaveText(MANAGER);
    });

    await when("B opens the list of runs", async () => {
      await page.getByRole("navigation", { name: "Workspace" }).getByRole("link", { name: "Runs" }).click();
      await page.waitForURL((url) => url.pathname === "/runs");
    });

    await thenStep(
      page,
      {
        clause: 'B sees the message "No runs yet. Launch a template to start one." and the link "Launch a template", and no empty table',
        visible: ["the message «No runs yet. Launch a template to start one.»", "the link «Launch a template» under the message"],
        hidden: ["no empty table: the page has no table and no column headers"],
      },
      async () => {
        const empty = page.getByTestId("empty-state");
        await expect(empty.getByText(MESSAGE, { exact: true })).toBeVisible();
        const link = empty.getByRole("link", { name: "Launch a template", exact: true });
        await expect(link).toBeVisible();
        await expect(link).toHaveAttribute("href", "/runs/new");
        await expect(page.getByRole("table")).toHaveCount(0);
        await expect(page.getByRole("columnheader")).toHaveCount(0);
      },
    );
  },
);
