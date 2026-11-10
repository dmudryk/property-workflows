# QA proof pack: зріз 2 — редактор шаблону з версіями й одна дизайн-система

<!--
Шаблон з koldovsky/2026-quitcode-08-quality-hw/materials/templates/proof-pack.template.md.
Покладіть у docs/qa/proof-pack.md вашого репо й заповнюйте по кроках WS8 (A → B → C → D).
Посилання — на файли на коміті (…/blob/<sha>/…#L<N>), на PR (…/pull/N) і на прогони (…/actions/runs/N).
Жодних паролів і пароля від accounts.zip. Акаунти — лише адреси *@example.test.
Цей файл — вхід для конвеєра WS9: на кожен AC видно, чим він доведений.
-->

- Прод-URL: https://property-workflows-bravo16.vercel.app
- Вимоги: https://github.com/solomchaak/property-workflows-spec · джерело: issues · знімок 2026-10-30
- `/api/health` на момент UAT: sha `a039c9c`, db ok, 02.11.2026

## 3 AC

| AC | Вид | «Тоді» (дослівно з вимоги PM) |
|---|---|---|
| AC-DSYS-02 | відмова в браузері (заборонена роль: менеджер відкриває редактор за прямим посиланням) | B sees the message "Not enough rights" and the link "Back to templates" in the same page layout as the other pages, no content of the editor, and the template stays at version 1 with no unpublished changes. |
| AC-DSYS-04 | стан інтерфейсу (порожній стан списку запусків) | B sees the message "No runs yet. Launch a template to start one." and the link "Launch a template", and no empty table. |
| AC-DSYS-08 | не увійшов → вхід → та сама сторінка (повернення після входу за прямим посиланням) | B sees the page of the run "Apartment 12, move-in". |

## A. Ворота

- PR воріт: https://github.com/dmudryk/property-workflows/pull/29 (`quality.yml`, `.fallowrc.jsonc`, тестові правила
  `@vitest/eslint-plugin` як `error`, `vitest.coverage.config.mts` з `FLOORED` — 13 доменних файлів); відповіді на
  рев'ю `/code-review high` (9 знахідок: 6 виправлено, 3 пояснено) і CodeRabbit (2: 1 виправлено, 1 пояснено) — у PR.
- Зелений `quality` на `main`: https://github.com/dmudryk/property-workflows/actions/runs/41052507777 (`a039c9c`,
  30.10.2026 — злиття #29; усі три jobs).
- Обов'язкові перевірки в `solo-main` з 02.11.2026: «Ворота: fallow audit» і «Покриття: доменна підлога» (після
  зелених прогонів `quality` на `main`); разом зі `spec`, `app`, `conformance`, `db-check` — 6. «Порада: вразливі
  залежності» — ні, вона дорадча.
- Знахідки тестових правил лінтера (7) — виправлено без вимкнення правил: `vi.mock` власного `@/lib/auth/actor` →
  мок лише клієнта Supabase (2 файли), `vi.mock` картинки → плагін у `vitest.config.mts`, умови в тестах
  `launch.test.ts` → хелпер `runOf` поза тестами.

Розбір першого повного прогону `fallow` (той самий — в описі PR воріт):

| Група знахідок | Скільки | Справжня / навмисна / хибна | Дія і причина |
|---|---|---|---|
| Невикористаний файл `src/components/ui/native-select.tsx` | 1 | справжня | видалено в #29: DESIGN.md забороняє `NativeSelect` («`FormSelect` для кожного вибору»), файл ніхто не імпортує |
| Невикористаний файл `src/lib/supabase/client.ts` | 1 | навмисна | лишено: браузерний клієнт шаблону курсу (структура в AGENTS.md); ворота валять лише нові знахідки; так само в демо курсу (`ws8-01-gates`) |
| Невикористаний експорт `AC_ID_GLOBAL` (`scripts/lib/spec-lib.mjs`) | 1 | навмисна | лишено: файл шаблону курсу, оновлюється `git cherry-pick` з шаблону; так само в демо |
| Дубль імені експорту `TemplateTask` (`src/lib/runs/rules.ts` ↔ `src/lib/templates/content.ts`) | 1 | хибна | лишено: два різні типи в різних модулях, barrel-реекспорту немає — неоднозначності немає |
| Дубль `src/app/globals.css` 111–148 ↔ 152–189 | 1 | навмисна | лишено: темні токени для `data-theme="dark"` і `data-theme="system"` під `@media` (DESIGN.md §9, ADR 0003); тест AC-DSYS-05 звіряє, що значення однакові |
| Дубль `check-design-tokens.mjs` ↔ `check-server-boundary.mjs` | 2 | справжня | лишено з поясненням: спільний обхід файлів двох наших перевірок; винести в `scripts/lib` — окремим PR |
| Складність у скриптах (`check-spec`, `create-demo-users` — шаблон; `check-writes-via-rpc`, `check-*` — WS7) | 10 | шаблон — навмисна; наші — справжня | лишено: скрипти покриті `tests/scripts/*`, але як дочірній процес, тож CRAP без покриття |
| Складність у сторінках і Server Actions (`runs/actions.ts`, `template-editor.tsx`, форма запуску…) | 13 | справжня | лишено: правила — у функціях бази з тестами PGlite (ADR 0002), сторінки — e2e; `ignore` не додано, щоб нова складність тут валила аудит |
| Складність `tests/db/supabase-pglite.ts` | 1 | навмисна | лишено: тестовий гарнес (джерело — демо курсу) |
| Гарячі точки, приховане зчеплення, цілі рефакторингу | — | інформаційне | не ворота |

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
| AC-DSYS-02 | [tests/e2e/editor-forbidden.spec.ts](../../tests/e2e/editor-forbidden.spec.ts) | passed | Haiku: PASS | **PASS** (R6) | [AC-DSYS-02-then-1.png](uat/2026-11-02/frames/AC-DSYS-02-then-1.png) |
| AC-DSYS-04 | [tests/e2e/runs-empty.spec.ts](../../tests/e2e/runs-empty.spec.ts) | passed | Haiku: PASS | **PASS** (R6) | [AC-DSYS-04-then-1.png](uat/2026-11-02/frames/AC-DSYS-04-then-1.png) |
| AC-DSYS-08 | [tests/e2e/return-after-sign-in.spec.ts](../../tests/e2e/return-after-sign-in.spec.ts) | passed | Haiku: PASS | **PASS** (R6) | [AC-DSYS-08-then-1.png](uat/2026-11-02/frames/AC-DSYS-08-then-1.png) |

