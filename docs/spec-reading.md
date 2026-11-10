# Журнал читання вимог

<!--
Ваш журнал — один файл: скан вимог PM за таксономією, питання до PM і власні припущення. Скіл spec-clarify заповнює його
за структурою нижче. Комітите в PR «Специфікація» (разом зі зміною специфікації, яку ці питання стосуються).
Питання до PM — issues у репо вимог PM через вебформу «Питання до вимог»
(https://github.com/<pm>/<team-slug>-spec/issues/new?template=question.yml; форма ставить мітку question) з повною
адресою вимоги (issue PM або шлях docs/requirements/… у репо PM) і AC. Тут, у вашому репо, голе #7 — ваш власний issue
чи PR, тому вимогу пишіть як <pm>/<team-slug>-spec#7 або файлом знімка requirements/7-….md. Перед новим issue
перегляньте наявні в репо PM: якщо таке питання вже є — коментар із новим випадком там, а не дублікат.
Для PM це матеріал нотатки «порівняння реалізацій»: де одні вимоги прочитали по-різному.
-->

Вимоги: solomchaak/property-workflows-spec · джерело: issues · знімок 2026-10-20

## Скан за таксономією

| # | Категорія | Статус | Де |
|---|---|---|---|
| 1 | Функціональний обсяг | Частково | межі зрізу й Non-goals чіткі (solomchaak/property-workflows-spec#2, #3); чи входить керування користувачами — solomchaak/property-workflows-spec#14 |
| 2 | Ролі й доступ | Частково | AC-TASK-03 — що бачить менеджер C за прямим посиланням (solomchaak/property-workflows-spec#4); AC-RUN-04 — що менеджер бачить про інших користувачів (solomchaak/property-workflows-spec#5); AC-TASK-09 — список адміністратора (solomchaak/property-workflows-spec#12); AC-TASK-09 — чи бачить прогрес у списку виконавець, який не є менеджером запуску (Q3) |
| 3 | Домен і модель даних | Частково | AC-RUN-02, AC-TASK-04 — чи фіксує запуск позначку «required»/«optional» на момент запуску (Q1); секції в запуску (solomchaak/property-workflows-spec#7); повторний запуск для того самого випадку (solomchaak/property-workflows-spec#8) |
| 4 | Потік взаємодії (UX) | Частково | AC-TASK-06, AC-TASK-09 — завершені запуски в списку (solomchaak/property-workflows-spec#10); AC-TASK-08 — позначка обов'язкових задач (solomchaak/property-workflows-spec#11); підтвердження остаточної позначки «done» (solomchaak/property-workflows-spec#15) |
| 5 | Нефункціональні вимоги | Частково | час — київський (Ясно); аудит «хто і коли позначив задачу» — Немає: позначити може виконавець, менеджер запуску чи адміністратор (AC-TASK-01, AC-TASK-02, AC-TASK-07), але не сказано, чи це видно (Q2) |
| 6 | Інтеграції й обмеження платформи | Ясно | листів немає, запрошення — посилання; розклад частіше разу на добу й облікова система — поза scope (requirements/product.md) |
| 7 | Граничні випадки й збої | Частково | повторна позначка «done» — Ясно (припущення PM); пробіли навколо назви перед перевіркою 100 символів (solomchaak/property-workflows-spec#6); зміна шаблону під час заповнення форми (solomchaak/property-workflows-spec#9); необов'язкова задача після «completed» — відкрите питання PM Q1 у solomchaak/property-workflows-spec#3, поза зрізом |
| 8 | Обмеження й компроміси | Ясно | назва випадку 1–100 символів (AC-RUN-03, AC-RUN-07); виконавців задають лише під час запуску; позначка «done» остаточна |
| 9 | Термінологія | Ясно | глосарій із 13 термінів і «Avoid» (requirements/product.md); мова статусів і повідомлень — solomchaak/property-workflows-spec#13 |
| 10 | Сигнали завершеності | Ясно | у кожному AC — числа (5 задач, 3 обов'язкові, 101 символ, «2 of 5 done») і точні тексти повідомлень (AC-RUN-03, AC-RUN-07, AC-TASK-03) |
| 11 | Заглушки й розмиті слова | Ясно | «швидко», «зручно», «тощо» без меж не знайдено |

## Питання до PM

| # | AC / вимога | Питання | Рекомендація | Issue в репо PM | Відповідь PM | Рішення (що зробили) |
|---|---|---|---|---|---|---|
| Q1 | AC-RUN-02, AC-TASK-04 (solomchaak/property-workflows-spec#2, #3) | Якщо після запуску адміністратор змінив у шаблоні позначку «required»/«optional» задачі, за якими позначками рахується завершення наявного запуску? | A: за позначками на момент запуску | solomchaak/property-workflows-spec#16 | очікуємо | у специфікації — текст PM; питання в Open questions; AC-RUN-02, AC-TASK-04 у матриці — «відкладено (чекає реалізації)» |
| Q2 | AC-TASK-01, AC-TASK-02, AC-TASK-07, AC-TASK-08 (solomchaak/property-workflows-spec#3) | Чи показує сторінка запуску, хто і коли позначив задачу «done»? | B: для задачі «done» видно, хто і коли її позначив | solomchaak/property-workflows-spec#17 | очікуємо | у специфікації — текст PM; питання в Open questions; у матриці — «відкладено (чекає реалізації)» |
| Q3 | AC-TASK-09, AC-TASK-06 (solomchaak/property-workflows-spec#3) | Чи бачить прогрес «N of M done» у списку запусків виконавець, який не є менеджером запуску? | A: так, кожен, хто бачить запуск у списку, бачить його прогрес | solomchaak/property-workflows-spec#18 | очікуємо | у специфікації — текст PM; питання в Open questions; у матриці — «відкладено (чекає реалізації)» |

## Власні припущення

- Тексти повідомлень і статусів у специфікації — дослівно як у PM (англійською), доки PM не відповість на
  solomchaak/property-workflows-spec#13.
- Питання, які вже поставили інші розробники (solomchaak/property-workflows-spec#4–#15), не дублюю: вони в Open
  questions зміни `add-ws6-runs` з посиланнями.

## Що пропустив би без скіла / що скіл знайшов зайве

Без скану за таксономією я б не помітив категорію «аудит» (Q2): AC дозволяють позначити задачу трьом різним людям, але
ніде не сказано, чи видно, хто це зробив. Більшість інших неоднозначностей (пробіли в назві, секції, повторний запуск)
колеги вже поставили — скіл допоміг не створювати дублікатів.

---

# Зріз 2 (WS7): редактор шаблонів з версіями й одна дизайн-система

Вимоги: solomchaak/property-workflows-spec · джерело: issues · знімок 2026-10-27 (уточнення PM; перший знімок зрізу — 2026-10-26)

Вимоги зрізу: `requirements/20-edit-a-template-with-version-control.md` (solomchaak/property-workflows-spec#20,
AC-EDITOR-01…09), `requirements/19-use-one-design-system.md` (solomchaak/property-workflows-spec#19, AC-DSYS-01…04),
матриця прав у `requirements/product.md` (solomchaak/property-workflows-spec#1).

## Скан за таксономією (зріз 2)

| # | Категорія | Статус | Де |
|---|---|---|---|
| 1 | Функціональний обсяг | Ясно | «Поза межами» solomchaak/property-workflows-spec#19 і #20; відкинути незбережені зміни — PM-Q1 у solomchaak/property-workflows-spec#20 (поза зрізом) |
| 2 | Ролі й доступ | Частково | AC-EDITOR-07 і AC-EDITOR-02 — лише сторінки; немає AC на прямий запит менеджера, що читає старіші версії чи незбережені зміни (продукт: «…or see its versions… by sending the request directly») — Q4; анонім змінює напряму — solomchaak/property-workflows-spec#32; менеджер відкриває незбережений шаблон за посиланням — solomchaak/property-workflows-spec#26 |
| 3 | Домен і модель даних | Частково | версія 1 наявних шаблонів і запусків зрізу 1 — solomchaak/property-workflows-spec#33 (+ Q6 про список версій); порожня секція — solomchaak/property-workflows-spec#24; однакові назви — solomchaak/property-workflows-spec#30; перейменування — solomchaak/property-workflows-spec#29 |
| 4 | Потік взаємодії (UX) | Частково | що бачить адміністратор одразу після збереження (AC-EDITOR-03) — Q5; порожні списки — solomchaak/property-workflows-spec#27 (+ Q7 про форму запуску); де менеджер відкриває шаблон — solomchaak/property-workflows-spec#25; збій автозбереження — solomchaak/property-workflows-spec#31; підтвердження видалення — solomchaak/property-workflows-spec#23 |
| 5 | Нефункціональні вимоги | Ясно | київський час, DD.MM.YYYY HH:MM (AC-EDITOR-05); «хто й коли» — email і дата в списку версій; темна тема — поза межами, пропозиція solomchaak/property-workflows-spec#34 |
| 6 | Інтеграції й обмеження платформи | Ясно | зовнішніх систем у зрізі немає |
| 7 | Граничні випадки й збої | Частково | збереження без змін — solomchaak/property-workflows-spec#22; запуск шаблону без версії — solomchaak/property-workflows-spec#21; порожні назви — solomchaak/property-workflows-spec#28; два адміністратори одночасно — поза межами |
| 8 | Обмеження й компроміси | Ясно | ≥ 1 обов'язкова задача (AC-EDITOR-04); довжина назв не обмежена; версії незмінні, номери не повторюються |
| 9 | Термінологія | Ясно | нові терміни з «Avoid» у глосарії: Unpublished changes, Version, Current version, Editor, Design system |
| 10 | Сигнали завершеності | Частково | «у тій самій розкладці сторінки» (AC-DSYS-02, AC-DSYS-03) перевіряється на око — свідомо лишено, у `design.md` розкладка = спільний `AppShell` |
| 11 | Заглушки й розмиті слова | Ясно | — |

## Питання до PM (зріз 2)

| # | AC / вимога | Питання | Рекомендація | Issue в репо PM | Відповідь PM | Рішення (що зробили) |
|---|---|---|---|---|---|---|
| Q4 | AC-EDITOR-07, AC-EDITOR-02 (solomchaak/property-workflows-spec#20) | Що має бути правдою, коли менеджер напряму, оминаючи сторінки, запитує список версій, старішу версію чи незбережені зміни шаблону? | A: не отримує нічого, крім поточної версії; шаблон не змінюється | solomchaak/property-workflows-spec#37 | 2026-10-27: A — новий AC-EDITOR-29 і загальне правило доступу в матриці прав продукту | зміна `update-ws7-clarifications` (AC-EDITOR-29); політики читання версій і незбережених змін лише для admin уже є — тест AC-EDITOR-29 у задачі 1 `impl-ws7-clarifications` |
| Q5 | AC-EDITOR-03 (solomchaak/property-workflows-spec#20) | Що бачить адміністратор одразу після збереження — «Version 2 saved»? | A: повідомлення «Version N saved», позначка зникає | solomchaak/property-workflows-spec#38 | 2026-10-27: A — AC-EDITOR-03 переформульовано: «Version N saved» | зміна `update-ws7-clarifications` (MODIFIED AC-EDITOR-03); повідомлення вже показує редактор — тест у задачі 1 |
| Q6 | AC-EDITOR-05 (solomchaak/property-workflows-spec#20) | Яку дату й email показує список версій для версії 1 шаблонів, що існували до зрізу 2? | A: дата підготовки шаблону і «—» замість email | не подано (необов'язковий коментар до solomchaak/property-workflows-spec#33) | 2026-10-27, у #33: версія 1 — «збережена адміністратором, який підготував шаблон» (припущення PM) | автор версії 1 перенесених шаблонів — перший адміністратор (задача 1 `impl-ws7-clarifications`); у свіжій базі без профілів — «—» |
| Q7 | AC-DSYS-04 (solomchaak/property-workflows-spec#19) | Що бачить менеджер у формі запуску, коли жоден шаблон ще не має збереженої версії? | C: той самий текст, що й на порожньому списку шаблонів | не подано (необов'язковий коментар до solomchaak/property-workflows-spec#27) | 2026-10-27, у #27: лише порожні списки шаблонів (AC-EDITOR-17) і версій (AC-EDITOR-18); форму запуску без шаблонів PM не описав | порожній стан форми запуску не специфікуємо; у формі — та сама логіка, що й раніше |

## Відповіді PM 2026-10-27 (зріз 2)

PM відповів на всі 18 питань зрізу (solomchaak/property-workflows-spec#21–#38) і закрив їх: 24 нові AC (AC-DSYS-05…08,
AC-EDITOR-10…29), переформульовані AC-EDITOR-02 і AC-EDITOR-03, загальне правило доступу в матриці прав і абзац про теми
у «Вигляд і тон». Переклад — зміна специфікації `update-ws7-clarifications` (ADDED / MODIFIED, ID AC PM без змін);
рядки нових AC у `docs/conformance.md` — «відкладено (чекає реалізації)» до задач `impl-ws7-clarifications`.

## Власні припущення (зріз 2)

- Тексти повідомлень, статусів і посилань — дослівно як у PM (англійською).
- Поведінка без відповіді PM (запуск шаблону без версії, збереження без змін, порожня секція, порожні назви,
  перейменування й однакові назви, порожні списки шаблонів і версій) у специфікацію не вноситься; мінімальну поведінку
  до відповіді описує `design.md` зміни `impl-ws7-templates` з посиланнями на питання.
- Питання колег solomchaak/property-workflows-spec#21–#34 не дублюю: вони в Open questions зміни `add-ws7-templates`.

## Що пропустив би без скіла / що скіл знайшов зайве (зріз 2)

Скан за таксономією показав прогалину в категорії «Ролі й доступ», якої немає в жодному з 14 питань колег: відмовні AC
покривають прямий запит на **зміну** шаблону (AC-EDITOR-08), але не на **читання** старих версій і незбережених змін,
хоча продукт обіцяє обидва (Q4). Більшість інших дір (порожні назви, порожні списки, збій автозбереження) колеги вже
поставили — скіл зберіг від дублікатів, а нові випадки пішли коментарями в наявні issues (Q6, Q7).

## Питання до PM (зріз 3)

Вимога: [solomchaak/property-workflows-spec#39](https://github.com/solomchaak/property-workflows-spec/issues/39) (AC-VENDOR-01…10), знімок 2026-10-30. Власні питання Q1–Q3 (Open questions
зміни `add-ws8-vendor`) колеги команди поставили 02.11 через форму «Питання до вимог» — не дублюю, а посилаюсь:

| # | AC (вимога) | Питання | Наявне issue |
|---|---|---|---|
| Q1 | AC-VENDOR-04 ([solomchaak/property-workflows-spec#39](https://github.com/solomchaak/property-workflows-spec/issues/39)) | Що вендор бачить на сторінці запуску, крім своїх задач? | [solomchaak/property-workflows-spec#41](https://github.com/solomchaak/property-workflows-spec/issues/41) |
| Q2 | AC-VENDOR-08 ([solomchaak/property-workflows-spec#39](https://github.com/solomchaak/property-workflows-spec/issues/39)) | Чи показувати вендору в навігації «Templates»? | [solomchaak/property-workflows-spec#44](https://github.com/solomchaak/property-workflows-spec/issues/44) (суміжне — [#49](https://github.com/solomchaak/property-workflows-spec/issues/49)) |
| Q3 | AC-VENDOR-05 ([solomchaak/property-workflows-spec#39](https://github.com/solomchaak/property-workflows-spec/issues/39)) | Де вендор бачить «Your tasks: N of K done» після позначки? | [solomchaak/property-workflows-spec#41](https://github.com/solomchaak/property-workflows-spec/issues/41) (варіант C) |

Інші питання колег до зрізу 3 — [solomchaak/property-workflows-spec#42](https://github.com/solomchaak/property-workflows-spec/issues/42), [#43](https://github.com/solomchaak/property-workflows-spec/issues/43), [#45](https://github.com/solomchaak/property-workflows-spec/issues/45)–[#48](https://github.com/solomchaak/property-workflows-spec/issues/48), [#50](https://github.com/solomchaak/property-workflows-spec/issues/50). Станом на 09.11.2026 PM не
відповів на жодне (вікно уточнень зрізу 3 — до кінця Пт 06.11); `/requirements-sync` 09.11 — «Вимоги актуальні», тож
зміни `clarify-<зріз3>` немає, специфікація — за текстом AC.

## Відповіді PM 2026-11-10 (зріз 3)

PM відповів на всі питання зрізу 3 (solomchaak/property-workflows-spec#41–#50) і закрив їх. Відповіді на мої Q1–Q3:

| # | Відповідь PM | Що стало в специфікації |
|---|---|---|
| Q1 | [solomchaak/property-workflows-spec#41](https://github.com/solomchaak/property-workflows-spec/issues/41), A: на сторінці запуску — назва випадку заголовком і «Your tasks: N of K done», без статусу запуску, назви й версії шаблону | ADDED AC-VENDOR-11 |
| Q2 | [solomchaak/property-workflows-spec#44](https://github.com/solomchaak/property-workflows-spec/issues/44), A: навігація вендора — лише «Runs» і «Profile», після входу — список запусків | ADDED AC-VENDOR-13 |
| Q3 | [solomchaak/property-workflows-spec#41](https://github.com/solomchaak/property-workflows-spec/issues/41), A (не C): «Your tasks: N of K done» і на сторінці запуску | ADDED AC-VENDOR-11 |

Решта рішень: #42 — рядок списку без назви шаблону (AC-VENDOR-12); #43 — підтвердження для вендора як написано, вимога
не змінюється; #45 — роль у застосунку не змінюється (припущення); #46 — необов'язкову задачу завершеного запуску можна
позначити, для кожної ролі (AC-VENDOR-16, AC-TASK-19); #47 і #49 — «Not enough rights» і «Back to runs» на всіх
сторінках шаблонів (AC-VENDOR-08, AC-VENDOR-14); #48 — пряма спроба позначити чужу задачу: повідомлення AC-TASK-03, коли
вендор має інші задачі в запуску (AC-VENDOR-07), і «Run not found», коли не має (AC-VENDOR-15); #50 — прямі запити на
читання (AC-VENDOR-17, AC-VENDOR-18).

Переклад — зміна специфікації `clarify-ws8-vendor` (ADDED 9 AC, MODIFIED AC-VENDOR-07 і AC-VENDOR-08, ID AC PM без
змін). Рядки нових і змінених AC у `docs/conformance.md` — «відкладено (чекає реалізації)» до задач реалізації.
`spec-review`: блокерів 0; нових питань до PM немає.
