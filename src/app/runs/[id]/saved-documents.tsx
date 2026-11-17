import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KIND_LABELS, money, type SavedDocument } from "@/lib/runs/documents";
import { formatKyivRecordDateTime } from "@/lib/templates/format";

// Збережені документи запуску (impl-ws10-docai/design.md, D2): те, що людина підтвердила кнопкою «Save values» —
// тип документа, значення, email того, хто підтвердив, дата й час за Києвом; новіший — першим (AC-DOCAI-04).
// Порожнього списку не показуємо (DESIGN.md, розділ 6).
function Value({ label, value, testId }: { label: string; value: string | null; testId?: string }) {
  return value ? (
    <div className="flex flex-col">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd data-testid={testId} className="text-sm">
        {value}
      </dd>
    </div>
  ) : null;
}

export function SavedDocuments({ documents, authorLabel }: { documents: SavedDocument[]; authorLabel: (id: string) => string }) {
  if (documents.length === 0) return null;
  return (
    <Card data-testid="saved-documents" className="bg-background">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Saved documents</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-4">
          {documents.map((d) => (
            <li key={d.id} data-testid="saved-document" className="flex flex-col gap-2 border-t border-border pt-4 first:border-t-0 first:pt-0">
              <p className="text-sm font-medium">
                {KIND_LABELS[d.kind]}
                <span className="font-normal text-muted-foreground">
                  {" "}
                  · <span data-testid="saved-author">{authorLabel(d.createdBy)}</span> ·{" "}
                  <span data-testid="saved-at" className="tabular-nums">
                    {formatKyivRecordDateTime(d.createdAt)}
                  </span>
                </span>
              </p>
              <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Value label="Document type" value={KIND_LABELS[d.kind]} testId="saved-kind" />
                <Value label="Phone" value={d.phone} testId="saved-phone" />
                <Value label="Description" value={d.description} testId="saved-description" />
                <Value label="Category" value={d.category} testId="saved-category" />
                <Value label="Urgency" value={d.urgency} testId="saved-urgency" />
                <Value label="Total" value={d.statedTotal === null ? null : money(d.statedTotal)} testId="saved-total" />
              </dl>
              {d.lineItems.length > 0 ? (
                <ol className="flex flex-col gap-1 text-sm">
                  {d.lineItems.map((i, n) => (
                    <li key={n} className="tabular-nums">
                      {i.description}, {i.quantity} × {money(i.unitPrice)}
                    </li>
                  ))}
                </ol>
              ) : null}
              {d.notes.length > 0 ? (
                <ul className="list-disc pl-5 text-sm text-muted-foreground">
                  {d.notes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
