// AC-DSYS-08 — відвідувач без входу відкриває запуск за прямим посиланням, входить і бачить саме цей запуск.
// Лише читання: безпечно на проді. Менеджер запуску «Apartment 12, move-in» на проді — manager.a@example.test;
// адресу запуску беремо з його списку запусків (окремий контекст без запису), а не зашиваємо id.
// Вхід — через форму в самому тесті (signIn з uat.ts чекає головну); пароль — зі змінної, як в auth.setup.ts,
// і вводиться через evaluate, тож у назви кроків, звіт і трасу не потрапляє.
import { expect, test, type Browser } from "@playwright/test";
import { attachRuntimeErrors, fillSignInForm, given, thenStep, when } from "./support/uat";

// Відвідувач без входу: без збереженої сесії.
test.use({ storageState: { cookies: [], origins: [] } });

const MANAGER = "manager.a@example.test";
const CASE = "Apartment 12, move-in";

function managerPassword(): string {
  return process.env.UAT_PASSWORD_MANAGER_A ?? process.env.DEMO_USER_PASSWORD ?? "";
}

/** Адреса сторінки запуску з прямого посилання — зі списку запусків менеджера запуску. */
async function runPathOfManager(browser: Browser): Promise<string> {
  const context = await browser.newContext({ storageState: "playwright/.auth/manager_a.json" });
  const page = await context.newPage();
  await page.goto("/runs");
  await page.getByRole("link", { name: CASE, exact: true }).click();
  await page.waitForURL(/\/runs\/[0-9a-f-]{36}$/);
  const path = new URL(page.url()).pathname;
  await context.close();
  return path;
}

test.afterEach(async ({ page }) => attachRuntimeErrors(page));

test(
  "AC-DSYS-08: відвідувач відкриває «Apartment 12, move-in» за прямим посиланням, бачить вхід і входить як менеджер запуску — сторінка цього запуску",
  { tag: ["@uat"], annotation: { type: "ac", description: "AC-DSYS-08" } },
  async ({ page, browser }) => {
    let runPath = "";

    await given(
      `a visitor who is not signed in, and manager B (${MANAGER}) who is the run manager of the run "Apartment 12, move-in"`,
      async () => {
        expect(managerPassword(), "немає пароля: DEMO_USER_PASSWORD або UAT_PASSWORD_MANAGER_A").not.toBe("");
        runPath = await runPathOfManager(browser);
        expect(await page.context().cookies()).toEqual([]);
      },
    );

    await when(
      "the visitor opens the page of this run by a direct link, sees the sign-in page and signs in as B",
      async () => {
        await page.goto(runPath);
        await expect(page).toHaveURL((url) => url.pathname === "/login" && url.searchParams.get("next") === runPath);
        await expect(page.getByRole("heading", { level: 1, name: "Sign in" })).toBeVisible();
        await fillSignInForm(page, MANAGER, managerPassword());
        await page.waitForURL((url) => url.pathname !== "/login");
      },
    );

    await thenStep(
      page,
      {
        clause: 'B sees the page of the run "Apartment 12, move-in"',
        // Лише те, що є в «Тоді» і читається з кадру. Email у картці користувача обрізано «…» (DESIGN.md), тож що
        // увійшов саме B, доводить твердження, а не кадр.
        visible: ["the page of the run with the heading «Apartment 12, move-in»"],
        hidden: [
          "it is the page the link led to: the address is the same run page, not the list of runs or the home page",
          "B is signed in: the user card holds manager.a@example.test",
        ],
      },
      async () => {
        await expect(page).toHaveURL((url) => url.pathname === runPath);
        await expect(page.getByRole("heading", { level: 1, name: CASE, exact: true })).toBeVisible();
        await expect(page.getByTestId("user-email")).toHaveText(MANAGER);
      },
    );
  },
);
