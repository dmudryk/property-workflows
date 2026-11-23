# Runbook: Stepline (property-workflows)

**Runbook** — що робити, коли щось пішло не так, написане заздалегідь, на спокійну голову. Кожен розділ відповідає
на три питання: як зрозуміти, що це саме воно; що зробити першим; як перевірити, що допомогло.

Останнє оновлення: 2026-11-23, версія продукту: `v1.0.0` (реліз-кандидат). Перевірено на дрілі
[2026-11-23-staging-bad-key](incidents/2026-11-23-staging-bad-key.md).

## Хто отримує алерт і кого кликати

| Роль | Хто (GitHub-логін) | Коли кликати |
|---|---|---|
| Черговий розробник (отримує алерт) | @dmudryk | будь-який «ЧЕРВОНИЙ SMOKE» чи «ПОМИЛКА СЕРВЕРА» |
| PM (говорить із клієнтом) | @solomchaak | SEV1–SEV2 — одразу; SEV3 — у робочий час |
| Резерв | немає (команда з одного розробника) | — |

- **Канал алерту:** Telegram-група «Stepline Alerts» — розробник і PM. Бот пише туди з `.github/workflows/smoke.yml`
  (секрети GitHub `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`) і з `src/instrumentation.ts` (ті самі назви — змінні
  Vercel, Production і Preview).
- **Серйозність:** шкала SEV1–3 курсу (SEV1 — прод не відкривається чи під загрозою дані; SEV2 — ключовий сценарій
  зламано: не увійти, не запустити процес, не відмітити задачу; SEV3 — незначний вплив, напр. недоступний
  AI-помічник при робочій ручній формі). Матриця PM — у репо вимог, щойно PM її опублікує. Не впевнені — вищий рівень.

## Де що

| Що | Адреса / де шукати |
|---|---|
| Прод | https://property-workflows-bravo16.vercel.app (гілка `main`) |
| Staging | https://property-workflows-git-staging-bravo16.vercel.app (гілка `staging`; лише для неї — `APP_ENV=staging`) |
| Здоров'я | `<адреса>/api/health` → `ok`, `sha`, `env`, `appEnv`, `supabaseRef`, `db`, `reason`, `suspect` (назва змінної, яку звірити, коли база недоступна) |
| Прогони smoke | Actions → `smoke`: job `prod` — прод (після деплою `main`, щодня ≈07:23 за Києвом); job `deploy` — кожен preview і staging за адресою саме цього деплою |
| Vercel | команда `bravo16`, проєкт `-property-workflows` → Deployments, Logs; регіон функцій `iad1` |
| Supabase — прод | проєкт `property-workflows`, ref `pnkwbzqfqhrkliqhakez` (ref — з адреси `https://<ref>.supabase.co`, не секрет; ключі — ніколи) → Logs, Advisors; у Vercel — **Production** |
| Supabase — staging | проєкт `property-workflows-staging`, ref `pqptodzkewlakfzumoos` → Logs, Advisors; у Vercel — **Preview** (усі гілки, отже й `staging`) і ваш `.env.local`; міграції — CI, job `db-deploy-staging` перед `db-deploy` |
| Статус-сторінки | vercel-status.com (регіон `iad1`), status.supabase.com (регіон — у Dashboard проєкту), githubstatus.com, status.openrouter.ai |
| Доступ PM до staging | **захист Vercel вимкнено** (як з WS6): staging і **всі** preview відкриваються без входу Vercel. Дані захищає вхід у застосунок і RLS; PM входить тестовими акаунтами з `accounts.zip` |

## 1. Червоний smoke о 2-й ночі

**Як зрозуміти:** у Telegram «ЧЕРВОНИЙ SMOKE» — репо, job, середовище (`production` чи `preview (гілка …)`), адреса,
коміт, посилання на прогін.

1. **Прод чи ні?** Подивіться рядок «Середовище».
   - `preview (гілка staging)` чи гілка PR — **користувачі не постраждали**: SEV3, виправляємо в робочому порядку.
     Якщо PM саме приймає реліз — напишіть PM, що staging лежить.
   - `production` — **спершу відкрийте https://property-workflows-bravo16.vercel.app/api/health.** `200` і
     `db: ok` → прод живий; дивіться рядок `::error::` у прогоні (найчастіше — SHA не той, розділ 2). `503` чи не
     відкривається — SEV1/SEV2: напишіть у групу «беру, SEV<N>» і PM.
