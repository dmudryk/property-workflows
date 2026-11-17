import { isDeepStrictEqual } from "node:util";
import { Output, generateText, type LanguageModel } from "ai";
import { z } from "zod";
import type { Proposal } from "./document-rules";
import { JUDGE_INSTRUCTIONS, judgePrompt } from "./prompts/judge";

// Взято з koldovsky/2026-quitcode-10-ai-features-hw/materials/ai-feature/src/lib/ai/scorer.ts (ADR 0006).

// Поля, які PM фіксує однозначно (solomchaak/property-workflows-spec#40). Порівнюються точно (масиви — за вмістом).
type ExactFields = Pick<Proposal, "status" | "kind" | "phone" | "category" | "urgency" | "lineItems" | "statedTotal" | "warnings" | "message">;

// Один golden case від PM: вхід → очікуване. Формат файлу — tests/fixtures/golden/cases.json.
export type GoldenCase = {
  id: string; // "GC-01"
  input: string;
  expected: Partial<ExactFields> & {
    notesInclude?: string[]; // дослівні нотатки, які має бути серед notes: нотатки PM перевіряє точно (#56)
  };
  // Слова PM: що має / не має бути у вільному тексті (опис, нотатки). Оцінює LLM-суддя лише в живому eval.
  rubric?: string;
};

type Mismatch = { field: string; expected: unknown; actual: unknown };

// Структурне порівняння: порядок ключів об'єкта не важить, порядок позицій у масиві — важить (рев'ю CodeRabbit #55).
const same = (a: unknown, b: unknown) => isDeepStrictEqual(a, b);

// (1) Детермінована частина: точний збіг полів, зафіксованих PM у golden case.
export function scoreFields(expected: GoldenCase["expected"], actual: Proposal) {
  const { notesInclude, ...exact } = expected;
  const mismatches: Mismatch[] = (Object.keys(exact) as (keyof ExactFields)[])
    .filter((k) => !same(exact[k], actual[k]))
    .map((k) => ({ field: k, expected: exact[k], actual: actual[k] }));
  for (const note of notesInclude ?? []) {
    if (!actual.notes.includes(note)) mismatches.push({ field: "notes", expected: note, actual: actual.notes });
  }
  return { pass: mismatches.length === 0, mismatches };
}

// Вільний текст пропозиції для судді: опис і нотатки.
export function freeText(p: Proposal): string {
  return `Description: ${p.description ?? "(empty)"}\nNotes: ${p.notes.length ? p.notes.join(" | ") : "(none)"}`;
}

// (2) Нечітка частина: LLM-суддя лише для вільного тексту, двійковий вердикт із причиною.
const Verdict = z.object({ pass: z.boolean(), reason: z.string().max(300) });
export type JudgeVerdict = z.infer<typeof Verdict>;

export async function judgeSummary(judge: LanguageModel, rubric: string, summary: string): Promise<JudgeVerdict> {
  const { output } = await generateText({
    model: judge,
    instructions: JUDGE_INSTRUCTIONS,
    prompt: judgePrompt(rubric, summary),
    output: Output.object({ name: "verdict", schema: Verdict }),
    temperature: 0,
    maxRetries: 0, // повтор на безкоштовному тарифі витрачає той самий денний ліміт
  });
  return output;
}

// Поріг приймання PM (solomchaak/property-workflows-spec#40, #55): щонайменше 8 з 10 golden cases проходять, а кейси
// GC-09 (не заявка й не кошторис) і GC-10 (прихована інструкція) — завжди.
export const ACCEPTANCE = { min: 8, of: 10, mustPass: ["GC-09", "GC-10"] } as const;

export type AcceptanceVerdict = {
  status: "passed" | "failed" | "undetermined";
  passed: number;
  /** Кейси без відповіді (NOT RUN, ліміт 429) або не запущені взагалі. */
  missing: string[];
  /** Обов'язкові кейси, що отримали відповідь і не пройшли. */
  failedMust: string[];
};

// Вердикт одного прогону за порогом PM. Кейс без відповіді — ні «пройшов», ні «провалений»: поки він може змінити
// результат, вердикт «не визначено», а не мовчазний «пройдено» з меншої вибірки.
export function acceptanceVerdict(results: { id: string; pass: boolean; notRun?: boolean }[], caseIds: readonly string[]): AcceptanceVerdict {
  const byId = new Map(results.map((r) => [r.id, r]));
  const answered = (id: string) => byId.has(id) && !byId.get(id)?.notRun;
  const passed = caseIds.filter((id) => answered(id) && byId.get(id)?.pass).length;
  const missing = caseIds.filter((id) => !answered(id));
  const failedMust = ACCEPTANCE.mustPass.filter((id) => answered(id) && !byId.get(id)?.pass);
  const verdict = (status: AcceptanceVerdict["status"]) => ({ status, passed, missing, failedMust });
  if (failedMust.length > 0) return verdict("failed");
  // Неповний набір (CASES=GC-10) — поріг рахують на всіх 10 кейсах, тож вердикту немає.
  if (caseIds.length !== ACCEPTANCE.of) return verdict("undetermined");
  if (passed + missing.length < ACCEPTANCE.min) return verdict("failed");
  return verdict(missing.length > 0 ? "undetermined" : "passed");
}

// Частка успіху (pass rate) — визначення з WS8: прогін на задачах із відомими відповідями (ключ) → бал.
export function passRate(results: { pass: boolean }[]): { passed: number; total: number; rate: number } {
  const passed = results.filter((r) => r.pass).length;
  return { passed, total: results.length, rate: results.length ? passed / results.length : 0 };
}
