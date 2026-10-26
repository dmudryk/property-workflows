# Дизайн-система: Property Workflows

- **Джерело:** AI-чат: Claude Code (агент у цьому репо), промпт — в описі PR дизайн-системи.
- **Вхід від PM:** розділ «Вигляд і тон» у `requirements/product.md` (знімок 2026-10-26) і
  `requirements/19-use-one-design-system.md` (AC-DSYS-01…04).
- **Код:** токени — `src/app/globals.css`; компоненти — `src/components/ui/` (shadcn/ui); спільні блоки сторінок —
  `src/components/`; перевірка — `npm run check:design`.

## 1. Огляд

Внутрішній застосунок агенції з управління нерухомістю: адміністратор налаштовує шаблони процесів, менеджери
запускають їх для випадків і відмічають задачі. Працюють переважно за ноутбуком, інколи з телефона. Тон — **спокійний,
діловий, точний**: без жартів, знаків оклику, звинувачень («You made a mistake») і жаргону. Пріоритет — **щільність**:
менеджер переглядає багато запусків одразу, тож таблиці щільні, але читабельні на телефоні. Інтерфейс — англійською;
тексти з AC PM — дослівно.

## 2. Кольори

Семантичні токени з іменами shadcn/ui. Значення — OKLCH. У сторінках — лише утиліти з колонки «Клас», ніколи hex,
`bg-[#…]` чи сирі палітри (`zinc-500`, `bg-white`). Темна тема — за системою (`prefers-color-scheme`); перемикача немає
(темна тема в PM — поза межами зрізу, тож вона лише не повинна ламатися).

**Правила за змістом («Вигляд і тон»):**
- `primary` (фіолетовий) — **лише основна дія екрана** (Launch, Save, Sign in): одна на екран, ні для чого іншого,
  не для статусів і не для посилань у тексті.
- `destructive` (червоний) — помилки й небезпечні дії; небезпечна дія завжди з підтвердженням і текстом
  «This cannot be undone».
- Статуси — власні токени `status-*`, кожен із текстом поруч: «to do» — нейтральний сірий, «in progress» — синій,
  «done» і «completed» — зелений, «Unpublished changes» — теплий жовтий.

| Токен | Для чого | Світла | Темна | Клас |
|---|---|---|---|---|
| `background` / `foreground` | тло сторінки й основний текст | `oklch(0.985 0.002 260)` / `oklch(0.21 0.02 260)` | `oklch(0.17 0.012 260)` / `oklch(0.96 0.005 260)` | `bg-background`, `text-foreground` |
| `card` / `card-foreground` | картки, панелі, таблиці | `oklch(1 0 0)` / `oklch(0.21 0.02 260)` | `oklch(0.21 0.014 260)` / `oklch(0.96 0.005 260)` | `bg-card`, `text-card-foreground` |
| `popover` / `popover-foreground` | меню, діалоги | як `card` | як `card` | `bg-popover`, `text-popover-foreground` |
| `primary` / `primary-foreground` | основна дія (одна на екран) | `oklch(0.47 0.19 295)` / `oklch(0.99 0 0)` | `oklch(0.74 0.14 295)` / `oklch(0.18 0.04 295)` | `bg-primary`, `text-primary-foreground` |
| `secondary` / `secondary-foreground` | другорядна дія | `oklch(0.955 0.006 260)` / `oklch(0.25 0.02 260)` | `oklch(0.28 0.015 260)` / `oklch(0.96 0.005 260)` | `bg-secondary`, `text-secondary-foreground` |
| `muted` / `muted-foreground` | приглушене тло, підписи, допоміжний текст | `oklch(0.965 0.005 260)` / `oklch(0.46 0.02 260)` | `oklch(0.26 0.014 260)` / `oklch(0.76 0.015 260)` | `bg-muted`, `text-muted-foreground` |
| `accent` / `accent-foreground` | наведення, вибраний рядок | `oklch(0.95 0.01 260)` / `oklch(0.25 0.02 260)` | `oklch(0.29 0.016 260)` / `oklch(0.96 0.005 260)` | `bg-accent`, `text-accent-foreground` |
| `destructive` | помилка, небезпечна дія | `oklch(0.52 0.2 27)` | `oklch(0.71 0.17 25)` | `bg-destructive`, `text-destructive` |
| `border` | розділювачі, межі карток | `oklch(0.9 0.008 260)` | `oklch(0.32 0.014 260)` | `border-border` |
| `input` | межа поля вводу | `oklch(0.6 0.02 260)` | `oklch(0.56 0.015 260)` | `border-input` |
| `ring` | кільце фокусу | `oklch(0.47 0.19 295)` | `oklch(0.74 0.14 295)` | `ring-ring` |
| `status-todo` / `-foreground` | статус задачі «to do» (сірий) | `oklch(0.94 0.006 260)` / `oklch(0.36 0.015 260)` | `oklch(0.3 0.012 260)` / `oklch(0.9 0.01 260)` | `bg-status-todo`, `text-status-todo-foreground` |
| `status-progress` / `-foreground` | статус запуску «in progress» (синій) | `oklch(0.93 0.045 250)` / `oklch(0.42 0.15 258)` | `oklch(0.32 0.07 255)` / `oklch(0.89 0.06 250)` | `bg-status-progress`, `text-status-progress-foreground` |
| `status-done` / `-foreground` | «done» і «completed» (зелений) | `oklch(0.93 0.06 150)` / `oklch(0.4 0.11 150)` | `oklch(0.32 0.06 150)` / `oklch(0.89 0.08 150)` | `bg-status-done`, `text-status-done-foreground` |
| `status-unpublished` / `-foreground` | «Unpublished changes» (теплий жовтий) | `oklch(0.94 0.09 92)` / `oklch(0.42 0.09 65)` | `oklch(0.34 0.06 80)` / `oklch(0.93 0.09 92)` | `bg-status-unpublished`, `text-status-unpublished-foreground` |