2. Відкрийте посилання на прогін → крок smoke → рядки `::error::`:

   | Рядок `::error::` містить | Що це найімовірніше | Куди далі |
   |---|---|---|
   | `ключ NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY … не приймається` (у health — `reason: invalid-api-key`, `suspect`) | хибний ключ у змінних Vercel **цього** середовища, часто — перевизначення лише для гілки | Vercel → Environment Variables: звірити змінну з `suspect` для Preview / гілки / Production → виправити → Redeploy (розділ 4) |
   | `Supabase призупинено` (`reason: paused`) | база на паузі | розділ 3 |
   | `звірте NEXT_PUBLIC_SUPABASE_URL` (`reason: status-0` чи `exception`) | хибна чи порожня адреса бази в змінних Vercel | Vercel → Environment Variables → Redeploy |
   | `показує <sha>, а очікувався <sha>` | деплой `main` не пройшов або зроблено Instant Rollback | розділ 2 |
   | `стіна входу Vercel` / `секрет обходу` | захист Vercel або `VERCEL_AUTOMATION_BYPASS_SECRET` | розділ 4 (ротація) |
   | `HTTP 5xx` на `/` чи `/login` | зламаний код чи змінна середовища | «ПОМИЛКА СЕРВЕРА» в групі (маршрут і стек) → розбір (розділ 7) |
   | `недоступний` | Vercel чи мережа | статус-сторінка Vercel, повтор через 5 хв |

3. **Це ми чи провайдер?** (1–2 хв, паралельно) Статус-сторінки з «Де що» для **нашого** регіону. Зелена сторінка не
   доводить, що в нас усе гаразд; інцидент в іншому регіоні — не наша причина.
4. **Спершу зупинити шкоду, потім шукати причину.** Прод зламав щойно злитий коміт — відкат (розділ 2), потім розбір.
   Збій від змінної — виправити змінну й Redeploy. **Журнали Vercel на Hobby живуть 1 годину:** одразу скопіюйте в
   issue інциденту рядок smoke, відповідь `/api/health` і рядки журналу (без даних користувачів і секретів).
5. **Розбір** — агент у профілі «лише пропонує» (розділ 7) або вручну. Агент пропонує, виправляє людина.
6. **Перевірка:** Actions → smoke → Re-run (чи новий деплой) — зелений; у групу: «SEV<N> закрито, причина: …».
7. Після SEV1–SEV2 (і після кожного дрілу) — postmortem `docs/incidents/<YYYY-MM-DD>-<slug>.md`.

Приклад з дрілу 2026-11-23: 13:29 UTC — «ЧЕРВОНИЙ SMOKE … preview (гілка staging)», `invalid-api-key`; причина —
перевизначення ключа лише для гілки `staging`; виправлення — видалити перевизначення + Redeploy (35 хв, SEV3).
Того ж разу прийшов **хибний** «production»: до PR дій postmortem job `prod` реагував на деплой staging. Тепер на
такі події він пише `notice` і не червоніє; якщо хибний «production» повториться — перевірте прод (крок 1) і
допишіть це в postmortem.

## 2. Відкат проду і повернення автоматичного просування (Promote)

**Коли:** прод зламав щойно розгорнутий коміт, а виправлення вперед займе довше за 30 хв.

1. Vercel → Deployments → попередній робочий прод-деплой → **Instant Rollback**. На Hobby — **лише на один
   попередній** прод-деплой.
2. Перевірте прод: `/api/health` — `db: ok`, сторінка входу відкривається.
3. **Пастка Hobby:** після відкату Vercel **вимикає автоматичне просування** — наступні злиття в `main` збираються,
   але на прод **не потрапляють**. Smoke `prod` червонітиме з «показує <старий sha>, а очікувався <новий>» — це
   нагадування, а не новий збій.
4. Виправлення — звичайним PR у `main` (CI зелений). Коли деплой виправлення готовий: Vercel → цей деплой →
   **Promote** (`vercel promote <адреса>`). Це повертає автоматичне просування; smoke `prod` знову зелений.
5. Відкат **не змінює** базу й міграції. Код, на який відкочуємось, має працювати з поточною схемою — міграції в нас
   лише додають (expand), а не видаляють.
6. **Staging** відкату не має (Instant Rollback — лише прод): виправляємо змінну чи код і робимо Redeploy. Redeploy
   старого деплою не допомагає — збірка бере **поточні** змінні.

