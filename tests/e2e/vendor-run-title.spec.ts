// AC-VENDOR-11 — сторінка запуску очима вендора: назва випадку заголовком і «Your tasks: 1 of 2 done», без статусу
// запуску, назви й версії шаблону. Сторінка лише читає; «Дано» — синтетичний світ (@writes: vendor-world.setup.ts /
// cleanup.teardown.ts): v11 — виконавець задач 3 (уже «done», позначив сам) і 4 у своєму «Apartment 12, move-in».
// «Не бачить» діє й для запиту напряму (правило під матрицею прав PM; ADR 0005): прихований крок — той самий запит, що з
// DevTools, токеном вендора V світу (у нього теж свій «Apartment 12, move-in»): runs?select=* → 0 рядків, а функція
// vendor_runs — лише id, назва випадку, статус і час запуску.
import { expect, test } from "@playwright/test";
import { attachRuntimeErrors, given, thenStep, when } from "./support/uat";
import { CASE_APT12, TEMPLATE_NAME, authFile, directSelect, readWorld, runTaskRows } from "./support/vendor-world";

test.use({ storageState: authFile("v11") });

test.afterEach(async ({ page }) => attachRuntimeErrors(page));

test(
  "AC-VENDOR-11: вендор V відкриває «Apartment 12, move-in» — заголовок з назвою випадку й «Your tasks: 1 of 2 done», без статусу запуску, назви й версії шаблону",
  { tag: ["@uat", "@writes"], annotation: { type: "ac", description: "AC-VENDOR-11" } },
  async ({ page }) => {
    const world = readWorld();
    const V = world.users.v11;
    const run = world.runs.apt12v11;

    await given(
      `vendor V (${V.email}) who is the assignee of tasks 3 ("done") and 4 ("to do") in the run "Apartment 12, move-in" (5 tasks)`,
      async () => {
        const rows = await runTaskRows(run.id);
        expect(rows).toHaveLength(5);
        expect(rows.map((t) => (t.assignee_id === V.id ? t.status : "—"))).toEqual(["—", "—", "done", "to_do", "—"]);
      },
    );

    await when("V opens this run", async () => {
      await page.goto(`/runs/${run.id}`);
      await expect(page.getByTestId("user-email")).toHaveText(V.email);
    });

    await thenStep(
      page,
      {
        clause:
          'V sees the case name "Apartment 12, move-in" as the title of the page and "Your tasks: 1 of 2 done", and does not see the run status, the template name or the template version',
        visible: [`the title of the page «${CASE_APT12}»`, "«Your tasks: 1 of 2 done»"],
        hidden: [
          "no run status: no status badge of the run and no «in progress» / «completed» on the page",
          `no template name «${TEMPLATE_NAME}» and no «Template version» on the page`,
          "directly, bypassing the pages (token of the world's vendor V): runs?select=* — 0 rows; rpc vendor_runs — only id, case_name, status, created_at, without the template name and version",
        ],
      },
      async () => {
        await expect(page.getByRole("heading", { level: 1 })).toHaveText(CASE_APT12);
        await expect(page.getByTestId("run-progress")).toHaveText("Your tasks: 1 of 2 done");
        await expect(page.getByTestId("run-status")).toHaveCount(0);
        await expect(page.getByRole("main").getByText(/in progress|completed/)).toHaveCount(0);
        await expect(page.getByText(TEMPLATE_NAME, { exact: true })).toHaveCount(0);
        await expect(page.getByText(/Template version/)).toHaveCount(0);
        expect(await directSelect(world.vendorAccessToken, "runs", "select=*")).toMatchObject({ status: 200, rows: [] });
        const own = await directSelect(world.vendorAccessToken, "rpc/vendor_runs", "");
        expect(own.rows?.length).toBeGreaterThan(0);
        expect(Object.keys(own.rows?.[0] ?? {}).sort()).toEqual(["case_name", "created_at", "id", "status"]);
        expect(JSON.stringify(own.rows)).not.toContain(TEMPLATE_NAME);
      },
    );
  },
);
