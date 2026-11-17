import { z } from "zod";
import { CATEGORIES, KINDS, LineItemSchema, URGENCIES, type Category, type DocumentKind, type Draft, type LineItem, type Urgency } from "./schema";

// Правила, які перевіряє КОД після відповіді моделі (impl-ws10-docai/design.md, D9): модель пропонує, сервер перевіряє.
// Чисті функції без мережі й ключа — їх імпортують Server Actions, офлайн-тести й живий eval.

// Тексти для користувача — дослівно з AC (openspec/specs/document-parsing/spec.md).
export const REFUSAL_MESSAGE = "This document is not a maintenance request or an estimate."; // AC-DOCAI-09
export const INJECTION_NOTE = "the text contains instructions to the AI that were ignored"; // AC-DOCAI-10
export const UNAVAILABLE_MESSAGE = "The assistant is not available now. Fill in the values yourself."; // AC-DOCAI-13
export const TWO_PROBLEMS_NOTE = "the email has two problems"; // AC-DOCAI-07

// Пропозиція, яку бачить людина: відповідь моделі після правил коду.
export type Proposal = {
  status: "ok" | "refused";
  kind: DocumentKind | null;
  phone: string | null;
  description: string | null;
  category: Category | null;
  urgency: Urgency | null;
  lineItems: LineItem[];
  statedTotal: number | null;
  notes: string[]; // нотатки моделі (ризик) + дослівні нотатки від коду: дві проблеми, ін'єкція
  warnings: string[]; // попередження, які рахує код (сума кошторису)
  message: string | null; // відмова
};

const DIGIT_WORDS: Record<string, string> = {
  zero: "0",
  oh: "0",
  one: "1",
  two: "2",
  three: "3",
  four: "4",
  five: "5",
  six: "6",
  seven: "7",
  eight: "8",
  nine: "9",
};

// Групи цифр документа в порядку появи; продиктовані цифри («five five five, zero one») — теж цифри.
// Слово, що не є цифрою, розриває групу: «apartment 12 … phone 555-0101» → ["12", "5550101"].
function digitGroups(text: string): string[] {
  const groups: string[] = [];
  let current = "";
  for (const token of text.toLowerCase().match(/[a-z]+|\d+/g) ?? []) {
    const digits = /^\d+$/.test(token) ? token : DIGIT_WORDS[token];
    if (digits) current += digits;
    else if (current) {
      groups.push(current);
      current = "";
    }
  }
  if (current) groups.push(current);
  return groups;
}

