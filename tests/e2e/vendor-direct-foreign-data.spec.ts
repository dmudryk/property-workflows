// AC-VENDOR-18 — читання напряму, оминаючи сторінки: вендор V своїм токеном запитує в Data API email і профілі інших
// користувачів і задачі «Apartment 14, repair», де не має задач, — не отримує нічого про інших і про цей запуск.
// Правила живуть у базі (profiles_select_own_or_admin, private.staff, can_see_run) — їх доводить tests/db/vendor.test.ts
// (SQL-мутанти V3, V5, V10); тут — виняток WS8: запити напряму і крок на екрані — сторінка «Apartment 14, repair» очима
// V («Run not found»). Лише читання; «Дано» — синтетичний світ (@writes: vendor-world.setup.ts).
import { expect, test } from "@playwright/test";
import { attachRuntimeErrors, given, thenStep, when } from "./support/uat";
import { CASE_APT14, authFile, directRpc, directSelect, readWorld, runTaskRows } from "./support/vendor-world";

test.use({ storageState: authFile("v") });

test.afterEach(async ({ page }) => attachRuntimeErrors(page));

test(
  "AC-VENDOR-18: вендор V напряму запитує email і профілі інших і задачі «Apartment 14, repair» — нічого про інших і про цей запуск",
  { tag: ["@uat", "@writes"], annotation: { type: "ac", description: "AC-VENDOR-18" } },
  async ({ page }) => {
    const world = readWorld();
    const V = world.users.v;
    const A = world.users.a;
    const apt14 = world.runs.apt14;
    const token = world.vendorAccessToken;
    let profiles: Awaited<ReturnType<typeof directSelect>> | null = null;
    let profileOfA: Awaited<ReturnType<typeof directSelect>> | null = null;
    let staff: Awaited<ReturnType<typeof directRpc>> | null = null;
    let runs: Awaited<ReturnType<typeof directSelect>> | null = null;
    let tasks: Awaited<ReturnType<typeof directSelect>> | null = null;

    await given(
      `vendor V (${V.email}) who is the assignee of tasks 3 and 4 in the run "Apartment 12, move-in" and of no task in the run "Apartment 14, repair"`,
      async () => {
        const apt12 = await runTaskRows(world.runs.apt12.id);
        expect(apt12.map((t) => t.assignee_id === V.id)).toEqual([false, false, true, true, false]);
        const rows14 = await runTaskRows(apt14.id);
        expect(rows14).toHaveLength(5);
        expect(rows14.filter((t) => t.assignee_id === V.id)).toHaveLength(0);
      },
    );

    await when(
      'V requests directly, bypassing the pages of the application, the emails and profiles of other users and the tasks of "Apartment 14, repair"',
      async () => {
        profiles = await directSelect(token, "profiles", "select=id,email,role");
        profileOfA = await directSelect(token, "profiles", `select=id,email&id=eq.${A.id}`);
        staff = await directRpc(token, "list_staff", {});
        runs = await directSelect(token, "runs", `select=id,case_name&id=eq.${apt14.id}`);
        tasks = await directSelect(token, "run_tasks", `select=id,name,assignee_id&run_id=eq.${apt14.id}`);
      },
    );

    await thenStep(
      page,
      {
        clause: 'V receives nothing about other users or about "Apartment 14, repair"',
        visible: [`the page of the run «${CASE_APT14}» opened by V: the message «Run not found» and no task`],
        hidden: [
          `profiles: only V's own profile (${V.email}); the profile of manager A by its id — no rows`,
          "the assignee picker (list_staff) — no rows",
          `the run «${CASE_APT14}» and its tasks — no rows`,
        ],
      },
      async () => {
        expect(profiles?.status).toBe(200);
        expect(profiles?.rows).toEqual([{ id: V.id, email: V.email, role: "vendor" }]);
        expect(profileOfA?.rows).toEqual([]);
        expect(staff?.status).toBe(200);
        expect(JSON.parse(staff?.raw ?? "null")).toEqual([]);
        expect(runs?.rows).toEqual([]);
        expect(tasks?.rows).toEqual([]);
        await page.goto(`/runs/${apt14.id}`);
        await expect(page.getByTestId("user-email")).toHaveText(V.email);
        await expect(page.getByTestId("run-not-found")).toHaveText("Run not found");
        await expect(page.getByTestId("run-task")).toHaveCount(0);
      },
    );
  },
);
