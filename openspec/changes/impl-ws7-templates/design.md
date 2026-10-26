## Context

Зріз WS7 (`openspec/specs/template-editor`, `openspec/specs/design-system`). Стан після зрізу WS6: шаблони
(`templates`, `template_sections`, `template_tasks`) лише читаються, їх готує міграція; запуск копіює задачі шаблону в
`run_tasks` функцією `private.launch_run` (ADR 0001: запис — лише функціями `private`, `authenticated` має тільки
`select`). Дизайн-система (`DESIGN.md`, токени, `src/components/ui`, `AppShell`, `StatusBadge`) злита окремим PR
«Реалізація» дизайн-системи; цей план її використовує.

## Goals / Non-Goals

**Goals:** адміністратор створює шаблон і редагує секції й задачі з автоматичним збереженням; збереження створює
версію; менеджер бачить лише поточну версію; запуск фіксує й показує версію; права перевіряє база (RLS, гранти,
функції) і кожна дія на сервері; спільні статуси, відмови й порожні стани.

**Non-Goals:** усе з Non-goals `add-ws7-templates` (видалення шаблону, відкриття старішої версії, порівняння й
відновлення версій, одночасне редагування двома адміністраторами, імпорт, перемикач теми, керування користувачами).
Відкинути незбережені зміни (PM-Q1) — не робимо.

## UI і компоненти

Усі сторінки — у спільному `AppShell` (`src/components/app-shell.tsx`), компоненти — лише з `@/components/ui`, кольори
— лише токени `DESIGN.md`. Тексти станів — дослівно з AC.

### U1. Сторінки шаблонів (AC-EDITOR-01, AC-EDITOR-02, AC-EDITOR-05, AC-EDITOR-07, AC-DSYS-02)

| Маршрут | Хто | Що показує |
|---|---|---|
| `/templates` | `manager`, `admin` | `Table`: назва, «Version N» (поточна) або «—»; адміністратор — усі шаблони + `StatusBadge` «Unpublished changes», де є незбережені зміни, і кнопка «New template»; менеджер — лише шаблони з поточною версією (дані фільтрує RLS) |
| `/templates/new` | `admin` | форма назви (`Input` + `Label`), «Create»; не-адміністратор — `NotEnoughRights` |
| `/templates/[id]` | `manager`, `admin` | поточна версія: «Version N», секції із задачами й позначкою «required»/«optional» (AC-EDITOR-02); адміністратор додатково — `StatusBadge` «Unpublished changes» (AC-EDITOR-01) і посилання «Edit», «Versions» |
| `/templates/[id]/edit` | `admin` | редактор (U2); менеджер — `NotEnoughRights`: «Not enough rights» + посилання «Back to templates», без вмісту (AC-DSYS-02) |
| `/templates/[id]/versions` | `admin` | `Table` версій: «Version N», дата «DD.MM.YYYY HH:MM» за Києвом, email автора (або «—»), від новішої (AC-EDITOR-05); менеджер — `NotEnoughRights` без версій (AC-EDITOR-07) |

`NotEnoughRights` (`src/components/not-enough-rights.tsx`) — `Card` з повідомленням «Not enough rights» і посиланням
«Back to templates» у тій самій розкладці, що й інші сторінки. Навігація `AppShell`: «Runs», «Templates».

### U2. Редактор з автоматичним збереженням (AC-EDITOR-01, AC-EDITOR-03, AC-EDITOR-04)

`src/app/templates/[id]/edit/template-editor.tsx` (`"use client"`) тримає зміст шаблону в стані. Операції — чисті
функції `src/lib/templates/content.ts`: додати / перейменувати / перемістити вгору-вниз / прибрати секцію чи задачу,
перемкнути «required». Кожна структурна зміна одразу зберігається Server Action `saveDraft`; перейменування — після
паузи ~600 мс і при виході з поля. Стан збереження — текст «Saving…» / «All changes kept». «Save version» (основна дія,
`Button` default) спершу дочікується `saveDraft`, потім викликає `publishVersion`. Помилка «A template needs at least
one required task» — `Alert` (destructive) над редактором; зміст і позначка «Unpublished changes» лишаються
(AC-EDITOR-04). Повідомлення успіху після збереження — до відповіді PM на Q5 не обов'язкове.

### U3. Запуски (AC-EDITOR-06, AC-DSYS-01, AC-DSYS-04)

- `/runs/[id]`: рядок «Template version N» з `runs.template_version` (AC-EDITOR-06); статус запуску — `StatusBadge`
  (AC-DSYS-01).
- `/runs`: статус — `StatusBadge`; порожній стан — «No runs yet. Launch a template to start one.» і посилання
  «Launch a template», без `Table` (AC-DSYS-04). Вибір стану (таблиця / порожній стан) — чиста функція, щоб її тестувати.
