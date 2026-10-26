import Link from "next/link";
import { NotEnoughRights } from "@/components/not-enough-rights";
import { canManageTemplates, requireActor } from "@/lib/auth/actor";
import { EMPTY_CONTENT, parseContent } from "@/lib/templates/content";
import { TemplateEditor } from "./template-editor";

// Редактор — лише адміністратор; менеджер — «Not enough rights» і «Back to templates» без вмісту редактора
// (AC-DSYS-02). Відвідувача без входу requireActor() веде на /login (AC-EDITOR-09). Роль — ДО читання даних.
// Редактор продовжує зі спільних незбережених змін, якщо вони є, інакше — з поточної версії (AC-EDITOR-01).
export default async function EditTemplatePage({ params }: PageProps<"/templates/[id]/edit">) {
  const { id } = await params;
  const { supabase, actor } = await requireActor();
  if (!canManageTemplates(actor)) return <NotEnoughRights />;

  const [{ data: tpl }, { data: draft }] = await Promise.all([
    supabase.from("templates").select("id, name, current_version, current_content").eq("id", id).maybeSingle(),
    supabase.from("template_drafts").select("content").eq("template_id", id).maybeSingle(),
  ]);
  if (!tpl) {
    return (
      <main className="flex flex-col gap-4">
        <Link href="/templates" className="text-sm underline-offset-4 hover:underline">
          Back to templates
        </Link>
        <p role="alert" className="text-lg font-semibold">
          Template not found
        </p>
      </main>
    );
  }

  const content = parseContent(draft?.content ?? tpl.current_content) ?? EMPTY_CONTENT;

  return (
    <TemplateEditor
      templateId={tpl.id}
      name={tpl.name}
      currentVersion={tpl.current_version}
      initialContent={content}
      initiallyUnpublished={Boolean(draft)}
    />
  );
}
