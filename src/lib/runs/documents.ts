import type { Category, DocumentKind, LineItem, Urgency } from "@/lib/ai/schema";
import type { Actor } from "./rules";

// Хто розбирає документ і зберігає значення в запуску: адміністратор або менеджер запуску (AC-DOCAI-11).
// Та сама межа в базі — private.can_manage_run (міграція …_run_documents.sql); тут — щоб сторінка не показувала блок
// і дія не кликала модель для того, кому база однаково відмовить.
export function canParseDocuments(actor: Actor | null, managerId: string | null): boolean {
  if (!actor) return false;
  if (actor.role === "admin") return true;
  return actor.role === "manager" && managerId !== null && managerId === actor.id;
}

export const KIND_LABELS: Record<DocumentKind, string> = {
  request: "Maintenance request",
  estimate: "Vendor estimate",
};

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

export const MSG_EMPTY_DOCUMENT = "Paste the text of a document first.";
export const MSG_SAVE_FAILED = "The values could not be saved. Try again.";
export const MSG_DOCUMENTS_LOAD_FAILED = "Saved documents could not be loaded. Reload the page to try again.";
