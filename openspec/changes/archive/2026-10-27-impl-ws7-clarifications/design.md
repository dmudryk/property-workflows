## Context

Уточнення PM від 2026-10-27 (зміна специфікації `update-ws7-clarifications`): 24 нові AC (AC-DSYS-05…08,
AC-EDITOR-10…29) і переформульовані AC-EDITOR-02, AC-EDITOR-03.

Стан після `impl-ws7-templates`:
- **Шаблони.** Зміст шаблону — jsonb-знімки версій (`template_versions`) і окрема admin-only таблиця незбережених змін
  (`template_drafts`), ADR 0002.
- **Запис.** Лише функціями `private`, ADR 0001; правило `check:writes`.
- **Редактор.** Автоматично зберігає кожну зміну.
- **Тема.** Темна тема — лише за системою (`prefers-color-scheme`), перемикача немає.

Частину нових AC код уже виконує — для них лише тести:
- 11 — `launch_run` відмовляє незбереженому шаблону;
- 12 — `publish_template_version` без незбережених змін нової версії не створює;
- 13, 14 — діалог видалення;
- 16 — RLS не показує менеджеру незбережений шаблон;
- 22 — `runs.template_name`;
- 26, 29 — гранти й RLS;
- 27 — перенесення у версію 1;
- 28 — `moveTask` між секціями.

## Goals / Non-Goals

**Goals:**
- Назва шаблону належить версії й унікальна.
- Порожні назви й секції без задач відхиляються під час збереження, а не під час автозбереження.
- Тексти порожніх станів і помилок — дослівно з AC.
- Незбережений шаблон недоступний у формі запуску.
- Стан змін — у фіксованому місці редактора.
- Вибір теми System / Light / Dark.
- Повернення на сторінку після входу.
- Тест на кожен новий AC.

