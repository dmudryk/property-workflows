import type { Category, DocumentKind, LineItem, Urgency } from "@/lib/ai/schema";
import type { Actor } from "./rules";

// Хто розбирає документ і зберігає значення в запуску: адміністратор або менеджер запуску (AC-DOCAI-14, AC-DOCAI-15,
// AC-DOCAI-16).
// Та сама межа в базі — private.can_manage_run (міграція …_run_documents.sql); тут — щоб сторінка не показувала блок
// і дія не кликала модель для того, кому база однаково відмовить.
export function canParseDocuments(actor: Actor | null, managerId: string | null): boolean {
  if (!actor) return false;
  if (actor.role === "admin") return true;
  return actor.role === "manager" && managerId !== null && managerId === actor.id;
}

export const KIND_LABELS: Record<DocumentKind, string> = {
  request: "Maintenance request",
  estimate: "Estimate", // AC-DOCAI-02
};

// Значення форми блоку «Parse a document»: рядки полів введення, як їх бачить і виправляє людина.
export type DocumentFormItem = { description: string; quantity: string; unitPrice: string };
export type DocumentFormValues = {
  kind: DocumentKind | null;
  phone: string;
  description: string;
  category: Category | null;
  urgency: Urgency | null;
  lineItems: DocumentFormItem[];
  statedTotal: string;
  notes: string[];
};

// Порожня форма ручного введення: і Document type не вибрано (AC-DOCAI-13).
export const EMPTY_FORM_VALUES: DocumentFormValues = {
  kind: null,
  phone: "",
  description: "",
  category: null,
  urgency: null,
  lineItems: [],
  statedTotal: "",
  notes: [],
};

// Вибір «Document type»: два значення PM і «Not set», поки тип не вибрано (AC-DOCAI-13).
export const KIND_OPTIONS: { value: DocumentKind | null; label: string }[] = [
  { value: null, label: "Not set" },
  ...(["request", "estimate"] as const).map((k) => ({ value: k, label: KIND_LABELS[k] })),
];

// Збережений документ запуску (public.run_documents), як його показує сторінка.
export type SavedDocument = {
  id: string;
  kind: DocumentKind;
  phone: string | null;
  description: string | null;
  category: Category | null;
  urgency: Urgency | null;
  lineItems: LineItem[];
  statedTotal: number | null;
  notes: string[];
  createdBy: string;
  createdAt: string;
};

type Row = {
  id: string;
  kind: string;
  phone: string | null;
  description: string | null;
  category: string | null;
  urgency: string | null;
  line_items: unknown;
  stated_total: number | string | null;
  notes: string[] | null;
  created_by: string;
  created_at: string;
};

const num = (v: unknown) => (typeof v === "number" ? v : Number(v));

export function toSavedDocument(row: Row): SavedDocument {
  const items = Array.isArray(row.line_items) ? (row.line_items as Record<string, unknown>[]) : [];
  return {
    id: row.id,
    kind: row.kind as DocumentKind,
    phone: row.phone,
    description: row.description,
    category: row.category as Category | null,
    urgency: row.urgency as Urgency | null,
    lineItems: items.map((i) => ({ description: String(i.description ?? ""), quantity: num(i.quantity), unitPrice: num(i.unit_price) })),
    statedTotal: row.stated_total === null ? null : num(row.stated_total),
    notes: row.notes ?? [],
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

export const money = (n: number) => n.toFixed(2);

// Тексти блоку — дослівно з AC вимоги PM (openspec/specs/document-parsing/spec.md).
export const MSG_EMPTY_DOCUMENT = "Paste the text of a document"; // AC-DOCAI-11
export const MSG_TEXT_FILES_ONLY = "Only plain text files (.txt) are accepted"; // AC-DOCAI-12
export const MSG_READING = "Reading the document…"; // AC-DOCAI-03
export const MSG_SAVE_FAILED = "The values could not be saved. Try again.";
export const MSG_DOCUMENTS_LOAD_FAILED = "Saved documents could not be loaded. Reload the page to try again.";

// Значення людини не пройшло повторну перевірку на сервері — повідомлення називає поле, а не «спробуйте ще раз»:
// повтор із тим самим значенням не допоможе (code-review 16.11).
const FIELD_LABELS: Record<string, string> = {
  kind: "Document type",
  phone: "Phone",
  description: "Description",
  category: "Category",
  urgency: "Urgency",
  statedTotal: "Total",
  notes: "Notes",
};

// AC-DOCAI-12: кнопка «Upload a text file» приймає лише простий текстовий файл .txt (PDF, фото, скани, Word — поза
// межами, solomchaak/property-workflows-spec#58). Тип, якщо браузер його знає, теж має бути текстовим: «.txt» із
// типом зображення — не текст.
export function isPlainTextFile(file: { name: string; type: string }): boolean {
  return /\.txt$/i.test(file.name.trim()) && (file.type === "" || file.type.startsWith("text/plain"));
}

export type ProposeStatus = "idle" | "proposed" | "refused" | "unavailable" | "error";

// Що показує блок під полем тексту. Поки AI читає — лише «Reading the document…» і жодного значення (AC-DOCAI-03).
// Значення — після пропозиції або порожні для ручного введення, коли помічник недоступний (AC-DOCAI-13); після відмови
// (AC-DOCAI-09) чи помилки (порожній текст, AC-DOCAI-11; «Not enough rights», AC-DOCAI-16) — лише повідомлення.
// closed — пропозицію відкинуто (AC-DOCAI-05), збережено (AC-DOCAI-04) чи завантажено інший файл: блок знову порожній.
export function documentBlockView({ status, pending, closed }: { status: ProposeStatus; pending: boolean; closed: boolean }) {
  const open = !pending && !closed;
  return {
    reading: pending,
    message: open && (status === "refused" || status === "unavailable" || status === "error"),
    values: open && (status === "proposed" || status === "unavailable"),
  };
}

export function invalidFieldMessage(path: readonly PropertyKey[]): string {
  const [field, index, sub] = path;
  if (field === "lineItems" && typeof index === "number") {
    const n = index + 1;
    if (sub === "quantity") return `Item ${n}: enter a quantity above 0.`;
    if (sub === "unitPrice") return `Item ${n}: enter a unit price of 0 or more.`;
    return `Item ${n}: enter a name.`;
  }
  return `Check the value of ${FIELD_LABELS[String(field)] ?? "the form"}.`;
}