### Контраст

Пораховано за WCAG 2.x (OKLCH → sRGB → відносна яскравість). Текст ≥ 4.5:1, межі полів і фокус ≥ 3:1.

| Пара | Світла | Темна | Норма |
|---|---|---|---|
| `foreground` на `background` | 17.0 | 17.0 | ≥ 4.5 |
| `card-foreground` на `card` | 17.7 | 15.8 | ≥ 4.5 |
| `muted-foreground` на `background` | 6.8 | 8.9 | ≥ 4.5 |
| `muted-foreground` на `card` | 7.1 | 8.3 | ≥ 4.5 |
| `muted-foreground` на `muted` | 6.4 | 7.2 | ≥ 4.5 |
| `primary-foreground` на `primary` | 7.3 | 7.9 | ≥ 4.5 |
| `secondary-foreground` на `secondary` | 14.0 | 13.0 | ≥ 4.5 |
| `accent-foreground` на `accent` | 13.8 | 12.6 | ≥ 4.5 |
| `destructive` на `card` | 6.1 | 6.4 | ≥ 4.5 |
| `destructive` на `background` | 5.9 | 6.9 | ≥ 4.5 |
| `status-todo-foreground` на `status-todo` | 9.1 | 10.1 | ≥ 4.5 |
| `status-progress-foreground` на `status-progress` | 7.0 | 9.2 | ≥ 4.5 |
| `status-done-foreground` на `status-done` | 7.3 | 9.2 | ≥ 4.5 |
| `status-unpublished-foreground` на `status-unpublished` | 7.3 | 9.6 | ≥ 4.5 |
| `input` на `card` | 3.9 | 3.8 | ≥ 3 |
| `input` на `background` | 3.8 | 4.1 | ≥ 3 |
| `ring` на `background` | 7.2 | 7.9 | ≥ 3 |
| `ring` на `card` | 7.5 | 7.4 | ≥ 3 |

## 3. Типографіка

Шрифт — Geist (`next/font`, `--font-sans`). Дрібного сірого тексту немає: найменший розмір — `text-sm`.

| Роль | Клас | Де |
|---|---|---|
| Заголовок сторінки | `text-2xl font-semibold` | один на сторінку, першим у `main` |
| Заголовок розділу | `text-lg font-semibold` | секції запуску й шаблону, картки |
| Основний текст | `text-sm` (таблиці, форми), `text-base` (повідомлення стану) | рядки таблиць, поля |
| Підпис, допоміжний текст | `text-sm text-muted-foreground` | назва шаблону в рядку, email виконавця |
| Числа (прогрес, дати) | `tabular-nums` | «2 of 5 done», «12.10.2026 14:05» |

## 4. Відступи й радіуси

- Ширина контенту — `max-w-4xl`, бічні відступи `px-4 sm:px-6`; між блоками сторінки — `gap-6`, усередині картки —
  `gap-4`, між полями форми — `gap-4`, між підписом і полем — `gap-2`.
- Рядок таблиці — щільний: `py-2` (за замовчуванням `Table`).
- Радіус — `--radius: 0.5rem`; картки `rounded-lg`, поля й кнопки `rounded-md`, бейджі статусів `rounded-full`.
- На вузькому екрані (`< sm`) першими лишаються назва випадку, статус і прогрес; другорядні колонки (назва шаблону)
  переносяться під назву випадку.

## 5. Компоненти й варіанти