**Non-Goals:** скасування незбережених змін (PM-Q1 у solomchaak/property-workflows-spec#20), обмеження довжини назв,
решта Non-goals `add-ws7-templates`.

## UI і компоненти

Усі сторінки — у спільному `AppShell`. Компоненти — лише з `@/components/ui`, кольори — лише токени `DESIGN.md`.
Тексти — дослівно з AC.

### U1. Редактор (AC-EDITOR-03, AC-EDITOR-13, AC-EDITOR-14, AC-EDITOR-20, AC-EDITOR-21, AC-EDITOR-25, AC-EDITOR-28)

- Поле «Template name» у шапці редактора — назва в незбережених змінах (AC-EDITOR-21).
- Поля назв секцій і задач приймають порожнє значення: воно лишається в незбережених змінах, а відмову
  «Every section and task needs a name» показує збереження (AC-EDITOR-20).
- Стан змін — в одному фіксованому місці смуги збереження:
  - «All changes kept» або «Saving…»;
  - якщо зміну не збережено — «Your last change was not kept. Try again.» токеном `destructive` з `role="alert"`;
  - правка лишається на екрані (AC-EDITOR-25).
- Повідомлення збереження «Version N saved» (AC-EDITOR-03), діалог видалення з назвою й «This cannot be undone»
  (AC-EDITOR-13, AC-EDITOR-14) і перенесення задачі між секціями (AC-EDITOR-28) — як є, з тестами логіки.

### U2. Сторінки шаблонів і версій (AC-EDITOR-02, AC-EDITOR-16, AC-EDITOR-17, AC-EDITOR-18, AC-EDITOR-19)

- `/templates`, порожній список — `EmptyState` (без таблиці) (AC-EDITOR-17):
  - адміністратор: «No templates yet. Create a template to start.» і посилання «Create a template»;
  - менеджер: «No templates yet. An administrator creates them.»
- `/templates/[id]`:
  - позначка кожної задачі — «required» чи «optional» (AC-EDITOR-02);
  - посилання «Launch» для збереженого шаблону (припущення PM);
  - шаблону, якого користувач не бачить, — «Template not found» без секцій і задач (AC-EDITOR-16).
- `/templates/[id]/versions` без версій — «No versions yet. Save the template to create version 1.» без таблиці
  (AC-EDITOR-18).
- `/templates/new` з порожньою назвою — «Enter a template name» (AC-EDITOR-19); назва зайнята —
  «A template with this name already exists» (AC-EDITOR-23).

### U3. Форма запуску (AC-EDITOR-10)

- `/runs/new` читає всі видимі шаблони (адміністратор — усі, менеджер — лише збережені, RLS).
- Чиста функція `src/lib/runs/launch-items.ts` будує пункти списку: незбережений шаблон — недоступний пункт
  (`disabled`) з приміткою «Save the template to launch it».
- `FormSelect` отримує поля пункту `disabled` і `note`.

### U4. Вибір теми (AC-DSYS-05, AC-DSYS-06, AC-DSYS-07) — ADR 0003

- **Де зберігається вибір.** Cookie `theme` = `system | light | dark`: на пристрої, рік (`max-age`), `path=/`,
  `SameSite=Lax`.
- **Як застосовується.** `src/app/layout.tsx` читає cookie (`cookies()`) і ставить `<html data-theme>`: без мерехтіння
  й без JS. За замовчуванням — `system`.
- **Токени в `globals.css`:**
  - темні значення — під `:root[data-theme="dark"]` і під `@media (prefers-color-scheme: dark)` для
    `:root[data-theme="system"]`;
  - `color-scheme` — за темою;
  - `@custom-variant dark` — та сама умова, бо `dark:` уже є в `ui/`.
  - Значення токенів не змінюються, тож контраст статусів у темній темі — з таблиці `DESIGN.md` (AC-DSYS-07).
- **Компонент.** `src/components/theme-select.tsx` — `FormSelect` з видимим підписом «Theme» (System / Light / Dark).
  Зміна пише cookie й `data-theme` без перезавантаження.
- **Де показано.** В `AppShell` — у картці користувача бічної панелі і на сторінці входу.

### U5. Повернення після входу (AC-DSYS-08)

- Proxy перенаправляє відвідувача на `/login?next=<шлях і query>`.
- Сторінка входу передає `next` прихованим полем.
- `login` після успішного входу — `redirect(safeNextPath(next) ?? "/")`:
  - `src/lib/auth/next-path.ts` пропускає лише відносний шлях `/…`;
  - не пропускає `//…`, `/\…` і абсолютні адреси (без відкритого перенаправлення).
- Якщо роль не дозволяє сторінку — та сама відмова, що й для користувача, який уже увійшов.

## Дані й RLS

Одна нова міграція `…_template_name_rules.sql`. Таблиць, політик і грантів не додаємо: функції — `create or replace` з
тими самими сигнатурами, тож гранти й обгортки `public.*` лишаються.

### R1. Назва шаблону в змісті (AC-EDITOR-21, AC-EDITOR-22, AC-EDITOR-24)

- **Незбережені зміни.** Зміст отримує необов'язковий ключ `name`. `private.normalize_template_content`:
  - лишає `name` (`btrim`);
  - назви секцій і задач нормалізує, але порожні не відкидає (AC-EDITOR-20).
- **Версія і запуск.**
  - `private.publish_template_version` пише у версію зміст з `name` (назва з незбережених змін або поточна);
  - `templates.name` = назва версії;
  - `private.launch_run` уже копіює `templates.name` у `runs.template_name`, тож запуск зберігає назву своєї версії
    (AC-EDITOR-22).

### R2. Перевірки збереження (AC-EDITOR-04, AC-EDITOR-15, AC-EDITOR-20, AC-EDITOR-24)

Порядок у `private.publish_template_version`. За будь-якої відмови версію не створено, незбережені зміни лишаються
(виняток функції відкочує транзакцію):

| # | Перевірка | Код помилки | AC |
|---|---|---|---|
| 1 | порожня назва шаблону | `EMPTY_TEMPLATE_NAME` | AC-EDITOR-19 — те саме правило назви |
| 2 | назва зайнята іншим шаблоном (`lower(btrim(name))`) | `NAME_TAKEN` | AC-EDITOR-24 |
| 3 | порожня назва секції чи задачі | `EMPTY_NAME` | AC-EDITOR-20 |
| 4 | секція без задач | `EMPTY_SECTION` | AC-EDITOR-15 |
| 5 | немає обов'язкової задачі | `NO_REQUIRED_TASK` | AC-EDITOR-04 |

Без незбережених змін нова версія не створюється, поточна лишається (AC-EDITOR-12).

### R3. Унікальна назва (AC-EDITOR-23, AC-EDITOR-24)

- `private.create_template` → `NAME_TAKEN`, якщо назва вже є без урахування регістру й пробілів (AC-EDITOR-23).
- Унікальний індекс `templates (lower(btrim(name)))` — захист від одночасних створень і збережень. На проді
  27.10 дублікатів немає (перевірено читанням).

### R4. Автор версії 1 перенесених шаблонів (припущення PM, solomchaak/property-workflows-spec#33)

- Версії 1 без автора (`created_by is null`, перенесені міграцією `templates_versions`) отримують автором першого
  адміністратора.
- У свіжій базі профілів немає — автор лишається порожнім.

### R5. Права — без змін (AC-EDITOR-11, AC-EDITOR-16, AC-EDITOR-26, AC-EDITOR-29)

| AC | Що вже захищає |
|---|---|
| 11 | `private.launch_run` — лише шаблон з поточною версією |
| 16 | `templates_select_visible` — менеджер бачить лише збережені шаблони |
| 26 | у `anon` немає `execute` на функції шаблонів і `select` на таблиці |
| 29 | `template_versions_select_admin`, `template_drafts_select_admin`; менеджер читає лише `templates.current_content` |

Загальне правило доступу PM (прямий запит відхиляється, нічого не змінює й не розкриває) так і реалізовано: база —
перша лінія, дії — друга.

## Auth

- `requireActor()` (`src/lib/auth/actor.ts`): `getClaims()` і роль з `profiles`; першим рядком кожної сторінки й дії.
  Без сесії — `redirect("/login")`: так прямий запит відвідувача до дії перенаправлено на вхід, а запису немає
  (AC-EDITOR-26).
- Proxy — лише UX: перенаправлення на вхід із `next` (AC-DSYS-08).
- Вхід — дія, що створює сесію (`signInWithPassword`), тож `next` проходить лише через `safeNextPath`.
- Тема — не дані користувача: cookie пише браузер, Server Action і запис у базу не потрібні.
- Admin-клієнт не потрібен.

## Тести

AC ID — на початку назви. Кожен відмовний тест перевіряє і відмову, і незмінні дані.

- **База** (`tests/db/templates.test.ts`, PGlite): AC-EDITOR-11, 12, 14, 15, 16, 19, 20, 21, 22, 23, 24, 26, 28, 29.
  - AC-EDITOR-27: `createTestDb` отримує хук «SQL перед міграцією X», тож тест вставляє запуск зрізу 1 до
    `templates_versions`.
- **Дії** (моки `next/navigation` і клієнта Supabase): AC-EDITOR-19 (порожня назва — без rpc), AC-EDITOR-26 (без
  сесії — перенаправлення на `/login`, rpc не викликано), AC-DSYS-08 (`login` → `next`).
- **Чисті функції й рендер:**
  - AC-EDITOR-02, 16, 17, 18 — рендер сторінок з моком `requireActor`;
  - AC-EDITOR-10 — `launch-items`;
  - AC-EDITOR-13 — логіка підтвердження;
  - AC-EDITOR-25 — текст стану змін;
  - AC-EDITOR-28 — `moveTask`;
  - AC-EDITOR-03 — повідомлення «Version N saved»;
  - AC-DSYS-05, 06 — `themeFromCookie`, `themeCookie`, `ThemeSelect`, правила `globals.css`;
  - AC-DSYS-07 — контраст пар `status-*` у темних токенах (OKLCH → sRGB → WCAG ≥ 4.5:1);
  - AC-DSYS-08 — proxy і `safeNextPath`.
- **Мутаційна перевірка** (локально, PGlite) — таблиця «AC → що прибрали → який тест упав» в описі PR задачі 1 для
  AC-EDITOR-11, 12, 23, 26, 29.

## Risks / Trade-offs

- Порожні назви в незбережених змінах — свідомо: так велить AC-EDITOR-20. Перевірка — під час збереження.
- Унікальний індекс упаде на базі з дублікатами назв; на проді їх немає, у `db-check` — свіжа база.
- Темні токени записано двічі (`data-theme="dark"` і «System» за темної системи). Тест AC-DSYS-05/06 перевіряє, що
  обидва блоки однакові.

## Migration Plan

- Міграцію застосовує `db-deploy` після merge PR задачі 1.
- Відкат — нова міграція (застосовані не редагуємо).
- Cookie теми не потребує міграції.
