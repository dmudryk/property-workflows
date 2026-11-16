# План: реалізація зрізу 4 за вимогою PM — AI-розбір документа

## Why

PM 2026-11-16 опублікував вимогу зрізу 4 з AC-DOCAI-01…16 (solomchaak/property-workflows-spec#59) і відповів на
питання #52–#58; специфікацію оновила зміна `clarify-ws10-docai`. Більшість поведінки вже зробила зміна
`impl-ws10-docai`; ця зміна — план реалізації нових і змінених AC у тому самому зрізі.

## What Changes

AC з `openspec/specs/document-parsing`, які покриває зміна:

- змінені: AC-DOCAI-02 (Document type «Estimate»), AC-DOCAI-04 (запис з email і часом за Києвом), AC-DOCAI-07
  (дослівна нотатка), AC-DOCAI-13 (новий текст, порожній Document type);
- нові: AC-DOCAI-03, AC-DOCAI-05, AC-DOCAI-11, AC-DOCAI-12, AC-DOCAI-14, AC-DOCAI-15;
- без змін коду, лише тести з новими ID: AC-DOCAI-01, AC-DOCAI-06, AC-DOCAI-08, AC-DOCAI-09, AC-DOCAI-10, AC-DOCAI-16.
