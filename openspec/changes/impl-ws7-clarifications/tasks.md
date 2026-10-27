## 1. Правила редактора після уточнень PM (PR «Реалізація» `task/editor-rules`)

Done when: AC-EDITOR-02, AC-EDITOR-03, AC-EDITOR-10, AC-EDITOR-11, AC-EDITOR-12, AC-EDITOR-13, AC-EDITOR-14,
AC-EDITOR-15, AC-EDITOR-16, AC-EDITOR-17, AC-EDITOR-18, AC-EDITOR-19, AC-EDITOR-20, AC-EDITOR-21, AC-EDITOR-22,
AC-EDITOR-23, AC-EDITOR-24, AC-EDITOR-25, AC-EDITOR-26, AC-EDITOR-27, AC-EDITOR-28, AC-EDITOR-29 — «реалізовано» в
`docs/conformance.md`.

- [x] 1.1 Міграція `…_template_name_rules.sql`:
  - назва шаблону в незбережених змінах і версіях; порожні назви — до збереження;
  - перевірки збереження R2, унікальна назва (функція + індекс), автор версії 1 (R4).
- [x] 1.2 `src/lib/templates/content.ts` (назва шаблону, порожні назви) і `src/lib/templates/errors.ts` (тексти з AC).
  Дія `createTemplate` (порожня й зайнята назва).
- [x] 1.3 Редактор: поле «Template name», порожні назви, стан змін у фіксованому місці (AC-EDITOR-25).
  Сторінки `/templates`, `/templates/[id]`, `/templates/[id]/versions` (порожні стани, «required»/«optional», «Launch»).
  Форма запуску з недоступним незбереженим шаблоном.
- [x] 1.4 Тести бази (зокрема хук міграцій для AC-EDITOR-27), дій, рендеру й чистих функцій на кожен AC задачі.
  Мутаційна перевірка — таблиця в описі PR.

## 2. Вибір теми й повернення після входу (PR «Реалізація» `task/theme-and-return`)

Done when: AC-DSYS-05, AC-DSYS-06, AC-DSYS-07, AC-DSYS-08 — «реалізовано» в `docs/conformance.md`.

- [ ] 2.1 ADR 0003 «Вибір теми».
  - Тема: cookie `theme`, `<html data-theme>`, темні токени й `@custom-variant dark` у `globals.css`, `ThemeSelect` в
    `AppShell`.
  - Документи: `DESIGN.md` і `AGENTS.md` — про тему.
- [ ] 2.2 Повернення після входу: `next` у proxy, `safeNextPath`, сторінка й дія входу.
- [ ] 2.3 Тести AC-DSYS-05…08.
  - Знімки з проду: тема й нові стани.
  - Рядки `docs/conformance.md`.
  - `npx openspec archive impl-ws7-clarifications -y`.
