// Проєкт setup (без запису: тут вводяться паролі): синтетичний світ зрізу 3 для специфікацій @writes вендора —
// див. support/vendor-world.ts. Кроки: користувачі uat-<прогін>-<ключ>@example.test з ролями (як npm run users:demo:
// Admin API + роль у profiles) → менеджер A запускає «Tenant move-in» тією самою функцією бази, що й форма запуску
// (public.launch_run), → кожен, хто відкриває сторінки, входить через форму /login → стан сесії й світ — у
// playwright/.auth/ (у .gitignore). Прибирання — cleanup.teardown.ts (усі uat-*, їхні запуски й задачі).
// Без SUPABASE_SECRET_KEY світу немає (тесту не реєструємо, як cleanup.teardown.ts): тоді прогін лише AC, що нічого
// не пишуть — --grep-invert '@writes'.
import { expect, test as setup } from "@playwright/test";
import { hasAdminKey } from "./support/admin";
import { signIn } from "./support/uat";
import {
  CASE_APT12,
  CASE_APT14,
  TEMPLATE_NAME,
  WORLD_ROLES,
  authFile,
  createWorldUser,
  launchAs,
  signInApi,
  templateFor,
  writeWorld,
  type World,
  type WorldUserKey,
} from "./support/vendor-world";

const KEYS = Object.keys(WORLD_ROLES) as WorldUserKey[];
/**
 * Хто відкриває сторінки в специфікаціях (v1 лише призначають у AC-VENDOR-01 — входити йому не треба; v13 входить
 * через форму в самій специфікації AC-VENDOR-13).
 */
const SIGNED_IN: WorldUserKey[] = ["a", "v", "v5", "w", "v11", "v16", "b"];
const RUN_ID = process.env.UAT_RUN ?? "manual";

/** Позначка від імені користувача тією самою функцією бази, що й «Mark as done» (public.mark_task_done). */
async function markAs(client: Awaited<ReturnType<typeof signInApi>>["client"], taskId: string) {
  const { error } = await client.rpc("mark_task_done", { p_task_id: taskId });
  if (error) throw error;
}

if (hasAdminKey()) {
  setup("світ вендора: синтетичні менеджер A і вендори, запуски «Apartment 12, move-in» і «Apartment 14, repair»", async ({ browser }) => {
    // 1. Користувачі з ролями.
    const users = {} as World["users"];
    const passwords = {} as Record<WorldUserKey, string>;
    for (const key of KEYS) {
      const { email, id, password } = await createWorldUser(key);
      users[key] = { email, id };
      passwords[key] = password;
    }

    // 2. Шаблон «Tenant move-in» очима менеджера A: поточна версія й 5 задач (номери 1…5 — у порядку секцій).
    const { client: managerA } = await signInApi(users.a.email, passwords.a);
    const template = await templateFor(managerA, TEMPLATE_NAME);
    expect(template.tasks, `«${TEMPLATE_NAME}» на проді має 5 задач, як у «Дано» AC зрізу 3`).toHaveLength(5);

    // 3. Запуски світу від імені A; задачі 3 і 4 — вендору.
    const toVendor = (key: WorldUserKey) => ({
      [template.tasks[2].id]: users[key].id,
      [template.tasks[3].id]: users[key].id,
    });
    // Задачі 3 і 5 «Tenant move-in» — необов'язкові, 1, 2 і 4 — обов'язкові (AC-VENDOR-16, AC-TASK-19).
    expect(template.tasks.map((t) => t.required)).toEqual([true, true, false, true, false]);
    const runs = {
      apt12: await launchAs(managerA, template.id, CASE_APT12, toVendor("v")),
      apt14: await launchAs(managerA, template.id, CASE_APT14, {}),
      apt12v5: await launchAs(managerA, template.id, CASE_APT12, toVendor("v5")),
      apt12v11: await launchAs(managerA, template.id, CASE_APT12, toVendor("v11")),
      apt12v13: await launchAs(managerA, template.id, CASE_APT12, toVendor("v13")),
      apt12v16: await launchAs(managerA, template.id, CASE_APT12, { [template.tasks[2].id]: users.v16.id }),
      task19: await launchAs(managerA, template.id, CASE_APT14, { [template.tasks[4].id]: users.b.id }),
    };

    // 3а. «Дано» з виконаними задачами — тими самими функціями бази, що й «Mark as done» (public.mark_task_done):
    // v11 позначає свою задачу 3 (AC-VENDOR-11); A виконує обов'язкові 1, 2, 4 двох запусків — вони «completed»
    // (AC-VENDOR-16, AC-TASK-19).
    const { client: v11 } = await signInApi(users.v11.email, passwords.v11);
    await markAs(v11, runs.apt12v11.taskIds[2]);
    for (const run of [runs.apt12v16, runs.task19]) {
      for (const i of [0, 1, 3]) await markAs(managerA, run.taskIds[i]);
    }

    // 4. Вхід через форму /login для тих, хто відкриває сторінки; стан сесії — у playwright/.auth/uat_<ключ>.json.
    for (const key of SIGNED_IN) {
      const context = await browser.newContext();
      const page = await context.newPage();
      await signIn(page, users[key].email, passwords[key]);
      await expect(page.getByTestId("user-email")).toHaveText(users[key].email);
      await context.storageState({ path: authFile(key) });
      await context.close();
    }

    // 5. Токен V для запитів напряму (AC-VENDOR-07, 09, 15, 17, 18), пароль v13 для входу в AC-VENDOR-13 і сам світ.
    const { accessToken } = await signInApi(users.v.email, passwords.v);
    writeWorld({ run: RUN_ID, template, users, runs, vendorAccessToken: accessToken, signInPassword: passwords.v13 });
  });
}
