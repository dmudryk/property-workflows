# Звіт порівняння зрізу 3: звичайно проти фабрики

- Зріз 3: менеджер під час запуску шаблону призначає вендора виконавцем задач; вендор бачить і позначає лише свої
  задачі, а більше нічого не бачить і не змінює — ні на сторінках, ні запитом напряму.
- AC зрізу 3: AC-VENDOR-01 … AC-VENDOR-10 — текст вимоги
  [solomchaak/property-workflows-spec#39](https://github.com/solomchaak/property-workflows-spec/issues/39) до
  оновлення PM 10.11; за ним іде приймання WS9 (рішення PM 10.11). Нові AC-VENDOR-11…18 і AC-TASK-19 (10.11) зроблено
  лише звичайним способом (розділ «Поза порівнянням»).
- Звичайно: https://github.com/dmudryk/property-workflows · main `cb6f06c` · прод
  https://property-workflows-bravo16.vercel.app
- Фабрика: https://github.com/dmudryk/property-workflows-factory · main `942e704` · прод
  https://property-workflows-factory-gamma.vercel.app (код фабрики — злиття PR
  [#5](https://github.com/dmudryk/property-workflows-factory/pull/5), `86b6eee`)
- Фабрика й імпортер: курс-редакція у fork https://github.com/dmudryk/2026-quitcode-09-factory (гілка
  `team/property-workflows`): виправлення видалення робочої теки з junction `node_modules` у Git для Windows
  ([15bdc66](https://github.com/dmudryk/2026-quitcode-09-factory/commit/15bdc66)) і тест імпортера на форматі PM
  ([f5da556](https://github.com/dmudryk/2026-quitcode-09-factory/commit/f5da556)). Імпортер `tools/ac-to-task.mjs`
  читає знімок issue PM (формат «рядки») без адаптера.
- Моделі фабрики: planner, builder, reviewer — `claude-sonnet-5-5` (`run.json` → `models` кожного прогону).

## Прогони фабрики

| Run id | Задача і AC | Стан | Спроби | Вартість | Wall-час | Дайджест пакета доказів | PR |
|---|---|---|---|---|---|---|---|
| run-20261109210917-8b8b23 | vendor-db: AC-VENDOR-01, 02, 06, 07, 09 | released → delivered | 1/3 | $0.3825 | 9.3 хв | `e9a1285f2eaf9563dd34fdbb1b369324c5587dde00a8cc0d362108d273a4053c` | [#3](https://github.com/dmudryk/property-workflows-factory/pull/3) |
| run-20261109214913-0cd73b | vendor-pages: AC-VENDOR-03, 04, 05, 08, 10 | needs-human (лишено) | 4/4 | $0.9241 | 701.5 хв (з нічною паузою) | — | — |
| run-20261110105855-97a2af | vendor-pages: AC-VENDOR-03, 04, 05, 08, 10 | released → delivered | 2/3 | $0.9515 | 43.4 хв (з них 20 хв пауза через ключ) | `073ecaf80b65c9998cc36f4e90e39698cd7b2f75fe75358d2ca2442f5629076d` | [#5](https://github.com/dmudryk/property-workflows-factory/pull/5) |

Wall-час — від першої до останньої події `C:\pf\store\runs\<run-id>\events.jsonl`. Пакети доказів — в описах PR
фабрики (`deliver` кладе туди `proof-pack.md`).

## За AC

Тести звичайного способу — у `tests/db/vendor.test.ts` (PGlite, від імені ролі) і тестах рендеру сторінок; UAT — звіт
`docs/qa/uat/2026-11-10/report.md` основного репо. Фабрика: `verifiedBy` з
`C:\pf\control\tasks\vendor-db.json` і `vendor-pages.json` (видимий червоний тест + набір прихованих сценаріїв); UAT —
[`docs/qa/uat/2026-11-10/report.md`](https://github.com/dmudryk/property-workflows-factory/blob/b23e20b/docs/qa/uat/2026-11-10/report.md)
двійника (ті самі приймальні специфікації, що й в основному репо, — [twin #6](https://github.com/dmudryk/property-workflows-factory/pull/6)).

| AC | Звичайно: тест і доказ | Звичайно: UAT | Фабрика: `verifiedBy` і доказ у пакеті | Фабрика: UAT на проді двійника | Різниця в поведінці |
|---|---|---|---|---|---|
| AC-VENDOR-01 | `tests/db/vendor.test.ts`, SQL-мутант V1 KILLED | PASS (R6) — 09.11 і 10.11 | visible:AC-VENDOR-01 ✓, holdout vendor-db (18/18 на 5 AC) | PASS (R6) | немає |
| AC-VENDOR-02 | `tests/db/vendor.test.ts`, V2 KILLED | PASS (R6) — 09.11 і 10.11 | visible:AC-VENDOR-02 ✓, holdout vendor-db | PASS (R6)¹ | немає |
| AC-VENDOR-03 | `tests/db/vendor.test.ts` + `src/app/runs/vendor-pages.test.ts`, V4 KILLED | PASS (R6) — 09.11 і 10.11 | visible:AC-VENDOR-03 ✓, holdout vendor-pages 4/4 | PASS (R6) | у звичайному — рядок без назви шаблону (уточнення PM, AC-VENDOR-12) |
| AC-VENDOR-04 | `tests/db/vendor.test.ts` + `vendor-pages.test.ts`, V3, V4, V10 KILLED | PASS (R6) — 09.11 і 10.11 | visible:AC-VENDOR-04 ✓, holdout vendor-pages 5/5 | PASS (R6) | у звичайному — заголовок сторінки — назва випадку (AC-VENDOR-11) |
| AC-VENDOR-05 | `tests/db/vendor.test.ts` + `vendor-actions.test.ts`, V9, V11 KILLED | PASS (R6) — 09.11 і 10.11 | visible:AC-VENDOR-05 ✓, holdout vendor-pages 5/5 | PASS (R6) | немає |
| AC-VENDOR-06 | `tests/db/vendor.test.ts`, V5 KILLED | PASS (R6) — 09.11 і 10.11 | visible:AC-VENDOR-06 ✓, holdout vendor-db | PASS (R6) | немає |
| AC-VENDOR-07 | `tests/db/vendor.test.ts`, V6, V13 KILLED | PASS (R6) — 09.11 і 10.11 | visible:AC-VENDOR-07 ✓, holdout vendor-db | PASS (R6) | у звичайному — відповідь з текстом AC-TASK-03 (уточнення PM 10.11); у фабрики — `NOT_ALLOWED` (текст AC до уточнень) |
| AC-VENDOR-08 | `tests/db/vendor.test.ts` + `vendor-pages.test.ts` + `access.test.ts`, V7 KILLED | PASS (R6) — 09.11 і 10.11 | visible:AC-VENDOR-08 ✓, holdout vendor-pages 4/4 | PASS (R6)¹ | у звичайному — посилання «Back to runs» (уточнення PM 10.11) |
| AC-VENDOR-09 | `tests/db/vendor.test.ts` + `access.test.ts`, V8 KILLED | PASS (R6) — 09.11 і 10.11 | visible:AC-VENDOR-09 ✓, holdout vendor-db | PASS (R6) | немає |
| AC-VENDOR-10 | `tests/db/vendor.test.ts` + `vendor-pages.test.ts` | PASS (R6) — 09.11 і 10.11 | visible:AC-VENDOR-10 ✓, holdout vendor-pages 3/3 | PASS (R6) | немає |

¹ У двійнику немає демо-акаунта `vendor@example.test` (`supabase/demo-users.json` фабриці змінювати не можна), тож
вендор V у специфікаціях AC-VENDOR-02 і AC-VENDOR-08 — синтетичний вендор світу `uat-…-v`. Перший прогін UAT
двійника дав FAIL на AC-VENDOR-02 саме через це — вада тестових даних, не коду фабрики.

## Метрики

| Метрика | Звичайно | Фабрика | Джерело |
|---|---|---|---|
| Час (календарний) | 56 хв від PR «Специфікація» до злиття реалізації (AC-VENDOR-01…10); докази (мутанти, UAT) злито через 7 днів | T1 — 30 хв; T2 — 14 год 26 хв з нічною паузою й невдалим першим прогоном, 82 хв від перенесеного коміту тестів | звичайно: [#33](https://github.com/dmudryk/property-workflows/pull/33) створено 02.11 13:27 UTC → [#35](https://github.com/dmudryk/property-workflows/pull/35) злито 14:23; [#42](https://github.com/dmudryk/property-workflows/pull/42), [#43](https://github.com/dmudryk/property-workflows/pull/43) — 09.11. Фабрика: тег `ws9-red` (20:50 UTC) → PR #3 (21:20); `ws9-red-2` (09.11 21:28) / `fe0bdb5` (10.11 10:32) → PR #5 (11:54) |
| Хвилини людини | не виміряно | не виміряно | журналу хвилин не вели |
| Вартість | не виміряно (підписка Claude Code, `/cost` не знімали) | $2.26 за всі прогони: $0.3825 + $0.9241 + $0.9515; UAT двійника — рецензент $0.023 | `run.json` → `costUsd`; звіт UAT двійника |
| Токени | не виміряно | вихід 66 806; читання кешу 2 316 600; запис у кеш 339 447; вхід 202 (три прогони) | `agent-<роль>-<спроба>-summary.json` → `usage` |
| Спроби | 1 червоний прогін CI до злиття (fallow, складність `markDone`, [#47](https://github.com/dmudryk/property-workflows/pull/47)) | T1 1/3; T2 4/4 (needs-human) і 2/3 | `gh run list` з 02.11; `run.json` → `attempt` |
| Що зловили ворота | CodeRabbit: збій перевірки підтвердження позначав останню обов'язкову задачу без підтвердження ([#44](https://github.com/dmudryk/property-workflows/pull/44) → [#47](https://github.com/dmudryk/property-workflows/pull/47)); fallow: складність `markDone` 18/27 | maintainability FAIL на 1-й спробі обох прогонів T2 (дублювання); visible-tests FAIL ×3 у першому T2 — нестабільний таймаут шаблонного тесту, не код; holdouts — 2 паузи «wrong key»; boundary — 1–2 відмови хука на прогін; **після поставки** — CI двійника «Покриття: доменна підлога» заблокувала PR #5 | `events.jsonl`, `run.json` → `attempts[].gates`, перевірки PR #5 |
| Втручання людини | — | 14 дій: 7 схвалень, 1 `answer`, 2 `resume`, 2 ручні коміти, 2 `deliver` | розділ «Втручання людини у фабриці» |
| Вади від UAT | 2026-11-09: 10/10 PASS (AC-VENDOR-01…10); 2026-11-10: AC-VENDOR-15 — HTTP 500 замість відмови (виправлено [#51](https://github.com/dmudryk/property-workflows/pull/51)) | 0 вад коду: 10/10 PASS; 1 FAIL першого прогону — тестові дані (¹) | звіти UAT обох репо |
| Вади від PM | ще немає (приймання PM — до 12.11) | ще немає | issues «Відхилення від вимог» |
| Мутації | SQL-мутанти V1–V14 — усі KILLED (`npm run mutation:sql`) | T1 — воріт mutation немає (n/a); T2 — 4/4 мутантів убито | `scripts/mutants.mjs`; ворота `mutation` |
| Розмір diff | реалізація [#35](https://github.com/dmudryk/property-workflows/pull/35): +577/−56 | PR #3: +487/−6 (11 файлів); PR #5: +640/−88 (26 файлів) — разом з тестами-спершу | `gh pr view --json additions,deletions` |
| Якість коду | fallow audit на кожному PR; складність `markDone` виправлено в #47 | ворота maintainability (max-file-lines, dependency, duplication) — PASS з 2-ї спроби; рецензент — 4 некритичні примітки (T2), 0 (T1) | ворота й рецензія в пакетах доказів |

## Втручання людини у фабриці

Час — UTC; схвалення — `C:\pf\store\approvals.jsonl`. Разом 14 дій: 7 схвалень, 1 `answer`, 2 `resume`, 2 ручні
коміти, 2 `deliver`.

1. `approve config` — двічі, 09.11 21:09 і 21:49 (той самий дайджест `a101106c…`, перед кожною задачею).
2. `approve intent vendor-db` — 09.11 21:09.
3. `approve plan` run-…8b8b23 (T1) — 21:13, після перегляду `plan.md`.
4. `approve intent vendor-pages` — 09.11 21:49.
5. `approve plan` run-…0cd73b — 10.11 09:03.
6. `answer` на needs-human у run-…0cd73b — 09:18; нестабільний тест відповіддю не виправити.
7. `resume --recover` у run-…0cd73b — 09:29, пауза «cannot decrypt holdout set» (ключ введено з помилкою).
8. Ручний коміт: twin PR [#4](https://github.com/dmudryk/property-workflows-factory/pull/4) — таймаут 30 с для
   шаблонного `tests/scripts/check-migration-order.test.ts` (git у тимчасових репо повільний на Windows під
   навантаженням); через нього run-…0cd73b тричі падав на visible-tests.
9. `approve plan` run-…97a2af — 11:02, з `--digest`.
10. `resume --recover` у run-…97a2af — 11:34, та сама пауза через ключ. Ключ печатки при цьому побачила сесія-оркестратор
    (Claude Code основного репо), не агенти фабрики; агент-збирач ключа й прихованих сценаріїв не бачив.
11. Ручний коміт у PR фабрики #5:
    [`f4a9c2e`](https://github.com/dmudryk/property-workflows-factory/commit/f4a9c2e) — тест `requireActor`: контракт
    задачі забороняв фабриці змінювати тести, а обов'язкова перевірка CI двійника вимагає покриття гілок
    `src/lib/auth/actor.ts` ≥ 85%.
12. `deliver` двічі (T1, T2) — запускала людина, автозлиття — GitHub після обов'язкових перевірок.

Тести-спершу (`ws9-red`, `ws9-red-2`) і приховані сценарії писала людина — це вхід фабрики, не втручання.

## Що не перевірено

- Розподіл 18 прихованих сценаріїв vendor-db за AC не зафіксовано (відомо лише 18/18 PASS на 5 AC).
- Клас змін фабрика визначила як `docs` для обох PR (міграція й сторінки), тож рівень — `auto`. Наслідків не було (PR
  пройшли ворота й CI), але для змін з міграцією клас має бути вищим — правило класифікації не перевіряли.
- Ворота фабрики не включають пороги покриття CI двійника: розбіжність виявилась лише після поставки (PR #5).
- Хвилини людини й вартість звичайного способу не вимірювали.

## Поза порівнянням

Після відповідей PM 10.11 звичайним способом додано AC-VENDOR-11…18 і AC-TASK-19 і змінено AC-VENDOR-07, 08:
[#48](https://github.com/dmudryk/property-workflows/pull/48) (вимоги), [#49](https://github.com/dmudryk/property-workflows/pull/49)
(специфікація і план), [#50](https://github.com/dmudryk/property-workflows/pull/50) (реалізація),
[#51](https://github.com/dmudryk/property-workflows/pull/51) (HTTP 404 для AC-VENDOR-15). Фабрика їх не робила: її
задачі — з тексту AC до оновлення, а PM прийматиме WS9 саме за ним.

## Частковий прогін

—

## Висновок

1. Де фабрика краща: однакові для кожного AC докази без забудькуватості людини — тести-спершу, приховані сценарії, повтор і мутанти на кожній спробі, а UAT двійника пройшов 10/10 без жодної вади коду.
2. Де фабрика гірша: вона не бачить воріт CI цільового репо (покриття) і чутлива до середовища (нестабільний тест, ключ печатки), тож 14 дій людини і 14 год календаря на T2 проти 56 хв звичайної реалізації.
3. Що візьмемо у звичайний процес: червоні тести з тексту AC до коду й приховані сценарії, яких не бачить автор реалізації, — як окремі ворота перед UAT.
