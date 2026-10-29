# QA proof pack: зріз 2 — редактор шаблону з версіями й одна дизайн-система

<!--
Шаблон з koldovsky/2026-quitcode-08-quality-hw/materials/templates/proof-pack.template.md.
Покладіть у docs/qa/proof-pack.md вашого репо й заповнюйте по кроках WS8 (A → B → C → D).
Посилання — на файли на коміті (…/blob/<sha>/…#L<N>), на PR (…/pull/N) і на прогони (…/actions/runs/N).
Жодних паролів і пароля від accounts.zip. Акаунти — лише адреси *@example.test.
Цей файл — вхід для конвеєра WS9: на кожен AC видно, чим він доведений.
-->

- Прод-URL: https://property-workflows-bravo16.vercel.app
- Вимоги: https://github.com/solomchaak/property-workflows-spec · джерело: issues · знімок 2026-10-27
- `/api/health` на момент UAT: <!-- sha і db, напр. «sha 1a2b3c4, db ok, 01.11.2026» -->

## 3 AC

| AC | Вид | «Тоді» (дослівно з вимоги PM) |
|---|---|---|
| AC-DSYS-02 | відмова в браузері (заборонена роль: менеджер відкриває редактор за прямим посиланням) | B sees the message "Not enough rights" and the link "Back to templates" in the same page layout as the other pages, no content of the editor, and the template stays at version 1 with no unpublished changes. |
| AC-DSYS-04 | стан інтерфейсу (порожній стан списку запусків) | B sees the message "No runs yet. Launch a template to start one." and the link "Launch a template", and no empty table. |
| AC-DSYS-08 | не увійшов → вхід → та сама сторінка (повернення після входу за прямим посиланням) | B sees the page of the run "Apartment 12, move-in". |

## A. Ворота

- PR воріт: <!-- …/pull/N -->
- Зелений `quality` на `main`: <!-- …/actions/runs/N -->
- Обов'язкові перевірки в `solo-main` з <!-- дата -->: <!-- назви jobs -->

Розбір першого повного прогону `fallow` (той самий — в описі PR воріт):

| Група знахідок | Скільки | Справжня / навмисна / хибна | Дія і причина |
|---|---|---|---|
| <!-- напр. unused dependency @tailwindcss/turbopack --> | 1 | хибна | `ignoreDependencies`: підключено рядком у `next.config.ts`, fallow цього не бачить |

## B. Якість тестів

### Рівень для кожного AC

Посилання нижче — відносні: у файлі на коміті (…/blob/<SHA>/docs/qa/proof-pack.md) вони ведуть на той самий SHA.

| AC | Де живе правило | Рівень | Чому | Тест |
|---|---|---|---|---|
| AC-DSYS-02 | «шаблон лишається на версії 1 без незбережених змін» — функції бази `private.save_template_draft` / `publish_template_version` (перевірка ролі, `NOT_ALLOWED`) у [міграції](../../supabase/migrations/20261026175944_templates_versions.sql#L198); «Not enough rights», «Back to templates», без вмісту редактора — сторінка [`templates/[id]/edit/page.tsx:13`](../../src/app/templates/[id]/edit/page.tsx#L13) через `canManageTemplates` ([`src/lib/auth/roles.ts`](../../src/lib/auth/roles.ts#L5)) | база (PGlite) + unit + e2e | відмова, правило якої живе в SQL, — лише тест бази `asUser` (не мок `rpc`); роль на сторінці — чиста функція (unit); що видно на екрані — e2e | [tests/db/templates.test.ts:246](../../tests/db/templates.test.ts#L246) (база), [src/lib/auth/access.test.ts:15](../../src/lib/auth/access.test.ts#L15) (unit); e2e — трек C |
| AC-DSYS-04 | порожній стан замість таблиці — [`runsListView`](../../src/lib/runs/list-view.ts#L6) і тексти в `src/lib/runs/list-view.ts`; сторінка [`src/app/runs/page.tsx:45`](../../src/app/runs/page.tsx#L45); «менеджер без запусків» (які запуски видно) — RLS `private.can_see_run` | unit + рендер сторінки + e2e | межа «0 запусків → порожній стан, ≥1 → таблиця» — чиста функція; сторінка рендериться зі справжнім `requireActor` і замоканим клієнтом Supabase; дослівний текст на екрані — e2e | [src/components/design-system.test.ts:59](../../src/components/design-system.test.ts#L59) (unit), [:70](../../src/components/design-system.test.ts#L70) (сторінка); e2e — трек C |
| AC-DSYS-08 | адреса повернення — [`safeNextPath`](../../src/lib/auth/next-path.ts#L6); `?next=` додає [proxy](../../src/lib/supabase/proxy.ts#L42); перенаправлення після входу — дія [`login`](../../src/app/login/actions.ts) | unit (дія входу з замоканим клієнтом Supabase, proxy) + e2e | правило — TS без бази: перевірка адреси й перенаправлення; повний шлях «посилання → вхід → сторінка запуску» — e2e | [src/app/login/actions.test.ts:33](../../src/app/login/actions.test.ts#L33), [:40](../../src/app/login/actions.test.ts#L40), [:64](../../src/app/login/actions.test.ts#L64); [src/lib/supabase/proxy.test.ts:26](../../src/lib/supabase/proxy.test.ts#L26); e2e — трек C |

Тестів на мок `rpc` чи TS-копію SQL-правила серед цих немає: відмова AC-DSYS-02 у базі доведена тестом PGlite.

### Покриття

`npm run test:coverage` (v8), 29.10.2026. Підлога 90/85/90/90 — у `FLOORED` (`vitest.coverage.config.mts`).

| Файл за AC | Рядки | Гілки | Чим доведено, якщо 0 % |
|---|---|---|---|
| `src/lib/auth/roles.ts` (AC-DSYS-02) | 100 % | 100 % | — |
| `src/lib/templates/content.ts` (тексти AC-DSYS-02) | 77,77 % | 72,91 % | — (решта файлу — правила редактора, не цей AC) |
| `src/app/templates/[id]/edit/page.tsx` (AC-DSYS-02) | 0 % | 0 % | e2e (трек C); «нічого не змінилось» — тест бази `tests/db/templates.test.ts:246` |
| `src/components/not-enough-rights.tsx` (AC-DSYS-02) | 0 % | 0 % | e2e (трек C) |
| `src/lib/runs/list-view.ts` (AC-DSYS-04) | 100 % | 100 % | — |
| `src/app/runs/page.tsx` (AC-DSYS-04) | 100 % | 62,5 % | — |
| `src/components/empty-state.tsx` (AC-DSYS-04) | 100 % | 100 % | — |
| `src/lib/auth/next-path.ts` (AC-DSYS-08) | 90 % | 100 % | — (непокритий рядок — недосяжний `catch`, див. «Еквівалентні мутанти») |
| `src/app/login/actions.ts` (AC-DSYS-08) | 70,58 % | 71,42 % | — |
| `src/lib/supabase/proxy.ts` (AC-DSYS-08) | 60 % | 100 % | — (непокрите — колбеки cookie клієнта Supabase) |

### Доказ мутацією

| Мутант (файл:рядок, що змінено) | AC під загрозою | До | Тест, посилений з тексту AC | Після |
|---|---|---|---|---|
| `src/lib/auth/next-path.ts:7` `value.startsWith("//")` → `value.endsWith("//")` | AC-DSYS-08 (повернення лише на сторінку цього застосунку; design.md U5 — «не пропускає `//…`») | вижив: тест мав лише `//evil.example/x`, який відкидає й друга охорона (origin, рядок 18) | [src/app/login/actions.test.ts:64](../../src/app/login/actions.test.ts#L64): `//app.invalid/runs/…`, `//app.invalid`, `//localhost:3000/runs` → `null`, вхід веде на `/` | убитий |
| `src/lib/auth/next-path.ts:19` `url.pathname.startsWith("/login/")` → `url.pathname.endsWith("/login/")` | AC-DSYS-08 (після входу — сторінка з посилання, а не знову сторінка входу) | вижив: у тесті були `/login` і `/login?next=…`, а не підшлях | [src/app/login/actions.test.ts:40](../../src/app/login/actions.test.ts#L40): додано `/login/reset` → `null` | убитий |

Кожен посилений тест — червоний на мутанті (мутацію внесено тимчасово, файл повернуто: `git diff src/` порожній) і
зелений на коді.

- Stryker (`npm run mutation:ts -- --mutate <файл>`):
  - `src/lib/auth/roles.ts` (AC-DSYS-02) — 6 з 6 убито, 100 %;
  - `src/lib/runs/list-view.ts` (AC-DSYS-04) — 10 з 10 убито, 100 %;
  - `src/lib/auth/next-path.ts` (AC-DSYS-08) — до: 36 убито, 4 вижили, 1 без покриття — 87,80 %; після: 38 убито,
    2 вижили, 1 без покриття — 92,68 %. Вижилі «після» — еквівалентні (нижче).
- SQL-мутації (`npm run mutation:sql`), 2 з 2 убито:

  | ID | AC | Що зламано | Вердикт | Які тести впали |
  |---|---|---|---|---|
  | D1 | AC-DSYS-02 | `save_template_draft`: прибрано перевірку ролі — менеджер записує незбережені зміни | KILLED | AC-DSYS-02 (`tests/db/templates.test.ts:246`), AC-EDITOR-08 |
  | D2 | AC-DSYS-02 | політика `template_drafts_select_admin` → `using (true)` — менеджер бачить незбережені зміни | KILLED | лише AC-EDITOR-02 |

  D2 вбив тест AC-EDITOR-02, а не тест AC-DSYS-02: у тесті AC-DSYS-02 твердження «менеджер не бачить незбережених
  змін» нічого не охороняє — за «Дано» AC незбережених змін немає, тож вибірка порожня за будь-якої політики.
  «Немає вмісту редактора» в AC-DSYS-02 — це сторінка (роль перевіряється до читання даних), її доводить e2e (трек C).
  Твердження не прибрано: воно описує стан з AC і не шкодить.
- Еквівалентні мутанти (`src/lib/auth/next-path.ts`, після посилення):
  - рядок 7, `value.startsWith("/\\")` → `value.endsWith("/\\")`: рядок 10 (`/[\u0000-\u001f\u007f\\]/`) відкидає
    будь-який рядок зі `\`, тож «/\…» не проходить і без цієї перевірки;
  - рядок 18, `url.origin !== BASE` → `false`: після рядків 7 і 10 (один `/` на початку, без `\` і керівних символів)
    `new URL(value, BASE)` — завжди шлях на тому самому origin; перевірка — друга охорона, недосяжна для жодного входу;
  - рядок 14, порожній `catch` (без покриття): `new URL` для такого шляху з дійсною базою не кидає виняток —
    `catch` недосяжний.
  - Перевірено перебором: 300 000 випадкових адрес, з них 153 145 пройшли рядки 7 і 10 — `new URL` жодного разу не
    кинув виняток і не дав іншого origin; кожен рядок з «/\» містив `\`.

## C. UAT на проді

| AC | Специфікація | Тест (твердження) | Агент | Вердикт | Кадр |
|---|---|---|---|---|---|
| AC-…-NN | <!-- …/blob/<sha>/tests/e2e/….spec.ts --> | <!-- passed / failed --> | <!-- Haiku: PASS / FAIL / NEEDS-HUMAN (+ Sonnet, якщо була суперечка) --> | <!-- PASS / FAIL / NEEDS-HUMAN і правило (R1–R6) --> | <!-- …/blob/<sha>/docs/qa/uat/<дата>/frames/AC-…-then-1.png --> |

- Звіт: <!-- …/blob/<sha>/docs/qa/uat/<YYYY-MM-DD>/report.md -->
- Відео: <!-- вкладення в описі PR …/pull/N -->
- Рецензент: <!-- моделі зі звіту (claude-haiku-5-5; суперечки — claude-sonnet-5-5) і вартість прогону -->
- Негативний контроль: <!-- NC-… (npm run uat:nc): що навмисно хибне, вердикт (FAIL / NEEDS-HUMAN), …/pull/N -->
- Дані: <!-- «лише читання» або «@writes: uat-<запуск>@example.test, рядок «Прибирання» зі звіту» -->

### Приймання PM

| AC | Рішення PM | Посилання |
|---|---|---|
| AC-…-NN | <!-- ✅ / ❌ / NEEDS-HUMAN → … --> | <!-- коментар-підпис або issue «Відхилення від вимог» --> |

## D. Eval рецензента

- PR з вадами (не злитий): <!-- …/pull/N -->
- Ключ і таблиця: <!-- …/pull/N#issuecomment-M -->

| # | Вада (ключ) | CodeRabbit | `/code-review high` |
|---|---|---|---|
| 1 | <!-- категорія і файл:рядок --> | <!-- знайшов / пропустив + цитата --> | <!-- знайшов / пропустив + цитата --> |
| 2 | … | … | … |
| 3 | … | … | … |
| П | приманка: <!-- що --> | <!-- хибна тривога? цитата --> | <!-- хибна тривога? цитата --> |

- Інші знахідки: <!-- слушна / шум, по рядку на кожну -->
- Правило, що закриває пропуск: <!-- рядок в AGENTS.md чи path instruction, …/commit/<sha> -->
- Повторний прогін: <!-- хто, результат, цитата, …/pull/N#issuecomment-M -->
