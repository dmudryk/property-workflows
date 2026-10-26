#!/usr/bin/env node
// Архітектурне правило «запис у таблиці — лише через функції бази» (ADR 0001, ADR 0002).
// Код застосунку (src/) не пише в таблиці напряму: жодного .from(…)…insert / update / upsert / delete — ні одним
// ланцюжком, ні через запит, збережений у змінну. Запис — лише supabase.rpc(…) до функцій private.* (security
// definer, перевірка ролі всередині). Тоді перевірка прав живе в одному місці, а прямий запит з публічним ключем
// натрапляє на відсутні гранти (permission denied).
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

// Код без коментарів і без вмісту рядків: коментарі й вміст '…', "…", `…` замінено пробілами (переноси рядків
// лишаються — номер рядка правильний), тож «//» усередині рядка не обрізає код, а текст у рядку не схожий на виклик.
// Код у ${…} шаблонного рядка лишається кодом. Літерали регулярних виразів окремо не розбираємо.
function blank(code) {
  let out = "";
  let i = 0;
  const templates = []; // для кожного відкритого ${…} — глибина вкладених «{»
  const hide = (ch) => (ch === "\n" ? "\n" : " ");
  // Вміст рядка до закривальної лапки (або до ${ у шаблонному рядку); екрановані символи — разом із «\».
  const skipString = (quote) => {
    while (i < code.length && code[i] !== quote) {
      if (quote !== "`" && code[i] === "\n") return;
      if (quote === "`" && code[i] === "$" && code[i + 1] === "{") return;
      if (code[i] === "\\") out += hide(code[i++]);
      if (i < code.length) out += hide(code[i++]);
    }
  };
  while (i < code.length) {
    const ch = code[i];
    if (ch === "/" && code[i + 1] === "/") {
      while (i < code.length && code[i] !== "\n") out += hide(code[i++]);
    } else if (ch === "/" && code[i + 1] === "*") {
      const close = code.indexOf("*/", i + 2);
      const stop = close < 0 ? code.length : close + 2;
      while (i < stop) out += hide(code[i++]);
    } else if (ch === '"' || ch === "'") {
      out += code[i++];
      skipString(ch);
      if (code[i] === ch) out += code[i++];
    } else if (ch === "`" || (ch === "}" && templates.at(-1) === 0)) {
      if (ch === "}") templates.pop();
      out += code[i++];
      skipString("`");
      if (code[i] === "`") out += code[i++];
      else if (i < code.length) {
        templates.push(0);
        out += code.slice(i, i + 2);
        i += 2;
      }
    } else {
      if (templates.length > 0 && ch === "{") templates[templates.length - 1] += 1;
      if (templates.length > 0 && ch === "}") templates[templates.length - 1] -= 1;
      out += code[i++];
    }
  }
  return out;
}

// .from(…) клієнта Supabase з будь-яким аргументом (зокрема змінною); статичні Array.from / Buffer.from (ім'я з
// великої літери) — не запит до бази.
const FROM = String.raw`(?<![A-Z][\w$]*)\.from\s*\(`;
const OPS = "insert|update|upsert|delete";
// 1) Ланцюжок від .from(…) до insert / update / upsert / delete в одному виразі (без «;» між ними).
const CHAIN = new RegExp(String.raw`${FROM}[^;]*?\.(${OPS})\s*\(`, "g");
// 2) Запит, збережений у змінну: const q = supabase.from(…); … q.insert(…) або q.eq(…).delete(…). Лише
// конструктор запиту (без await до .from): `const res = await supabase.from(…).select()` — уже результат.
const ASSIGNED = new RegExp(String.raw`\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=(?:(?!\bawait\b)[^;])*?${FROM}`, "g");
const escape = (name) => name.replace(/\$/g, "\\$");
const writesVia = (name) =>
  new RegExp(String.raw`(?<![\w$.])${escape(name)}\s*(?:\.[^;]*?)?\.\s*(${OPS})\s*\(`, "g");

const problems = [];
for (const file of walk(src)) {
  const original = readFileSync(file, "utf8");
  const lines = original.split("\n");
  const code = blank(original);
  // Позиція операції → її назва: той самий виклик, знайдений обома способами, рахуємо один раз.
  const found = new Map();
  const add = (start, match) => found.set(start + match.index + match[0].lastIndexOf(match[1]), match[1]);
  for (const m of code.matchAll(CHAIN)) add(0, m);
  for (const assigned of code.matchAll(ASSIGNED)) {
    const after = assigned.index + assigned[0].length;
    for (const m of code.slice(after).matchAll(writesVia(assigned[1]))) add(after, m);
  }
  for (const [at, op] of [...found].sort((a, b) => a[0] - b[0])) {
    const line = code.slice(0, at).split("\n").length;
    if (/writes-ok:\s*\S/.test(lines[line - 1] ?? "")) continue;
    problems.push(`${relative(root, file).split(sep).join("/")}:${line}  [direct-write]  .${op}(…) — запис у таблицю напряму; викличте функцію бази через supabase.rpc(…) (ADR 0001, 0002)`);
  }
}

if (problems.length > 0) {
  for (const p of problems) console.log(p);
  console.log(`\ncheck-writes-via-rpc: ${problems.length} порушень. Запис — лише функціями private.* через rpc.`);
  process.exit(1);
}
console.log("check-writes-via-rpc: OK — у src/ немає прямого запису в таблиці, лише rpc.");