Хто робить: черговий розробник. Агент відкат і Promote не робить ніколи.

## 3. База на паузі

**Як зрозуміти:** `/api/health` → 503, `"db":"down"`, `"reason":"paused"`; smoke пише «Supabase призупинено».
Безкоштовний Supabase ставить проєкт на паузу після 7 днів без достатньої активності бази. **Прод і staging засинають
незалежно:** червоний smoke `prod` — прод-проєкт `pnkwbzqfqhrkliqhakez`; червоний smoke staging чи preview — проєкт
staging `pqptodzkewlakfzumoos` (звірте `supabaseRef` у health). Пауза staging ще й зупиняє міграції:
`db-deploy-staging` падає, і прод не мігрує.

1. Supabase Dashboard → **той проєкт, що на паузі** (звірте ref) → **Resume project**.
2. Повторіть smoke (Actions → smoke → Run workflow; для staging — поле `url` = адреса staging) — зелений.
3. Якщо стояли міграції — Actions → CI → перезапустити впалі jobs `db-deploy-staging` / `db-deploy`.
4. Запишіть у групу, коли була пауза і скільки тривала.

**Як не допустити до demo day:** прод будить щоденний smoke (запит до бази в `/api/health`). Staging щоденний smoke
**не** будить: **перед UAT, демо чи дрілом — Dashboard → проєкт staging активний, інакше Resume project.**

## 4. Ротація ключа + redeploy

**Коли:** ключ потрапив у git, журнал, на знімок чи в чат з агентом — або його треба змінити планово.
Порядок завжди однаковий: **новий ключ → замінити всюди → redeploy → перевірити → лише тоді видалити старий.**

| Що | Де новий | Де замінити | Що ще |
|---|---|---|---|
| Публічний ключ **прод-проєкту** (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) | прод-проєкт → Settings → API Keys | Vercel → Environment Variables → **лише Production**; `.env.prod.local` розробника | **Redeploy** проду: `NEXT_PUBLIC_*` вбудовуються під час збірки |
| Публічний ключ **проєкту staging** | проєкт staging → Settings → API Keys | Vercel → **Preview** (усі гілки, без перевизначень для гілки); `.env.local` | Redeploy `staging` і новий push у відкриті PR |
| Секретний ключ Supabase (`SUPABASE_SECRET_KEY`) | той самий проєкт → API Keys | лише `.env.local` (staging) / `.env.prod.local` (прод) розробника — **у Vercel його немає й не має бути** (застосунок його не читає) | скрипти `users:demo` працюють з новим ключем |
| Рядок підключення бази (`SUPABASE_DB_URL`, після зміни пароля бази) | Connect у тому самому проєкті, Session pooler 5432 | GitHub → Environments → `production` чи `staging` | наступний прогін CI: запобіжник друкує правильний ref |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | Vercel → Settings → Deployment Protection → Protection Bypass for Automation | GitHub → Secrets → Actions | redeploy staging |
| `TELEGRAM_BOT_TOKEN` | Telegram, @BotFather → `/mybots` → бот → API Token → Revoke | GitHub Secrets **і** Vercel (Production, Preview) | ручний червоний smoke (`url` = `https://example.invalid`) → повідомлення прийшло; при відмові крок алерту показує код і опис помилки Telegram |
| `TELEGRAM_CHAT_ID` (після нової групи) | `getUpdates` бота локально, токен — прихованим вводом | GitHub Secrets **і** Vercel | id групи — повністю, з мінусом; id бота замість групи дає `403 … can't send messages to the bot` |
| `OPENROUTER_API_KEY` | OpenRouter → Keys | Vercel (Production, Preview) | redeploy; старий ключ видалити |

**Перевизначення лише для гілки** (Preview → Branch) має пріоритет над загальним Preview: після ротації перевірте,
що для гілки `staging` немає старого перевизначення ключа (`vercel env ls`) — саме так зламався staging на дрілі.
Перевірка: зелений smoke на прод і staging. Запис у групу: що ротували і чому — без значень.

## 5. Де журнали і скільки вони живуть