- Звіт: [docs/qa/uat/2026-11-02/report.md](uat/2026-11-02/report.md) (і `manifest.json`, `frames/`) — прогін 02.11.2026
  14:41 (Київ) проти https://property-workflows-bravo16.vercel.app (`/api/health`: `a039c9c`), код тестів `task/uat` @
  `6d7afe6`, без незакомічених змін. Перед злиттям гілку перебазовано на `main` (після треку B): `tests/e2e/`,
  `playwright.config.ts` і `scripts/uat/` від цього не змінились — ті самі файли, що в PR треку C.
- Відео: вкладення в описі PR треку C (у git немає).
- Рецензент: `claude-haiku-5-5`; суперечки — `claude-sonnet-5-5` (у фінальному прогоні суперечок не було). Розбір —
  $0,0066 за цінами API.
- Негативний контроль (`npm run uat:nc`, 30.10.2026, на AC-DSYS-04): NC-1 — у твердженні навмисно інший текст
  («No runs yet. Create a template to start one.») → **FAIL** (R1; Haiku сказав PASS, але впале твердження агент не
  перекриває); NC-2 — в анотації `ac-text` змінено «Тоді» («… Create a template …»), тест і застосунок ті самі →
  **NEEDS-HUMAN** (R3; Haiku і Sonnet — FAIL).
- Дані: лише читання — усі три специфікації нічого не пишуть (без `@writes`); прибирання: синтетичних
  `uat-*@example.test` видалено 0, лишилось 0. Акаунти: `manager.c@example.test` (менеджер без жодного запуску —
  AC-DSYS-04, і менеджер B у AC-DSYS-02), `manager.a@example.test` (менеджер запуску «Apartment 12, move-in» —
  AC-DSYS-08), `admin@example.test` (лише перегляд стану шаблону до й після AC-DSYS-02).

Історія прогонів (чесно — що падало і чому):

| Прогін | AC-DSYS-02 | AC-DSYS-04 | AC-DSYS-08 | Що зроблено |
|---|---|---|---|---|
| 30.10, 16:02 | FAIL (R1) на «Дано»: у «Tenant move-in» на проді були незбережені зміни (від 26.10, розробка WS7) | PASS | NEEDS-HUMAN (R3): у видимих частинах тесту був email картки, на кадрі обрізаний «…» | вада даних: незбережені зміни шаблону прибрано (рядок `template_drafts`; версія лишилась 1); вада тесту: email — у перевірки |
| 30.10, 17:07 | NEEDS-HUMAN (R3): у видимих частинах — «Workspace» (CSS виводить великими) і обрізаний email | PASS | PASS | вада тесту: у видимих лише написи, що кадр показує дослівно |
| 02.11, 14:41 | **PASS** | **PASS** | **PASS** | фінальний звіт |

Вади продукту UAT не знайшов. Перед першими прогонами виправлено два збої скрипта рецензента з `materials/` на Windows
(`scripts/uat/review.mjs`; промпт і схема не змінені): `claude.cmd` не запускався через `spawn` (ENOENT), а `fs.cpSync`
мовчки валив процес на шляху з кирилицею.

### Приймання PM

