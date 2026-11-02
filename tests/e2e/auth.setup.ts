// Вхід кожної ролі один раз за прогін → playwright/.auth/<role>.json (у .gitignore: там живі cookie сесії).
// Тести ролей беруть стан через test.use({ storageState: "playwright/.auth/<role>.json" }).
// У цьому проєкті запис вимкнено (playwright.config.ts: setup — video, trace і screenshot "off"): тут вводиться пароль.
//
// Змінні з паролями (лише назви; значення — у .env.local локально або в secrets CI, ніколи в коді):
//   DEMO_USER_PASSWORD           — спільний пароль акаунтів із supabase/demo-users.json (npm run users:demo);
//   UAT_PASSWORD_<РОЛЬ>          — необов'язково: окремий пароль для ролі, напр. UAT_PASSWORD_ADMIN.
//
// Джерело: демо-репо курсу, tests/e2e/auth.setup.ts (тег ws8-03-uat). ROLES — роль → адреса акаунта на проді
// (D0.5, *@example.test, supabase/demo-users.json):
//   admin     — дивиться стан шаблону («Version N», «Unpublished changes») до й після AC-DSYS-02;
//   manager_a — менеджер запуску «Apartment 12, move-in» (AC-DSYS-08: знаходить адресу запуску);
//   manager_c — менеджер без жодного запуску (AC-DSYS-04) і менеджер, що відкриває редактор (AC-DSYS-02).
import { expect, test as setup } from "@playwright/test";
import { signIn } from "./support/uat";

const ROLES = {
  admin: "admin@example.test",
  manager_a: "manager.a@example.test",
  manager_c: "manager.c@example.test",
} as const;

for (const [role, email] of Object.entries(ROLES)) {
  setup(`вхід: ${role}`, async ({ page }) => {
    const password = process.env[`UAT_PASSWORD_${role.toUpperCase()}`] ?? process.env.DEMO_USER_PASSWORD;
    expect(password, `немає пароля для ролі ${role}: DEMO_USER_PASSWORD або UAT_PASSWORD_${role.toUpperCase()}`).toBeTruthy();
    await signIn(page, email, password!);
    // Після входу — список запусків; картка користувача в бічній панелі показує email (data-testid="user-email").
    await expect(page.getByTestId("user-email")).toHaveText(email);
    await page.context().storageState({ path: `playwright/.auth/${role}.json` });
  });
}