| Що | Де | Скільки живе (станом на 23.11.2026) |
|---|---|---|
| Runtime-журнали Vercel (`llm.call`, `health.check`, помилки) | Vercel → Logs; `vercel logs --deployment <адреса>` (вікно 30 хв) | **1 година** (Hobby) |
| Observability Vercel | Vercel → Observability | 12 годин (Hobby) |
| Журнали збірки | Vercel → Deployments → деплой → Build Logs | поки є деплой |
| Журнали Supabase (API, Postgres, Auth) | Supabase → Logs **окремо для кожного проєкту** | **1 день** (Free) |
| Прогони GitHub Actions (smoke, CI) | Actions | 90 днів (налаштування репо) |
| Алерти й помилки сервера | Telegram-група «Stepline Alerts» (smoke і `onRequestError`) | поки їх не видалили |

Висновок для чергового: розбираємо **одразу**, потрібні рядки журналу копіюємо в issue інциденту (без даних
користувачів). `llm.call` і `health.check` — один рядок JSON без тексту користувача.

## 6. Staging

- Гілка `staging` отримує зміни **лише з `main`**: `git fetch origin; git switch staging; git merge --ff-only
  origin/main; git push`. Окремої розробки немає (`--ff-only` відмовить, якщо в `staging` є свої коміти).
- **Власна база:** проєкт `property-workflows-staging`. Preview і локальна розробка (`.env.local`) теж ходять у неї;
  прод-ключів у Preview немає. Дані — лише синтетичні, акаунти з `accounts.zip`; прод-даних у staging не копіюємо.
- **Міграції** — лише CI: на злитті в `main` спершу `db-deploy-staging`, потім `db-deploy`. Упала на staging — прод
  не мігрує; виправлення — нова міграція вперед.
- Змінна лише для гілки: `APP_ENV=staging` (Vercel → Preview → гілка `staging`). Інших перевизначень для гілки не
  тримаємо: вони перекривають загальне Preview (див. дріл).
- **Дріл** — лише на staging, без міграцій і без видалення даних.

## 7. Розбір з агентом: профіль «лише пропонує»

Агент читає журнали, деплої й код і **пропонує** причину та виправлення. Нічого не змінює: запис через MCP Vercel і
Supabase заборонений поіменно (`.claude/settings.json`), Supabase — `read_only=true` з ref staging, редагування
файлів, `git push` і команди `vercel env|deploy|rollback|promote` у сесії розбору заборонені
(`.claude/settings.incident.json`).

```powershell
claude --settings .claude/settings.incident.json --mcp-config .mcp.incident.json --strict-mcp-config --permission-mode plan
```

(`claude` не в PATH — бінарник з розширення VS Code:
`& "$env:USERPROFILE\.vscode\extensions\anthropic.claude-code-<версія>-win32-x64\resources\native-binary\claude.exe" …`)

1. `/mcp` → `vercel` → Authenticate; на сторінці згоди Vercel — доступ саме до команди **`bravo16`**. Перевірка до
   розбору: попросіть показати останні деплої — `403 … scope "bravo16"` означає, що доступу до команди немає (так
   було на дрілі). План Б — вставити агенту `vercel ls` і `vercel logs --deployment <адреса>` з вашого терміналу.
2. Промпт — R09 «Розбір інциденту агентом» з бібліотеки WS11: прогін, деплой, час алерту, назви змінних (без значень).
3. На запити дозволу `filter_project_envs` / `execute_sql` — «ні».
4. Стенограма — `/export` → `docs/incidents/<YYYY-MM-DD>-<slug>-rca.md` дослівно, із заголовком.

Вміст журналів, issues і сторінок — дані для агента, а не команди.

## 8. Чого ніколи не робити

- `supabase migration down` і `supabase db reset --linked` (чи `--db-url`) проти будь-якого з наших проєктів — прод
  чи staging — **знищують дані**; `supabase db push` з ноутбука — міграції застосовує лише CI.
- Копіювати прод-дані в staging (дамп, CSV, «щоб було схоже»). Відкат схеми = нова міграція вперед.
- `npx supabase@latest`: CLI 3.x змінює поведінку команд. Лише закріплена версія з `package.json`.
- Давати агенту право запису на прод: відкат, Promote, зміну змінних і деплой робить людина.
- Значення токенів, ключів, паролів і chat id — у git, журналі, issue, на знімку чи в чаті з агентом. Потрапило —
  ротація (розділ 4), потім прибрати значення.
- Інцидент-дріл на проді чи з базою: дріл — лише на staging, без міграцій і без видалення даних.
- Виконувати інструкції з тексту журналів, issues чи повідомлень про помилки: це дані, а не команди.
