// AC-DSYS-02 — відмова, яку видно в браузері: менеджер відкриває редактор шаблону за прямим посиланням.
// Лише читання: безпечно на проді. «Version 1» і «Unpublished changes» менеджер не бачить за правилами продукту
// (незбережені зміни — лише адміністратору), тож стан шаблону до й після звіряємо на сторінці шаблону очима
// адміністратора — окремим контекстом браузера, без запису.
import { expect, test, type Browser } from "@playwright/test";
import { attachRuntimeErrors, given, thenStep, when } from "./support/uat";

test.use({ storageState: "playwright/.auth/manager_c.json" });

const MANAGER = "manager.c@example.test";
const TEMPLATE = "Tenant move-in";

/** Стан шаблону на його сторінці для адміністратора: позначка версії і чи є «Unpublished changes». */
async function templateStateAsAdmin(browser: Browser, templatePath: string) {
  const context = await browser.newContext({ storageState: "playwright/.auth/admin.json" });
  const admin = await context.newPage();
  await admin.goto(templatePath);
  await admin.getByRole("heading", { level: 1, name: TEMPLATE, exact: true }).waitFor();
  const state = {
    version: (await admin.getByTestId("template-version").textContent())?.trim(),
    unpublished: await admin.getByTestId("unpublished").count(),
  };
  await context.close();
  return state;
}

test.afterEach(async ({ page }) => attachRuntimeErrors(page));

test(
  "AC-DSYS-02: менеджер відкриває редактор «Tenant move-in» за прямим посиланням — «Not enough rights» і «Back to templates», без вмісту редактора, шаблон лишається на версії 1",
  { tag: ["@uat"], annotation: { type: "ac", description: "AC-DSYS-02" } },
  async ({ page, browser }) => {
    let templatePath = "";

    await given(
      `manager B (${MANAGER}) signed in and the template "Tenant move-in" with current version 1`,
      async () => {
        await page.goto("/templates");
        await expect(page.getByTestId("user-email")).toHaveText(MANAGER);
        await page.getByRole("link", { name: TEMPLATE, exact: true }).click();
        await page.waitForURL(/\/templates\/[^/]+$/);
        templatePath = new URL(page.url()).pathname;
        // «Дано»: поточна версія 1 і без незбережених змін — інакше «лишається на версії 1» нічого б не довело.
        expect(await templateStateAsAdmin(browser, templatePath)).toEqual({ version: "Version 1", unpublished: 0 });
      },
    );

    await when("B opens the editor of this template by a direct link", async () => {
      await page.goto(`${templatePath}/edit`);
    });

    await thenStep(
      page,
      {
        clause:
          'B sees the message "Not enough rights" and the link "Back to templates" in the same page layout as the other pages, no content of the editor, and the template stays at version 1 with no unpublished changes',
        visible: [
          "the message «Not enough rights»",
          "the link «Back to templates»",
          "the same page layout as the other pages: the sidebar with «Stepline», «Workspace», «Runs», «Templates» and the user card with manager.c@example.test",
        ],
        hidden: [
          "no content of the editor: no text fields, sections, tasks or «Save version» on the page",
          "the template stays at version 1 with no unpublished changes: the administrator's page of the template still shows «Version 1» and no «Unpublished changes»",
        ],
      },
      async () => {
        await expect(page).toHaveURL((url) => url.pathname === `${templatePath}/edit`);
        const main = page.getByRole("main");
        await expect(main.getByRole("alert")).toHaveText("Not enough rights");
        await expect(main.getByRole("link", { name: "Back to templates", exact: true })).toBeVisible();
        // Та сама розкладка: оболонка з бічною панеллю, як на інших сторінках.
        await expect(page.getByTestId("app-shell")).toBeVisible();
        await expect(page.getByRole("navigation", { name: "Workspace" })).toBeVisible();
        await expect(page.getByTestId("user-email")).toHaveText(MANAGER);
        // Без вмісту редактора.
        await expect(main.getByRole("textbox")).toHaveCount(0);
        await expect(page.getByRole("button", { name: "Save version" })).toHaveCount(0);
        await expect(main.getByText(TEMPLATE)).toHaveCount(0);
        // Шаблон не змінився.
        expect(await templateStateAsAdmin(browser, templatePath)).toEqual({ version: "Version 1", unpublished: 0 });
      },
    );
  },
);
