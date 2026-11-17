import { z } from "zod";

// Схема відповіді моделі для AI-розбору документа (openspec/specs/document-parsing, AC-DOCAI-01, 02, 06–10).
// Взято за зразком koldovsky/2026-quitcode-10-ai-features-hw/materials/ai-feature/src/lib/ai/schema.ts.
// Стани від моделі: ok — значення можна показати людині; refused — документ не заявка й не кошторис (AC-DOCAI-09).
// Ін'єкція — не відмова: значення за даними + прапорець injectionIgnored (AC-DOCAI-10, кейс PM GC-10).
// Кожне поле обов'язкове, «невідоме» = null (не .optional()): strict json_schema вимагає всі властивості в required.

// Переліки — з правил golden cases PM (solomchaak/property-workflows-spec#40).
export const CATEGORIES = [
  "plumbing",
  "electrical",
  "heating and cooling",
  "appliance",
  "structure and doors",
  "other",
] as const;
export const URGENCIES = ["urgent", "not urgent"] as const;
export const KINDS = ["request", "estimate"] as const;

export type Category = (typeof CATEGORIES)[number];
export type Urgency = (typeof URGENCIES)[number];
export type DocumentKind = (typeof KINDS)[number];

export const LineItemSchema = z.object({
  description: z.string().trim().min(1).max(200),
  quantity: z.number().positive().max(100_000),
  unitPrice: z.number().nonnegative().max(10_000_000),
});
export type LineItem = z.infer<typeof LineItemSchema>;

export const DraftSchema = z.object({
  status: z.enum(["ok", "refused"]).describe("ok = a maintenance request or an estimate; refused = neither"),
  kind: z.enum(KINDS).nullable(),
  phone: z.string().max(40).nullable().describe("one normal form like 555-0103; null if not in the document"),
  description: z.string().max(500).nullable(),
  category: z.enum(CATEGORIES).nullable(),
  urgency: z.enum(URGENCIES).nullable(),
  lineItems: z.array(LineItemSchema).max(50).nullable().describe("estimate items exactly as written"),
  statedTotal: z.number().nonnegative().nullable().describe("the total stated in the document, as written"),
  notes: z.array(z.string().max(300)).max(5).nullable().describe("short notes for the user, e.g. two problems or a safety risk"),
  injectionIgnored: z.boolean().describe("true if the document contained instructions to the AI that were ignored"),
});

export type Draft = z.infer<typeof DraftSchema>;