// AC-DOCAI-01: телефон в одній формі (ddd-dddd). AC-DOCAI-06: телефона, цифр якого немає в документі, не вигадуємо.
export function normalizePhone(raw: string | null, documentText: string): string | null {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (digits.length < 7) return null;
  if (!digitGroups(documentText).some((g) => g.includes(digits))) return null;
  if (digits.length === 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  // Код країни 1 перед десятьма цифрами — той самий номер: одна форма ddd-ddd-dddd (code-review 16.11).
  const national = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (national.length === 10) return `${national.slice(0, 3)}-${national.slice(3, 6)}-${national.slice(6)}`;
  return national;
}

const cents = (n: number) => Math.round(n * 100);
const money = (c: number) => (c / 100).toFixed(2);

// AC-DOCAI-08: суму позицій рахує код, а не модель; значення документа не виправляємо.
export function totalWarning(items: LineItem[], statedTotal: number | null): string | null {
  if (items.length === 0 || statedTotal === null) return null;
  const sum = items.reduce((s, i) => s + cents(i.quantity * i.unitPrice), 0);
  const total = cents(statedTotal);
  return sum === total ? null : `items add up to ${money(sum)}, the stated total is ${money(total)}`;
}

// AC-DOCAI-10: явна інструкція для AI в тексті — нотатку додає код, навіть якщо модель прапорця не поставила.
// Вузько, щоб не ловити звичайний текст орендаря («please don't ignore my request, the building rules…»,
// «I hope you are now aware»): лише звернення до самого AI (code-review 16.11).
const INJECTION_PATTERNS = [
  /\b(ignore|disregard|forget)\b[^.!?]{0,20}\b(previous|prior|above|earlier)\s+(instructions?|rules|prompts?)\b/i,
  /\b(ignore|disregard)\s+(all\s+|your\s+|these\s+)?instructions\b/i,
  /\b(system|your)\s+prompt\b/i,
  /\byou are now (an?|the|my)\s+(ai|assistant|bot|model|system)\b/i,
];

export function looksLikeInjection(text: string): boolean {
  return INJECTION_PATTERNS.some((p) => p.test(text));
}

// AC-DOCAI-07: нотатку про кілька проблем модель пише своїми словами («The document has two problems.»), а PM вимагає
// дослівну «the email has two problems» (solomchaak/property-workflows-spec#54, нотатки — точно, #56). Таку нотатку
// моделі замінює код, як нотатку ін'єкції; нотатки про інше («possible gas leak») лишаються як є.
const MULTIPLE_PROBLEMS = /\b(two|2|multiple|several)\s+(?:separate\s+|different\s+)?(problems|issues)\b/i;

export function aboutMultipleProblems(note: string): boolean {
  return MULTIPLE_PROBLEMS.test(note);
}

// Замінюємо лише твердження про кількість проблем, а не всю нотатку: у складеній «Two issues reported; possible gas
// leak» ризик лишається окремою нотаткою (рев'ю CodeRabbit #60). Дослівна нотатка — один раз, на місці першої такої.
export function withTwoProblemsNote(notes: string[]): string[] {
  if (!notes.some(aboutMultipleProblems)) return notes;
  const out: string[] = [];
  for (const note of notes) {
    if (!aboutMultipleProblems(note)) {
      out.push(note);
      continue;
    }
    for (const part of note.split(/[.;!?]+/).map((p) => p.trim()).filter(Boolean)) {
      out.push(aboutMultipleProblems(part) ? TWO_PROBLEMS_NOTE : part);
    }
  }
  return [...new Set(out)];
}

function cleanText(s: string | null, max: number): string | null {
  const t = (s ?? "").trim().slice(0, max);
  return t ? t : null;
}

export const EMPTY_PROPOSAL: Omit<Proposal, "status" | "message"> = {
  kind: null,
  phone: null,
  description: null,
  category: null,
  urgency: null,
  lineItems: [],
  statedTotal: null,
  notes: [],
  warnings: [],
};

export function finalizeDraft(draft: Draft, documentText: string): Proposal {
  // AC-DOCAI-09: відмова — жодного значення, лише текст відмови.
  if (draft.status === "refused") return { status: "refused", ...EMPTY_PROPOSAL, message: REFUSAL_MESSAGE };

  const lineItems = draft.lineItems ?? [];
  const injection = draft.injectionIgnored || looksLikeInjection(documentText);
  const modelNotes = withTwoProblemsNote((draft.notes ?? []).map((n) => n.trim()).filter(Boolean));
  // Власну нотатку моделі про інструкції замінює дослівна нотатка AC-DOCAI-10.
  // Прибираємо лише власну нотатку моделі саме про проігноровані інструкції, а не будь-яку зі словом «instruction»
  // («tenant left instructions to call before visiting» лишається; code-review 16.11).
  const aboutIgnored = (n: string) => /instruction/i.test(n) && /(ignor|disregard|not follow|did not follow)/i.test(n);
  const notes = injection ? [...modelNotes.filter((n) => !aboutIgnored(n)), INJECTION_NOTE] : modelNotes;
  const warning = totalWarning(lineItems, draft.statedTotal);

  return {
    status: "ok",
    kind: draft.kind,
    phone: normalizePhone(draft.phone, documentText),
    description: cleanText(draft.description, 500),
    category: draft.category,
    urgency: draft.urgency,
    lineItems,
    statedTotal: draft.statedTotal,
    notes,
    warnings: warning ? [warning] : [],
    message: null,
  };
}

// Значення, які людина надсилає кнопкою «Save values» (AC-DOCAI-04): клієнт може надіслати що завгодно,
// тож сервер перевіряє їх ще раз — переліки, кількість > 0, довжини — і лише тоді пише в базу.
export const SaveValuesSchema = z
  .object({
    kind: z.enum(KINDS),
    phone: z.string().trim().max(40).nullable(),
    description: z.string().trim().max(500).nullable(),
    category: z.enum(CATEGORIES).nullable(),
    urgency: z.enum(URGENCIES).nullable(),
    lineItems: z.array(LineItemSchema).max(50),
    statedTotal: z.number().nonnegative().max(100_000_000).nullable(),
    notes: z.array(z.string().trim().min(1).max(300)).max(6),
  })
  .transform((v) => ({ ...v, phone: v.phone || null, description: v.description || null }));

export type SaveValues = z.output<typeof SaveValuesSchema>;

export const EMPTY_VALUES_ERROR = "Enter at least one value before saving.";

export function hasAnyValue(v: SaveValues): boolean {
  return Boolean(v.phone || v.description || v.category || v.urgency || v.lineItems.length || v.statedTotal !== null);
}
