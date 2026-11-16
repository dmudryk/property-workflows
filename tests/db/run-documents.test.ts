// Тест бази для document-parsing (openspec/specs/document-parsing, AC-DOCAI-09, AC-DOCAI-11): справжній Postgres
// (PGlite) з нашими міграціями, запити від імені ролей (asUser) — без моків rpc. Хто може зберегти значення й що
// саме записується, вирішує база (private.save_run_document, політика run_documents_select_manager_admin).
import { beforeEach, describe, expect, it } from "vitest";
import type { TemplateContent } from "@/lib/templates/content";
import { createTestDb, type TestDb } from "./supabase-pglite";

const TENANT_MOVE_IN = "a1000000-0000-4000-8000-000000000001"; // версія 1: 2 секції, 5 задач

let t: TestDb;
let ADMIN: string;
let MANAGER_A: string;
let MANAGER_B: string;
let VENDOR: string;
let RUN: string; // запуск менеджера A; B — виконавець задачі 1, V — задачі 3

const SAVE = "select public.save_run_document($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9::text[]) as id";

// Значення листа про кран, що капає (GC-01), після того як людина змінила urgency на urgent.
const tapValues = (urgency = "urgent") => [
  "request",
  "555-0101",
  "Kitchen tap in apartment 12 has been dripping for three days",
  "plumbing",
  urgency,
  "[]",
  null,
  "{}",
];

beforeEach(async () => {
  t = await createTestDb();
  ADMIN = t.users["admin@example.test"];
  MANAGER_A = t.users["manager.a@example.test"];
  MANAGER_B = t.users["manager.b@example.test"];
  VENDOR = t.users["vendor@example.test"];
  const [tpl] = await t.asService<{ current_content: TemplateContent }>(
    "select current_content from public.templates where id = $1",
    [TENANT_MOVE_IN],
  );
  const taskIds = tpl.current_content.sections.flatMap((s) => s.tasks.map((task) => task.id));
  const [{ run_id }] = await t.asUser<{ run_id: string }>(MANAGER_A, "select public.launch_run($1, $2, $3::jsonb) as run_id", [
    TENANT_MOVE_IN,
    "Apartment 12, repair",
    { [taskIds[0]]: MANAGER_B, [taskIds[2]]: VENDOR },
  ]);
  RUN = run_id;
}, 60_000);

const documentsOf = (userId: string) =>
  t.asUser<{ phone: string; urgency: string; category: string; created_by: string }>(
    userId,
    "select phone, urgency, category, created_by from public.run_documents where run_id = $1",
    [RUN],
  );

const allDocuments = () => t.asService("select id from public.run_documents where run_id = $1", [RUN]);

describe("document-parsing у базі", () => {
  it("AC-DOCAI-09: виправлене значення збережено лише після «Save values» — до того в запуску нічого", async () => {
    expect(await allDocuments()).toEqual([]);

    const [{ id }] = await t.asUser<{ id: string }>(MANAGER_A, SAVE, [RUN, ...tapValues("urgent")]);

    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    expect(await documentsOf(MANAGER_A)).toEqual([
      { phone: "555-0101", urgency: "urgent", category: "plumbing", created_by: MANAGER_A },
    ]);
  }, 60_000);

  it("AC-DOCAI-09: напряму в таблицю не записати — лише функцією після дії людини", async () => {
    await expect(
      t.asUser(MANAGER_A, "insert into public.run_documents (run_id, kind, created_by) values ($1, 'request', $2)", [RUN, MANAGER_A]),
    ).rejects.toThrow(/permission denied/);
    expect(await allDocuments()).toEqual([]);
  }, 60_000);

  it("AC-DOCAI-11: виконавець B і вендор V зберегти не можуть — «Not enough rights», значень немає", async () => {
    await expect(t.asUser(MANAGER_B, SAVE, [RUN, ...tapValues()])).rejects.toThrow(/Not enough rights/);
    await expect(t.asUser(VENDOR, SAVE, [RUN, ...tapValues()])).rejects.toThrow(/Not enough rights/);
    expect(await allDocuments()).toEqual([]);
  }, 60_000);

  it("AC-DOCAI-11: збережені менеджером A значення не бачать ні B, ні V; адміністратор бачить і зберігає", async () => {
    await t.asUser(MANAGER_A, SAVE, [RUN, ...tapValues()]);
    expect(await documentsOf(MANAGER_B)).toEqual([]);
    expect(await documentsOf(VENDOR)).toEqual([]);

    await t.asUser(ADMIN, SAVE, [RUN, ...tapValues("not urgent")]);
    expect((await documentsOf(ADMIN)).map((d) => d.urgency).sort()).toEqual(["not urgent", "urgent"]);
  }, 60_000);

  it("AC-DOCAI-11: відвідувач без входу не викликає функцію збереження", async () => {
    await expect(t.asAnon(SAVE, [RUN, ...tapValues()])).rejects.toThrow(/permission denied/);
    expect(await allDocuments()).toEqual([]);
  }, 60_000);

  it("AC-DOCAI-09: база ще раз перевіряє значення — категорія поза переліком, кількість 0 і позиція без ціни відхилено", async () => {
    const [kind, phone, description, , urgency] = tapValues();
    await expect(t.asUser(MANAGER_A, SAVE, [RUN, kind, phone, description, "dragons", urgency, "[]", null, "{}"])).rejects.toThrow(
      /run_documents_category_check/,
    );
    const estimate = (items: unknown) => [RUN, "estimate", null, "Boiler service", null, null, JSON.stringify(items), 200, "{}"];
    await expect(t.asUser(MANAGER_A, SAVE, estimate([{ description: "Labour", quantity: 0, unit_price: 60 }]))).rejects.toThrow(
      /quantity above 0/,
    );
    await expect(t.asUser(MANAGER_A, SAVE, estimate([{ description: "Labour", quantity: 1 }]))).rejects.toThrow(/quantity above 0/);
    expect(await allDocuments()).toEqual([]);

    // Межа включно: кількість трохи більша за 0 і ціна 0 — дозволено; total як у документі, навіть якщо не збігається.
    await t.asUser(MANAGER_A, SAVE, estimate([{ description: "Inspection", quantity: 0.5, unit_price: 0 }]));
    const [row] = await t.asService<{ stated_total: string; line_items: unknown }>(
      "select stated_total, line_items from public.run_documents where run_id = $1",
      [RUN],
    );
    expect(row).toEqual({ stated_total: "200.00", line_items: [{ description: "Inspection", quantity: 0.5, unit_price: 0 }] });
  }, 60_000);
});
