import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { repoRoot, runScript } from "./run-script";

const temps: string[] = [];

function project(files: Record<string, string>) {
  const dir = mkdtempSync(path.join(os.tmpdir(), "writes-via-rpc-"));
  temps.push(dir);
  for (const [file, content] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
    writeFileSync(path.join(dir, file), content);
  }
  return dir;
}

afterAll(() => {
  for (const dir of temps) rmSync(dir, { recursive: true, force: true });
});

describe("check-writes-via-rpc", () => {
  it("наш src/ — OK", () => {
    const { code, out } = runScript("check-writes-via-rpc.mjs", repoRoot);
    expect(out).toContain("OK");
    expect(code).toBe(0);
  });

  it("прямий insert / update / delete через .from(…) — порушення з файлом і рядком", () => {
    const dir = project({
      "src/app/templates/actions.ts": [
        'export async function bad(supabase) {',
        '  await supabase.from("template_drafts").insert({ template_id: "x", content: {} });',
        '  await supabase',
        '    .from("templates")',
        '    .update({ current_version: 2 })',
        '    .eq("id", "x");',
        '  await supabase.from("template_versions").delete().eq("template_id", "x");',
        "}",
      ].join("\n"),
    });
    const { code, out } = runScript("check-writes-via-rpc.mjs", dir);
    expect(code).toBe(1);
    expect(out).toContain("src/app/templates/actions.ts:2  [direct-write]  .insert");
    expect(out).toContain("src/app/templates/actions.ts:5  [direct-write]  .update");
    expect(out).toContain("src/app/templates/actions.ts:7  [direct-write]  .delete");
  });

  it("запис після .from(змінна) і через запит, збережений у змінну, — порушення", () => {
    const dir = project({
      "src/lib/indirect.ts": [
        "export async function bad(supabase, tableName, data) {",
        "  await supabase.from(tableName).insert(data);",
        '  const query = supabase.from("templates");',
        "  await query.update({ current_version: 2 });",
        '  await query.eq("id", "x").delete();',
        "}",
      ].join("\n"),
    });
    const { code, out } = runScript("check-writes-via-rpc.mjs", dir);
    expect(code).toBe(1);
    expect(out).toContain("src/lib/indirect.ts:2  [direct-write]  .insert");
    expect(out).toContain("src/lib/indirect.ts:4  [direct-write]  .update");
    expect(out).toContain("src/lib/indirect.ts:5  [direct-write]  .delete");
  });

  it("«//» усередині рядка не ховає запис після нього", () => {
    const dir = project({
      "src/lib/slashes.ts": [
        "export async function bad(supabase, id) {",
        '  const path = "a//b"; await supabase.from("templates").delete().eq("id", id);',
        '  const url = `https://example.test/${id}`; await supabase.from("templates").update({ name: url });',
        "}",
      ].join("\n"),
    });
    const { code, out } = runScript("check-writes-via-rpc.mjs", dir);
    expect(code).toBe(1);
    expect(out).toContain("src/lib/slashes.ts:2  [direct-write]  .delete");
    expect(out).toContain("src/lib/slashes.ts:3  [direct-write]  .update");
  });

  it("Array.from, результат запиту в змінній і текст у рядку — не порушення", () => {
    const dir = project({
      "src/lib/not-writes.ts": [
        "export async function ok(supabase, cache) {",
        "  Array.from(cache.keys()).forEach((key) => cache.delete(key));",
        '  const res = await supabase.from("templates").select("id");',
        '  if (res.error) cache.delete("templates");',
        '  const hint = "use supabase.from(\\"templates\\").insert(…) only in tests";',
        "  return hint;",
        "}",
      ].join("\n"),
    });
    const { code, out } = runScript("check-writes-via-rpc.mjs", dir);
    expect(out).toContain("OK");
    expect(code).toBe(0);
  });

  it("rpc, select, Set.delete, коментарі й тести — не порушення; writes-ok — виняток", () => {
    const dir = project({
      "src/lib/ok.ts": [
        'export async function ok(supabase, set) {',
        '  await supabase.rpc("save_template_draft", { p_template_id: "x", p_content: {} });',
        '  await supabase.from("templates").select("id").eq("id", "x");',
        '  set.delete("x");',
        '  // supabase.from("templates").update({}) — у коментарі',
        '  await supabase.from("audit").insert({}); // writes-ok: службовий журнал без прав користувача',
        "}",
      ].join("\n"),
      "src/lib/ok.test.ts": 'it("x", () => supabase.from("templates").update({}));',
    });
    const { code, out } = runScript("check-writes-via-rpc.mjs", dir);
    expect(out).toContain("OK");
    expect(code).toBe(0);
  });
});
