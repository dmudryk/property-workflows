## Why

Реалізуємо зріз WS7 — специфікацію, злиту зміною `add-ws7-templates` (`openspec/specs/template-editor/spec.md`,
`openspec/specs/design-system/spec.md`): адміністратор редагує шаблон з автоматичним збереженням незбережених змін і
зберігає його як пронумеровану версію; менеджери бачать лише поточну версію; запуск показує свою версію; усі сторінки
— в одній дизайн-системі зі спільними статусами, відмовами й порожніми станами.

## What Changes

Зміна покриває всі 13 AC специфікації зрізу двома вертикальними задачами (див. `tasks.md`):

- редактор шаблону з версіями (`template-editor`) і відмова в правах на редактор (`design-system`): AC-EDITOR-01,
  AC-EDITOR-02, AC-EDITOR-03, AC-EDITOR-04, AC-EDITOR-05, AC-EDITOR-06, AC-EDITOR-07, AC-EDITOR-08, AC-EDITOR-09,
  AC-DSYS-02;
- стани дизайн-системи (`design-system`): AC-DSYS-01, AC-DSYS-03, AC-DSYS-04.
