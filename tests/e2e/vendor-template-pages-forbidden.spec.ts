// AC-VENDOR-14 — відмова в браузері (заборонена роль): вендор відкриває за прямим посиланням форму запуску, сторінку
// шаблону, список версій і редактор — «Not enough rights» і «Back to runs», без вмісту шаблону. Лише читання;
// «Дано» — синтетичний світ (@writes: vendor-world.setup.ts / cleanup.teardown.ts): V — uat-…-v; адреси — з id
// шаблону «Tenant move-in», а «вмісту шаблону немає» перевіряємо назвами його секцій і задач (їх знає світ).
import { expect, test } from "@playwright/test";
import { attachRuntimeErrors, given, thenStep, when } from "./support/uat";
import { TEMPLATE_NAME, authFile, readWorld } from "./support/vendor-world";

test.use({ storageState: authFile("v") });

test.afterEach(async ({ page }) => attachRuntimeErrors(page));

test(
  "AC-VENDOR-14: вендор V відкриває форму запуску, сторінку шаблону, список версій і редактор за прямим посиланням — «Not enough rights» і «Back to runs», без вмісту шаблону",
  { tag: ["@uat", "@writes"], annotation: { type: "ac", description: "AC-VENDOR-14" } },
  async ({ page }) => {
    const world = readWorld();
    const V = world.users.v;
    const id = world.template.id;
    const pages = [
      { name: "the launch form", path: "/runs/new" },
      { name: "the page of a template", path: `/templates/${id}` },
      { name: "the list of versions", path: `/templates/${id}/versions` },
      { name: "the editor", path: `/templates/${id}/edit` },
    ];
    const content = [TEMPLATE_NAME, ...new Set(world.template.tasks.map((t) => t.section)), ...world.template.tasks.map((t) => t.name)];

    await given(`vendor V (${V.email}) signed in`, async () => {
      await page.goto("/runs");
      await expect(page.getByTestId("user-email")).toHaveText(V.email);
    });

    // «Коли» й «Тоді» — для кожної з чотирьох сторінок AC окремо: кадр і перевірки на кожній.
    for (const { name, path } of pages) {
      await when(`V opens ${name} by a direct link`, async () => {
        await page.goto(path);
      });

      await thenStep(
        page,
        {
          clause: 'V sees the message "Not enough rights" and the link "Back to runs", and no content of the template',
          visible: [`${name}: the message «Not enough rights»`, "the link «Back to runs»"],
          hidden: [
            `the page is ${path}, signed in as V (${V.email})`,
            `no content of the template: neither «${TEMPLATE_NAME}» nor any of its sections and tasks on the page`,
            "the link «Back to runs» leads to /runs",
          ],
        },
        async () => {
          await expect(page).toHaveURL((url) => url.pathname === path);
          await expect(page.getByTestId("user-email")).toHaveText(V.email);
          await expect(page.getByRole("main").getByRole("alert")).toHaveText("Not enough rights");
          const back = page.getByRole("main").getByRole("link", { name: "Back to runs", exact: true });
          await expect(back).toBeVisible();
          await expect(back).toHaveAttribute("href", "/runs");
          for (const text of content) await expect(page.getByText(text, { exact: true }), text).toHaveCount(0);
        },
      );
    }
  },
);
