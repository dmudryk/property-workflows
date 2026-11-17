import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SavedDocuments } from "@/app/runs/[id]/saved-documents";
import {
  documentBlockView,
  EMPTY_FORM_VALUES,
  isPlainTextFile,
  KIND_OPTIONS,
  MSG_EMPTY_DOCUMENT,
  MSG_READING,
  MSG_TEXT_FILES_ONLY,
  type SavedDocument,
} from "@/lib/runs/documents";

// Блок «Parse a document» (impl-clarify-ws10-docai/design.md, D2): що він показує в кожному стані — чиста функція
// documentBlockView, яку використовує компонент; тексти — дослівно з AC; збережений запис — справжній рендер
// SavedDocuments. Кліки й файл у браузері — e2e на проді (tests/e2e/docai-*.spec.ts).

describe("стан блоку", () => {
  it("AC-DOCAI-03: поки AI читає — «Reading the document…», жодного значення й повідомлення", () => {
    expect(MSG_READING).toBe("Reading the document…");
    // Нова відповідь ще не прийшла, а попередня пропозиція є — її теж не показуємо.
    expect(documentBlockView({ status: "proposed", pending: true, closed: false })).toEqual({ reading: true, message: false, values: false });
    expect(documentBlockView({ status: "idle", pending: true, closed: true })).toEqual({ reading: true, message: false, values: false });
  });

  it("AC-DOCAI-05: «Discard» після пропозиції — блок знову порожній", () => {
    expect(documentBlockView({ status: "proposed", pending: false, closed: false })).toEqual({ reading: false, message: false, values: true });
    expect(documentBlockView({ status: "proposed", pending: false, closed: true })).toEqual({ reading: false, message: false, values: false });
  });

  it("AC-DOCAI-09: відмова — лише повідомлення, жодного значення", () => {
    expect(documentBlockView({ status: "refused", pending: false, closed: false })).toEqual({ reading: false, message: true, values: false });
  });

  it("AC-DOCAI-11: порожній текст — «Paste the text of a document», жодного значення", () => {
    expect(MSG_EMPTY_DOCUMENT).toBe("Paste the text of a document");
    expect(documentBlockView({ status: "error", pending: false, closed: false })).toEqual({ reading: false, message: true, values: false });
  });

  it("AC-DOCAI-13: помічник недоступний — повідомлення й порожня форма, Document type теж не вибрано", () => {
    expect(documentBlockView({ status: "unavailable", pending: false, closed: false })).toEqual({ reading: false, message: true, values: true });
    expect(EMPTY_FORM_VALUES).toEqual({
      kind: null,
      phone: "",
      description: "",
      category: null,
      urgency: null,
      lineItems: [],
      statedTotal: "",
      notes: [],
    });
    expect(KIND_OPTIONS).toEqual([
      { value: null, label: "Not set" },
      { value: "request", label: "Maintenance request" },
      { value: "estimate", label: "Estimate" },
    ]);
  });
});

describe("файл", () => {
  it("AC-DOCAI-12: «photo.png» — «Only plain text files (.txt) are accepted»", () => {
    expect(MSG_TEXT_FILES_ONLY).toBe("Only plain text files (.txt) are accepted");
    expect(isPlainTextFile({ name: "photo.png", type: "image/png" })).toBe(false);
    expect(isPlainTextFile({ name: "estimate.pdf", type: "application/pdf" })).toBe(false);
    expect(isPlainTextFile({ name: "request.docx", type: "" })).toBe(false);
    // «.txt» у назві, але браузер каже, що це зображення, — не текст.
    expect(isPlainTextFile({ name: "photo.txt", type: "image/png" })).toBe(false);
  });

  it("AC-DOCAI-12: простий текстовий файл .txt приймаємо — з типом text/plain чи без типу", () => {
    expect(isPlainTextFile({ name: "request.txt", type: "text/plain" })).toBe(true);
    expect(isPlainTextFile({ name: "ESTIMATE.TXT", type: "" })).toBe(true);
    expect(isPlainTextFile({ name: "note.txt", type: "text/plain;charset=utf-8" })).toBe(true);
  });
});

describe("збережений запис", () => {
  const saved: SavedDocument = {
    id: "doc-1",
    kind: "request",
    phone: "555-0101",
    description: "Kitchen tap in apartment 12 has been dripping for three days",
    category: "plumbing",
    urgency: "urgent",
    lineItems: [],
    statedTotal: null,
    notes: [],
    createdBy: "manager-a",
    createdAt: "2026-11-12T08:15:00Z",
  };

  it("AC-DOCAI-04: запис показує Document type, значення, email того, хто підтвердив, дату й час за Києвом", () => {
    const html = renderToStaticMarkup(
      createElement(SavedDocuments, { documents: [saved], authorLabel: (id: string) => (id === "manager-a" ? "a@example.test" : "—") }),
    );

    expect(html).toContain("Document type");
    expect(html).toContain("Maintenance request");
    expect(html).toContain("555-0101");
    expect(html).toContain("plumbing");
    expect(html).toContain(">urgent<");
    expect(html).toContain('data-testid="saved-author">a@example.test<');
    expect(html).toContain("12 Nov 2026, 10:15");
  });
});
