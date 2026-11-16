import { canParseDocuments, toSavedDocument, type SavedDocument } from "@/lib/runs/documents";
import type { Actor } from "@/lib/runs/rules";
import type { createClient } from "@/lib/supabase/server";
import { DocumentParser } from "./document-parser";
import { SavedDocuments } from "./saved-documents";

// AI-розбір документа на сторінці запуску (impl-ws10-docai/design.md, D1, D2): блок «Parse a document» і збережені
// документи — лише адміністратору й менеджеру запуску (AC-DOCAI-11). Збережені значення читаємо під сесією
// користувача: інші їх не отримують і запитом напряму (політика run_documents_select_manager_admin).

// null — користувач не розбирає документи цього запуску: блоку немає.
export async function loadRunDocuments(
  supabase: Awaited<ReturnType<typeof createClient>>,
  actor: Actor | null,
  runId: string,
  managerId: string | null,
): Promise<SavedDocument[] | null> {
  if (!canParseDocuments(actor, managerId)) return null;
  const { data } = await supabase.from("run_documents").select("*").eq("run_id", runId).order("created_at", { ascending: false });
  return (data ?? []).map(toSavedDocument);
}

export function RunDocuments({
  runId,
  documents,
  authorLabel,
}: {
  runId: string;
  documents: SavedDocument[] | null;
  authorLabel: (userId: string) => string;
}) {
  if (!documents) return null;
  return (
    <>
      <DocumentParser runId={runId} />
      <SavedDocuments documents={documents} authorLabel={authorLabel} />
    </>
  );
}