| AC | Рішення PM | Посилання |
|---|---|---|
| AC-…-NN | <!-- ✅ / ❌ / NEEDS-HUMAN → … --> | <!-- коментар-підпис або issue «Відхилення від вимог» --> |

## D. Eval рецензента

- PR з вадами (не злитий): https://github.com/dmudryk/property-workflows/pull/36 (гілка `task/refactor-templates`,
  нейтральні коміти й опис; усі обов'язкові перевірки зелені — вади CI не ловить).
- Ключ і таблиця: https://github.com/dmudryk/property-workflows/pull/36#issuecomment-6579620905
- Рецензенти: CodeRabbit (профіль ASSERTIVE) і `/code-review high` у Claude Code (модель `claude-opus-5-5`); перший
  прогін — на коміті `606404b`.

| # | Вада (ключ) | CodeRabbit | `/code-review high` |
|---|---|---|---|
| 1 | логіка, межа з AC — `supabase/migrations/20261102135710_case_name_whitespace.sql:29`: `>= 100` замість `> 100` (AC-RUN-07, AC-RUN-11) | **знайшов** (Minor): «Замініть `>= 100` на `> 100` у перевірці довжини назви. Міграція відхиляє назву випадку з рівно 100 символами…» | **знайшов**: «The length guard changed from `> 100` to `>= 100`, so the database now rejects a case name of exactly 100 characters. That breaks AC-RUN-11…» |
| 2 | авторизація в дії — `src/app/templates/actions.ts:21`: перевірка ролі після `rpc("create_template")` | **знайшов, але знецінив** (Minor): «…запис виконується раніше за рішення про доступ», і водночас «Ця гіпотеза підтверджується лише для вузької гонки… Для стабільних ролей це не відбувається.» | **знайшов**: «The `canManageTemplates(actor)` check now runs after `supabase.rpc("create_template")`. A non-admin's write request reaches the database…» |
| 3 | тести, мок замість правила — `src/app/runs/actions.test.ts`: «AC-RUN-11» / «AC-RUN-07» на замоканому `rpc`, що завжди успішний | **пропустив**: лише Trivial «Перевірте назву RPC у моку `launch_run`. Мок `rpc` ігнорує перший аргумент `_name`.» | **знайшов**: «The new AC-RUN-11 test mocks `rpc` to always succeed… It never checks the value sent or exercises launch_run, so it reports coverage while the real database rejects this exact input.» |
| П | приманка: `src/lib/auth/next-path.ts` — перевірки в `isOtherSite` / `isSignInPage`, поведінка та сама | хибної тривоги немає (про файл нічого) | хибної тривоги немає: «No functional bug, just dead logic.» |

- Інші знахідки: CodeRabbit — «Передавайте в RPC очищену назву, а не початкову з форми» (слушна, вада існувала й до
  PR); `/code-review` — `btrim` у SQL і `trim()` у JS обрізають різні символи (слушна), сирий `caseName` у `rpc`
  (слушна), менеджер бачить помилку назви замість «not allowed» (слушна, наслідок вади 2), немає тесту
  `createTemplate` для менеджера (слушна — тому вада 2 пройшла CI), рядки `conformance.md` не оновлено (слушна).
  Шуму й хибних тривог — 0.
- Підсумок першого прогону: `/code-review high` — 3 з 3; CodeRabbit — 2 з 3 (вада 2 — як Minor із застереженням),
  пропустив ваду 3.
- Правило, що закриває пропуск (вада 3, CodeRabbit): рядок в `AGENTS.md` (його читають обидва рецензенти й агент, що
  пише код) — «AC, правило якого живе в базі… доводить лише тест бази на PGlite… Тест на замоканому `supabase.rpc`, що
  завжди повертає успіх… такого AC не доводить — у рев'ю це «must fix»» —
  https://github.com/dmudryk/property-workflows/pull/38 (`32ca689`).
- Повторний прогін (після `git merge main` у #36): `/code-review high` — знову 3 з 3, ваду 3 тепер обґрунтовує новим
  правилом: «The AC-RUN-11 and AC-RUN-07 tests run against a mocked `supabase.rpc` that always succeeds, but both limits
  live in SQL (launch_run). This breaks the project rule that a DB-held AC must be proved by a PGlite test.»
  CodeRabbit (`@coderabbitai full review`, рев'ю на `96b52ad`) — ваду 3 тепер **знайдено по суті**, але як Trivial, а не
  «must fix», як у правилі: «Додайте інтеграційні тести для межі довжини в БД. Мок `supabase.rpc` завжди повертає
  успіх. Тому AC-RUN-11 перевіряє лише поведінку дії та редирект.» Висновок: правило закрило пропуск, серйозність —
  нижча, ніж у правилі; наступний крок — path instruction у `.coderabbit.yaml` для `**/*.test.ts`. Коментар із
  повторним прогоном: https://github.com/dmudryk/property-workflows/pull/36#issuecomment-6580677567. PR #36 закрито
  без злиття.
