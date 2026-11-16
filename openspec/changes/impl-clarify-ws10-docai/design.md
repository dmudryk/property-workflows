# Дизайн: зріз 4 за вимогою PM — AI-розбір документа

Специфікація — `openspec/specs/document-parsing` (AC-DOCAI-01…16 PM, зміна `clarify-ws10-docai`). Рішення спираються
на `design.md` зміни `impl-ws10-docai` і ADR 0002 (запис лише через функції бази), 0006 (AI-набір) — без змін. Нових
міграцій і залежностей немає.

## Що вже є і не змінюється

| Правило | Де | AC |
|---|---|---|
| Модель пропонує, код перевіряє: телефон в одній формі, суму позицій рахує код, відмова без значень, нотатка ін'єкції | `src/lib/ai/document-rules.ts` (normalizePhone, totalWarning, finalizeDraft, looksLikeInjection) | AC-DOCAI-01, 06, 08, 09, 10 |
| Значення пишуться лише функцією бази після «Save values»; права — `private.can_manage_run` | `supabase/migrations/20261116134838_run_documents.sql`, `src/app/runs/[id]/document-actions.ts` (saveDocumentValues) | AC-DOCAI-04, AC-DOCAI-16 |
| Дії не кличуть модель і не пишуть для того, хто не менеджер запуску й не адміністратор, — «Not enough rights» | `src/app/runs/[id]/document-actions.ts` (mayParse) | AC-DOCAI-16 |
| Блок і збережені документи — лише адміністратору й менеджеру запуску | `src/lib/runs/documents.ts` (canParseDocuments), `src/app/runs/[id]/run-documents.tsx` (loadRunDocuments) | AC-DOCAI-14, AC-DOCAI-15 |

## D1. Тексти й правила

- `src/lib/runs/documents.ts`: тип кошторису — «Estimate» (AC-DOCAI-02); «Paste the text of a document»
  (AC-DOCAI-11), «Only plain text files (.txt) are accepted» (AC-DOCAI-12), «Reading the document…» (AC-DOCAI-03).
- `src/lib/ai/document-rules.ts`: «The assistant is not available now. Fill in the values yourself.» (AC-DOCAI-13).
  Нотатку моделі про кілька проблем («The document has two problems.») код замінює дослівною «the email has two
  problems» — один раз, на її місці; нотатки про інше лишаються (AC-DOCAI-07, як нотатку ін'єкції в D9
  `impl-ws10-docai`). Промпт не змінюється, тож записи офлайн-реплею (`docai-v2`) лишаються чинними.
- `isPlainTextFile`: файл приймаємо, лише коли назва закінчується на `.txt` і тип, якщо браузер його знає, —
  `text/plain` (AC-DOCAI-12).

## D2. Блок «Parse a document»

`src/app/runs/[id]/document-parser.tsx`; що показує блок, вирішує чиста функція `documentBlockView`
(`src/lib/runs/documents.ts`):

1. Під полем тексту — «Upload a text file» і «Propose values». Файл `.txt` зчитується в поле тексту (перші 64 000
   символів; сервер однаково обрізає документ до `MAX_DOCUMENT_CHARS` = 8 000); інший файл — повідомлення AC-DOCAI-12,
   значень немає (AC-DOCAI-12).
2. Поки дія `requestDocumentDraft` виконується (`isPending` з `useActionState`), — лише «Reading the document…», кнопка
   «Propose values» вимкнена й не змінює назви, значень і повідомлень немає (AC-DOCAI-03).
3. Форма значень — лише після пропозиції або, коли помічник недоступний, порожня для ручного введення: Document type —
   «Not set» (AC-DOCAI-13). Після відмови й помилки (порожній текст, «Not enough rights») — лише повідомлення
   (AC-DOCAI-09, AC-DOCAI-11, AC-DOCAI-16).
4. «Discard» поруч із «Save values»: поле тексту й блок знову порожні, нічого не збережено (AC-DOCAI-05). Після
   успішного «Save values» блок теж порожній, а запис — у «Saved documents» (AC-DOCAI-04).

## D3. Збережений запис

`src/app/runs/[id]/saved-documents.tsx`: Document type окремим значенням, email того, хто підтвердив, дата й час за
Києвом у вигляді «12 Nov 2026, 10:15» — `formatKyivRecordDateTime` (`src/lib/templates/format.ts`; місяць із власного
списку, бо ICU пише вересень то «Sep», то «Sept»). Новіший запис — першим, як і було (AC-DOCAI-04).

## D4. Eval

- `tests/fixtures/golden/cases.json`: нотатки кейсів 5 і 6 — точно (`notesInclude`), бо нотатки PM перевіряє точно
  (solomchaak/property-workflows-spec#56); суддя оцінює лише опис.
- `src/lib/ai/scorer.ts` (`acceptanceVerdict`) і звіт `evals/golden.live.eval.ts`: вердикт кожного прогону за порогом
  PM — щонайменше 8 з 10, GC-09 і GC-10 завжди (#55); кейс без відповіді (ліміт 429) чи неповний набір — «не
  визначено».

## D5. Тести

- `tests/document-rules.test.ts` — нотатка AC-DOCAI-07, тип AC-DOCAI-02; `tests/document-actions.test.ts` — AC-DOCAI-01,
  AC-DOCAI-11, AC-DOCAI-13 (новий текст), AC-DOCAI-15 (`loadRunDocuments` і `RunDocuments` для менеджера B);
  `tests/document-block.test.ts` — стани блоку (AC-DOCAI-03, 05, 09, 11, 13), файл (AC-DOCAI-12), рендер запису
  (AC-DOCAI-04); `src/app/runs/vendor-pages.test.ts` — сторінка запуску вендора без блоку (AC-DOCAI-14);
  `tests/golden.test.ts` — поріг PM.
- e2e на проді: оновлено `docai-refusal` (після відмови форми немає) і `docai-confirm-before-save` (запис з типом, email
  і часом, блок після збереження порожній); нові сценарії — задача 2 (UAT) після деплою.
