## 1. Критерії PM у блоці, правилах і eval (PR «Реалізація» `task/docai-pm-criteria`)

Done when: AC-DOCAI-02, AC-DOCAI-03, AC-DOCAI-04, AC-DOCAI-05, AC-DOCAI-07, AC-DOCAI-11, AC-DOCAI-12, AC-DOCAI-13,
AC-DOCAI-14, AC-DOCAI-15 — «реалізовано» в `docs/conformance.md`; `npm run ac:coverage` зелений.

- [x] 1.1 Тексти й правила: «Estimate», «Paste the text of a document», «Only plain text files (.txt) are accepted»,
  «Reading the document…», новий текст «помічник недоступний», дослівна нотатка «the email has two problems»
  (design.md, D1).
- [x] 1.2 Блок: «Upload a text file», стан читання, форма лише після пропозиції чи «недоступний», порожній Document
  type, «Discard»; запис з Document type, email і часом за Києвом (design.md, D2, D3).
- [x] 1.3 Eval: точні нотатки кейсів 5 і 6, вердикт за порогом PM у звіті (design.md, D4).
- [x] 1.4 Тести з AC ID (design.md, D5); `docs/conformance.md`.

## 2. UAT на проді (PR «Реалізація» `task/uat-docai-pm-criteria`)

Done when: живий eval на проді за порогом PM — «ПРОЙДЕНО»; звіт UAT на проді з PASS на кожен AC задачі 1; archive
`impl-clarify-ws10-docai`.

- [x] 2.1 Живий eval (`npm run eval`, 10 кейсів) після деплою; звіт у `evals/reports/`.
- [x] 2.2 Специфікації Playwright на AC-DOCAI-03, AC-DOCAI-05, AC-DOCAI-11, AC-DOCAI-12 і оновлені AC-DOCAI-04,
  AC-DOCAI-09; прогін на проді, звіт і відео.
- [x] 2.3 archive `impl-clarify-ws10-docai`.
