#!/usr/bin/env node
// Архітектурне правило «запис у таблиці — лише через функції бази» (ADR 0001, ADR 0002).
// Код застосунку (src/) не пише в таблиці напряму: жодного .from(…)…insert / update / upsert / delete. Запис — лише
// supabase.rpc(…) до функцій private.* (security definer, перевірка ролі всередині). Тоді перевірка прав живе в одному
// місці, а прямий запит з публічним ключем натрапляє на відсутні гранти (permission denied).
// Тести (*.test.ts / *.test.tsx) не перевіряються. Виняток — коментар `writes-ok: <причина>` у рядку з викликом.
// Використання: node scripts/check-writes-via-rpc.mjs [--root <dir>]
// Код виходу: 0 — порушень немає, 1 — є порушення, 2 — немає теки src/ або її не вдалося прочитати.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const args = process.argv.slice(2);
const rootIdx = args.indexOf("--root");
const root = rootIdx >= 0 ? args[rootIdx + 1] : process.cwd();
const src = join(root, "src");

const isDir = (p) => {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
};
if (!isDir(src)) {
  console.error(`check-writes-via-rpc: у ${root} немає теки src/ — запустіть з кореня проєкту або вкажіть --root <dir>.`);
  process.exit(2);
}

const SKIP_DIRS = new Set(["node_modules", ".next", ".git"]);
const CODE = /\.(tsx?|jsx?|mjs|cjs)$/;
const TEST = /\.test\.(tsx?|jsx?)$/;

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch (error) {
    console.error(`check-writes-via-rpc: не вдалося прочитати ${dir}: ${error.message}`);
    process.exit(2);
  }
  for (const name of entries) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    if (isDir(full)) walk(full, out);
    else if (CODE.test(name) && !TEST.test(name)) out.push(full);
  }
  return out;
}

// Ланцюжок від .from("…") до insert / update / upsert / delete в одному виразі (без «;» між ними).
const WRITE = /\.from\(\s*(["'`])[^"'`]+\1\s*\)[^;]*?\.(insert|update|upsert|delete)\s*\(/g;
// Коментарі прибираємо, але зберігаємо переноси рядків, щоб номер рядка лишався правильним.
const stripComments = (code) =>
  code.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " ")).replace(/(^|[^:"'`])\/\/.*$/gm, "$1");

const problems = [];
for (const file of walk(src)) {
  const original = readFileSync(file, "utf8");
  const lines = original.split("\n");
  const code = stripComments(original);
  for (const match of code.matchAll(WRITE)) {
    const opAt = match.index + match[0].lastIndexOf(match[2]);
    const line = code.slice(0, opAt).split("\n").length;
    if (/writes-ok:\s*\S/.test(lines[line - 1] ?? "")) continue;
    problems.push(`${relative(root, file).split(sep).join("/")}:${line}  [direct-write]  .${match[2]}(…) — запис у таблицю напряму; викличте функцію бази через supabase.rpc(…) (ADR 0001, 0002)`);
  }
}

if (problems.length > 0) {
  for (const p of problems) console.log(p);
  console.log(`\ncheck-writes-via-rpc: ${problems.length} порушень. Запис — лише функціями private.* через rpc.`);
  process.exit(1);
}
console.log("check-writes-via-rpc: OK — у src/ немає прямого запису в таблиці, лише rpc.");
