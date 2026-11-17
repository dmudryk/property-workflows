import { Alert, AlertDescription } from "@/components/ui/alert";
import { canParseDocuments, MSG_DOCUMENTS_LOAD_FAILED, toSavedDocument, type SavedDocument } from "@/lib/runs/documents";
import type { Actor } from "@/lib/runs/rules";
import type { createClient } from "@/lib/supabase/server";
import { DocumentParser } from "./document-parser";
import { SavedDocuments } from "./saved-documents";

// AI-розбір документа на сторінці запуску (impl-ws10-docai/design.md, D1, D2): блок «Parse a document» і збережені
// документи — лише адміністратору й менеджеру запуску (AC-DOCAI-14, AC-DOCAI-15,
// AC-DOCAI-16). Збережені значення читаємо під сесією
// користувача: інші їх не отримують і запитом напряму (політика run_documents_select_manager_admin).

export type RunDocumentsData = { documents: SavedDocument[]; loadFailed: boolean };

// null — користувач не розбирає документи цього запуску: блоку немає. Збій читання — окремий стан, а не порожній
// список (рев'ю CodeRabbit #55): інакше його не відрізнити від «документів ще немає».
export async function loadRunDocuments(
  supabase: Pick<Awaited<ReturnType<typeof createClient>>, "from">,
  actor: Actor | null,
  runId: string,
  managerId: string | null,
): Promise<RunDocumentsData | null> {
  if (!canParseDocuments(actor, managerId)) return null;
  const { data, error } = await supabase.from("run_documents").select("*").eq("run_id", runId).order("created_at", { ascending: false });
  if (error) return { documents: [], loadFailed: true };
  return { documents: (data ?? []).map(toSavedDocument), loadFailed: false };
}

export function RunDocuments({
  runId,
  documents,
  authorLabel,
}: {
  runId: string;
  documents: RunDocumentsData | null;
  authorLabel: (userId: string) => string;
}) {
  if (!documents) return null;
  return (
    <>
      <DocumentParser runId={runId} />
      {documents.loadFailed ? (
        <Alert variant="destructive" data-testid="saved-documents-error">
          <AlertDescription className="text-destructive">{MSG_DOCUMENTS_LOAD_FAILED}</AlertDescription>
        </Alert>
      ) : (
        <SavedDocuments documents={documents.documents} authorLabel={authorLabel} />
      )}
    </>
  );
}
