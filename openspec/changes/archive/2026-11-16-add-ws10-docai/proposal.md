# Пропозиція: AI-розбір документа в запуску (зріз 4)

> **Тимчасові AC від розробника: вимоги PM з критеріями приймання немає на 2026-11-16.** У репо PM для зрізу 4 є
> лише 10 golden cases з правилами (issue «Golden cases: AI document parsing», без мітки `requirement`, тож
> `/requirements-sync` його не приносить) і рядок roadmap WS10. Критерії AC-DOCAI-01…11 нижче склав розробник із
> цих двох джерел за правилом курсу WS10 «Якщо вимоги зрізу 4 ще немає»: golden cases — дослівно PM, ID AC — розробника.
> Коли PM опублікує вимогу з AC, ця специфікація зміниться новою зміною (MODIFIED / ADDED / REMOVED).

## Why

Менеджер отримує від орендаря лист чи розшифровку дзвінка, а від вендора — кошторис, і вручну переносить з них
телефон, опис, категорію й терміновість заявки або позиції кошторису. Після зрізу менеджер запуску вставляє текст
документа в запуск, AI пропонує значення, а людина перевіряє, виправляє й лише тоді зберігає їх у запуску. AI нічого
не вигадує: відсутнє значення лишається порожнім, текст документа — це дані, а не інструкції.

Джерела:

- golden cases PM: <https://github.com/solomchaak/property-workflows-spec/issues/40> («Golden cases: AI document
  parsing», 2026-10-30) — функція, правила кейсів і 10 кейсів; у `requirements/` його немає (немає мітки `requirement`);
- `requirements/product.md` (рядок roadmap WS10: «an administrator adds an "AI document parsing" step to a template;
  in a run the AI proposes values from a document, and the user confirms or corrects them before they are saved») —
  <https://github.com/solomchaak/property-workflows-spec/issues/1>.

## What Changes

AI-розбір документа (`document-parsing`, нова можливість):

- Заявка орендаря → запропоновані phone, description, category і urgency за документом (AC-DOCAI-01).
- Значення, якого немає в документі, лишається порожнім з позначкою «not found» (AC-DOCAI-02).
- Дві проблеми в документі: опис згадує обидві, категорія — за серйознішою, нотатка про дві проблеми (AC-DOCAI-03).
- Ризик для безпеки: заявка термінова, нотатка з причиною, напр. «possible gas leak» (AC-DOCAI-04).
- Кошторис вендора → позиції (назва, кількість, ціна за одиницю) і total як у документі (AC-DOCAI-05); сума позицій
  не збігається з total — попередження «items add up to …, the stated total is …» (AC-DOCAI-06).
- Документ не заявка й не кошторис → жодних значень і «This document is not a maintenance request or an estimate.»
  (AC-DOCAI-07).
- Інструкції для AI всередині документа ігноруються, користувач бачить нотатку «the text contains instructions to the
  AI that were ignored» (AC-DOCAI-08).
- Значення зберігаються в запуску лише після того, як людина їх переглянула, за потреби виправила й натиснула
  «Save values» (AC-DOCAI-09).
- Помічник недоступний (немає ключа, ліміт, збій, таймаут, відповідь не за схемою) — повідомлення й ручне введення
  (AC-DOCAI-10).
- Розбирати документ і зберігати значення можуть лише менеджер запуску й адміністратор (AC-DOCAI-11).

Зв'язок golden cases PM з AC: GC-01…GC-03 → AC-DOCAI-01; GC-04 → AC-DOCAI-02; GC-05 → AC-DOCAI-03; GC-06 →
AC-DOCAI-04; GC-07 → AC-DOCAI-05; GC-08 → AC-DOCAI-06; GC-09 → AC-DOCAI-07; GC-10 → AC-DOCAI-08.

## Capabilities

### New Capabilities

- `document-parsing`: AI пропонує значення з документа (заявка орендаря або кошторис вендора) у запуску, людина
  перевіряє, виправляє й зберігає їх.

### Modified Capabilities

Немає.

## Users & roles

- **Менеджер запуску** і **адміністратор** — вставляють документ, отримують пропозицію, виправляють і зберігають
  значення (розробник; у PM ролі не визначено — Q3).
- **Інші менеджери** (виконавці задач запуску) і **вендор** — блоку розбору документа не бачать і зберегти значення не
  можуть, зокрема запитом напряму (розробник; Q3).

## Non-goals

- Крок «AI document parsing» у редакторі шаблону, у версіях шаблону і в запуску як задача — roadmap WS10 його
  описує, але в цьому зрізі розбір — окремий блок на сторінці запуску (розробник; Q3).
- Завантаження файлів (PDF, зображення): лише вставлений текст (розробник).
- Зміна чи видалення вже збережених значень; вплив збережених значень на задачі запуску.

## Assumptions

- (розробник) AC-DOCAI-01…11 — тимчасові, від розробника, бо вимоги PM з AC немає на 2026-11-16; golden cases —
  дослівно з issue PM.
- (розробник) Розбір — блок «Parse a document» на сторінці запуску з кнопками «Propose values» і «Save values»; назви
  кнопок — розробника.
- (розробник) Опис у golden cases оцінюємо за змістом: той самий зміст і нічого, чого немає в документі; точно
  порівнюємо телефон, категорію, терміновість, позиції й total (Q5).
- (розробник) Текст стану «помічник недоступний» — «The assistant is not available right now. Enter the values
  yourself.», доки PM не дасть свого (Q2).
- (розробник) Нотатка для двох проблем — вільним текстом, що в документі дві проблеми, доки PM не дасть точного тексту
  (Q4).
- Правила кейсів PM: категорії — plumbing, electrical, heating and cooling, appliance, structure and doors, other;
  терміновість — urgent або not urgent; телефони — 555-01xx; суми — у доларах.

## Open questions

Питання вже поставили інші розробники команди; дублікатів не створюємо, чекаємо відповіді PM:

- Q1. Поріг приймання 10 golden cases і чи буде issue «Вимога» з AC для зрізу 4 —
  <https://github.com/solomchaak/property-workflows-spec/issues/55>.
- Q2. Що бачить користувач, коли помічник недоступний (текст і поведінка форми) —
  <https://github.com/solomchaak/property-workflows-spec/issues/52>.
- Q3. Хто користується розбором у запуску й де він: крок шаблону чи блок на сторінці запуску —
  <https://github.com/solomchaak/property-workflows-spec/issues/53>.
- Q4. Текст нотатки для двох проблем і куди зберігаються підтверджені значення —
  <https://github.com/solomchaak/property-workflows-spec/issues/54>.
- Q5. Опис у лапках у кейсах — дослівно чи за змістом —
  <https://github.com/solomchaak/property-workflows-spec/issues/56>.