- `/runs/new`: список шаблонів — лише з поточною версією; задачі й секції — з поточної версії.
- `/login`: той самий `AppShell` без даних користувача (AC-DSYS-03).

### U4. Рішення до відповідей PM (не в специфікації)

- Запуск шаблону без жодної версії неможливий: його немає у формі запуску, а функція запуску відхиляє його
  (solomchaak/property-workflows-spec#21; глосарій: «a run is never launched from them»).
- «Save version» без незбережених змін нічого не створює (solomchaak/property-workflows-spec#22).
- Секцію без задач можна зберегти; у запуску вона не з'являється, бо запуск копіює задачі
  (solomchaak/property-workflows-spec#24).
- Порожня назва шаблону, секції чи задачі не зберігається: поле повертає попередню назву
  (solomchaak/property-workflows-spec#28); перейменування шаблону в зрізі немає (solomchaak/property-workflows-spec#29).
- Порожні списки шаблонів і версій — текст без таблиці (solomchaak/property-workflows-spec#27, Q7); тексти — до
  відповіді PM.
- Версія 1 наявних шаблонів створюється міграцією без автора — у списку версій «—» замість email (Q6,
  solomchaak/property-workflows-spec#33); наявні запуски — на версії 1.

## Дані й RLS

Одна нова міграція `supabase/migrations/<timestamp>_templates_versions.sql`. Правила — `AGENTS.md` → «База даних»:
RLS на кожній таблиці, `revoke all … from anon, authenticated`, явні `grant`, окрема політика на кожну операцію
`to authenticated`, хелпери й привілейовані функції — у `private`, `security definer`, `set search_path = ''`.

### R1. Зміст шаблону — jsonb (AC-EDITOR-01, AC-EDITOR-03)

Формат: `{"sections":[{"id","name","tasks":[{"id","name","required"}]}]}`. Порядок масивів — порядок секцій і задач.
`private.normalize_template_content(jsonb)` перебудовує зміст лише з відомих ключів, перевіряє типи (`uuid`, `text`,
`boolean`), обрізає пробіли й відкидає порожні назви — у базу не потрапляє довільний jsonb.

### R2. Таблиці

| Таблиця | Колонки | Політики (`to authenticated`) | Гранти `authenticated` |
|---|---|---|---|
| `templates` (наявна) | + `current_version int null`, `current_content jsonb null` | `templates_select_visible` (select): `admin` — усі; `manager` — лише `current_version is not null` (AC-EDITOR-02) | `select`; запису немає |
| `template_versions` (нова) | `template_id`, `number`, `content jsonb`, `created_at`, `created_by → profiles null`; PK `(template_id, number)` | `template_versions_select_admin` (select): лише `admin` (AC-EDITOR-05, AC-EDITOR-07) | `select`; запису немає |
| `template_drafts` (нова, «Unpublished changes») | `template_id` PK → `templates`, `content jsonb`, `updated_at`, `updated_by` | `template_drafts_select_admin` (select): лише `admin` (AC-EDITOR-01, AC-EDITOR-02) | `select`; запису немає |
| `runs` (наявна) | + `template_version int not null` (наявні запуски — 1), FK `(template_id, template_version) → template_versions` | без змін (`runs_select_visible`) | без змін |

- Незбережені зміни — окрема таблиця, а не колонка в `templates`: RLS ховає рядки, а не колонки, тож колонку менеджер
  побачив би разом із шаблоном.
- `template_versions` і `template_drafts` для менеджера порожні: йому досить `templates.current_content`.
- Політик `insert`/`update`/`delete` і грантів на запис немає (ADR 0001): `authenticated` пише лише через функції R3;
  прямий запис — `permission denied` (AC-EDITOR-08).
- `anon`: `revoke all` на всіх таблицях і `revoke execute` на всіх функціях (AC-EDITOR-09, AC-DSYS-03).
- Перенесення: для кожного наявного шаблону — версія 1 зі змісту `template_sections`/`template_tasks` (зі старими id
  задач, `created_by null`), `current_version = 1`; наявні запуски — `template_version = 1`; потім
  `drop table template_tasks, template_sections` (ризик — в описі PR; єдиний споживач — `src/app/runs/new/page.tsx`).

### R3. Функції запису (AC-EDITOR-01, AC-EDITOR-03, AC-EDITOR-04, AC-EDITOR-08)

Кожна — `private.*`, `security definer`, `set search_path = ''`; перша перевірка —
`auth.uid() is null or private.current_app_role() is distinct from 'admin'` → `NOT_ALLOWED` (`42501`; для `anon` роль —
`null`, тож порівняння `<>` не спрацювало б). Тонкі обгортки `public.*` — `security invoker`; `revoke execute … from
public, anon`, `grant execute … to authenticated`.

| Функція | Що робить |
|---|---|
| `create_template(p_name text) → uuid` | новий шаблон без версії з порожніми незбереженими змінами |
| `save_template_draft(p_template_id uuid, p_content jsonb)` | upsert `template_drafts` нормалізованим змістом (R1), `updated_by = auth.uid()` |
| `publish_template_version(p_template_id uuid) → int` | `select … for update` шаблону; немає незбережених змін — повертає поточну версію; немає жодної обов'язкової задачі — `NO_REQUIRED_TASK` (`22023`), нічого не змінено (AC-EDITOR-04); інакше insert версії `max(number) + 1`, update `templates.current_version/current_content`, delete незбережених змін (AC-EDITOR-03) |

### R4. Запуск з поточної версії (AC-EDITOR-06, AC-RUN-01, AC-RUN-02, AC-RUN-12)

`private.launch_run(uuid, text, jsonb)` — `create or replace` з тією самою сигнатурою (гранти й обгортка не
змінюються): читає `templates.current_content`, перевіряє `current_version is not null` (`TEMPLATE_NOT_FOUND`), копіює
секції й задачі в `run_tasks` (`position = секція * 1000 + задача`) і пише `runs.template_version`. Призначення
виконавців — за id задач зі змісту версії, як і раніше.

## Auth

- **Вхід.** `src/proxy.ts` лише перенаправляє відвідувача без сесії на `/login` — це UX, а не захист (AC-EDITOR-09,
  AC-DSYS-03). Дані захищають RLS і гранти (R2) і перевірка в кожній сторінці й дії.
- **Сторінки й Server Actions.** `requireActor()` переноситься з `src/app/runs/actor.ts` у `src/lib/auth/actor.ts`:
  `supabase.auth.getClaims()` (не `getSession()`) → без claims — `redirect("/login")`; роль — з `public.profiles` за
  `claims.sub`, ніколи з `user_metadata`. Кожна сторінка шаблонів і кожна дія (`createTemplate`, `saveDraft`,
  `publishVersion`) викликає її першою; для дій `role !== "admin"` → `not_allowed` без жодного запиту на запис
  (AC-DSYS-02, AC-EDITOR-07, AC-EDITOR-08). Друга лінія — функції бази (R3) з власною перевіркою ролі.
- **Admin-клієнт** (`SUPABASE_SECRET_KEY`) **не потрібен**: усі дії виконуються від імені користувача під RLS; у Vercel
  ключа немає, `npm run check:boundary` охороняє це правило.
- **Ролі не змінюються** в цьому зрізі: набір ролей (`manager`, `admin`) той самий, міграції ролей немає; акаунти для
  приймання — `supabase/demo-users.json`.

## Тести й мутаційна перевірка

- Тести бази — PGlite (`tests/db/supabase-pglite.ts`, адаптовано з демо курсу; `asUser`, `asAnon`, `asService`) у
  `tests/db/templates.test.ts`: на кожен відмовний AC — відмова **і** незмінні дані (AC-EDITOR-02, AC-EDITOR-07,
  AC-EDITOR-08, AC-EDITOR-09, AC-DSYS-02, AC-DSYS-03) і успішні сценарії бази (AC-EDITOR-01, AC-EDITOR-03,
  AC-EDITOR-04, AC-EDITOR-05, AC-EDITOR-06).
- Чисті функції й рендер: `src/lib/templates/content.test.ts`, `src/lib/templates/format.test.ts` (дата за Києвом),
  `src/lib/status.test.ts` і тест рендеру порожнього стану, статусів і `AppShell` (AC-DSYS-01, AC-DSYS-03,
  AC-DSYS-04).
- Мутаційна перевірка (лише нова міграція PR): прибрати перевірку ролі в `private.save_template_draft` → червоніє
  AC-EDITOR-08; політика читання `template_versions` для `manager` → червоніє AC-EDITOR-07. Червоні прогони CI — в
  описі PR, потім revert.

## Risks / Trade-offs

- `drop` старих таблиць шаблонів — деструктивна зміна: дані переносяться у версію 1 у тій самій міграції; `db-check`
  проганяє всі міграції на чистій базі.
- Зміст у jsonb не має зовнішніх ключів на задачі: цілісність тримає `normalize_template_content`.
- Автозбереження кожної зміни — більше запитів; для одного адміністратора в навчальному проєкті прийнятно.

## Migration Plan

Міграцію застосовує `db-deploy` після merge PR задачі 1; відкат — нова міграція (застосовані не редагуємо).