Лише з `@/components/ui`. Новий компонент — `npx shadcn@4.22.1 add <назва>`; власних кольорів у компонентах не
вигадуємо.

| Компонент | Варіанти | Правило |
|---|---|---|
| `Button` | `default`, `secondary`, `outline`, `ghost`, `destructive`, `link` | `default` (primary) — одна основна дія на екран (Launch, Save, Sign in); решта дій — `outline` чи `secondary`; `destructive` — лише з підтвердженням; текст починається з дієслова |
| `Input` + `Label` | — | у кожного поля `Label` з `htmlFor`; placeholder — не замість підпису |
| `Card` | `CardHeader`, `CardTitle`, `CardContent` | форма запуску, секції запуску й шаблону, повідомлення стану |
| `Table` | — | списки запусків і версій; перша колонка — назва випадку; без порожньої таблиці (порожній стан замість неї) |
| `Badge` | через `StatusBadge` (`src/components/status-badge.tsx`) | статус — завжди слово + колір токена `status-*`; один і той самий статус однаковий на всіх сторінках |
| `Alert` | `default`, `destructive` | помилка дії (`destructive`) над формою; текст — дослівно з AC |
| `Dialog` | — | підтвердження незворотної дії з текстом «This cannot be undone» |
| `Select` | — | вибір шаблону й виконавця у формі запуску |

## 6. Стани

| Стан | Як виглядає | Приклад тексту |
|---|---|---|
| Порожній список | текст `text-base` + посилання на наступну дію, **без порожньої таблиці** | «No runs yet. Launch a template to start one.» + «Launch a template» (AC-DSYS-04) |
| Помилка дії | `Alert` (destructive) над формою; введене лишається у формі; нічого не записано | «Enter a case name», «A template needs at least one required task» |
| Відмова в доступі | та сама розкладка сторінки, повідомлення й посилання назад, без даних | «Not enough rights» + «Back to templates» (AC-DSYS-02); «Run not found» (AC-TASK-10) |
| Не увійшов | сторінка входу в тій самій розкладці, без даних | (AC-DSYS-03) |
| Успіх | короткий текст поруч із результатом, без спливних вікон | «Version 2 saved» |
| Незбережені зміни | `StatusBadge` «Unpublished changes» (теплий жовтий) біля назви шаблону | «Unpublished changes» |
| Вимкнена дія | дію не показуємо, якщо роль її не має (перевірка — на сервері) | — |

## 7. Доступність — мінімум

- Label у кожного поля; помилка поля пов'язана з полем (`aria-describedby`), повідомлення помилки — `role="alert"`.
- Видимий фокус: `ring` на кожному інтерактивному елементі; Tab проходить форму по порядку.
- Контраст — таблиця в розділі 2.
- Статус ніколи не лише кольором — поруч завжди текст.
- Спершу семантичний HTML (`<button>`, `<table>`, `<label>`); `aria-*` — там, де HTML бракує, а не замість нього.
- Іконок без підпису немає.

## 8. Do / Don't

| ✅ Робимо | ❌ Не робимо |
|---|---|
| `bg-primary text-primary-foreground` | `bg-zinc-900 text-white`, `bg-[#…]`, `style={{ color: "#…" }}` |
| компонент `Button` з потрібним варіантом | власний `<button className="…">` у сторінці |
| `StatusBadge` для кожного статусу | статус лише кольором або «свій» бейдж на окремій сторінці |
| порожній стан текстом і посиланням | порожня таблиця з заголовками |
| новий токен через розділ 9 | новий колір «лише для цієї сторінки» |
| `primary` лише для основної дії | `primary` для посилань, статусів, декору |
| спокійні тексти без знаків оклику | яскраві градієнти, декоративна анімація, спливні вікна для рутинної інформації |

## 9. Як додати токен

1. Опишіть токен у таблиці розділу 2: для чого, значення в обох темах, контраст.
2. `src/app/globals.css`: `--<назва>` у `:root` і в `@media (prefers-color-scheme: dark)`.
3. `--color-<назва>: var(--<назва>);` у `@theme inline` → з'являються класи `bg-<назва>`, `text-<назва>`, `border-<назва>`.
4. `npm run check:design` і знімок сторінки у світлій і темній темі.

## 10. Перевірка

- `npm run check:design` — жодного hex, довільного кольору, сирої палітри чи кольору в inline style поза
  `src/components/ui` і `globals.css`. CI: `.github/workflows/architecture.yml`, job «Дизайн-система: лише токени».
- Виняток — коментар `design-ok: <причина>` у тому самому рядку; кожен виняток — з реальною причиною.
- Візуально: знімки ключових сторінок у світлій і темній темі (`docs/img/ws7-*`), Tab по формі, контраст.
