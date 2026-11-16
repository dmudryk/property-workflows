import { createOpenRouter } from "@openrouter/ai-sdk-provider";

// Взято з koldovsky/2026-quitcode-10-ai-features-hw/materials/ai-feature/src/lib/ai/models.ts (ADR 0006).
// Кандидати на 16.11.2026 (`npm run ai:models`: усі три є). Безкоштовні моделі з'являються й зникають:
// перед роботою запустіть `npm run ai:models` і перевірте ланцюжок живим прогоном `npm run eval`.
// Порядок = пріоритет. Лише ID із `:free`: платна модель у списку fallback оплачується за її ціною.
//   nemotron-3.5-super-vl     — строга схема (structured_outputs): перша, бо відповідь — JSON за схемою zod;
//   gemma-4-31b / gemma-4-26b — резерв; НЕ мають structured_outputs: json_schema може бути проігноровано,
//     тому поля повторено в промпті, а zod — ворота.
export const PRODUCT_MODELS = [
  "nvidia/nemotron-3.5-super-vl:free",
  "google/gemma-4-31b-it:free",
  "google/gemma-4-26b-a4b-it:free",
] as const;

// Суддя для живого eval — інша родина, ніж моделі продукту (не оцінює відповіді своєї родини), і лише моделі зі
// строгою схемою (SO у `npm run ai:models`). Теж ланцюжком: 16.11 перший прогін зупинився на 429 від постачальника
// Gemma-судді (денний ліміт акаунта при цьому був 0 із 50) — один суддя без резерву обриває весь прогін.
export const JUDGE_MODELS = [
  "inclusionai/ling-3.2-flash:free",
  "baidu/ernie-5.5-flash-preview:free",
  "particle-ai/particle-1:free",
] as const;
export const JUDGE_MODEL = JUDGE_MODELS[0];

// Фабрики приймають ключ параметром і НЕ читають process.env: так їх можна імпортувати в eval-скрипті.
// У коді застосунку модель бере лише src/lib/ai/openrouter.ts (server-only).
export function makeProductModel(apiKey: string | undefined) {
  const openrouter = createOpenRouter({ apiKey, appName: "Stepline document parsing" });
  return openrouter.chat(PRODUCT_MODELS[0], {
    // OpenRouter пробує наступну модель при помилці, ліміті постачальника або простої.
    // Платформний ліміт безкоштовних моделей (20/хв, 50/день на акаунт) ланцюжок НЕ обходить.
    models: [...PRODUCT_MODELS],
    // Портативний параметр `reasoning` з AI SDK 7 цей провайдер не передає — лише його власний.
    reasoning: { effort: "low", exclude: true },
  });
}

export function makeJudgeModel(apiKey: string | undefined) {
  const openrouter = createOpenRouter({ apiKey, appName: "Stepline document parsing eval" });
  return openrouter.chat(JUDGE_MODEL, { models: [...JUDGE_MODELS] });
}
