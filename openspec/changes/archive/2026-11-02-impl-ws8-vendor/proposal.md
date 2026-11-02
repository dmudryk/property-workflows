# План: реалізація зрізу 3 — вендор

## Why

Реалізуємо зріз 3 «Assign a vendor and let the vendor work on their own tasks» (`openspec/specs/vendor-access`,
solomchaak/property-workflows-spec#39) на прохання PM — раніше, ніж у roadmap («WS9 — конвеєр»).

## What Changes

Покриває AC з `openspec/specs/`:

- `vendor-access`: AC-VENDOR-01, AC-VENDOR-02, AC-VENDOR-03, AC-VENDOR-04, AC-VENDOR-05, AC-VENDOR-06, AC-VENDOR-07,
  AC-VENDOR-08, AC-VENDOR-09, AC-VENDOR-10;
- змінені вимоги без нових AC — `workflow-runs` (AC-RUN-04: виконавцем може бути вендор) і `run-tasks` (AC-TASK-08:
  виняток для вендора) — тести цих AC лишаються зеленими.
