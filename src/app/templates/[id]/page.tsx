import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { canManageTemplates, requireActor } from "@/lib/auth/actor";
import { requiredLabel } from "@/lib/runs/rules";
import { EMPTY_CONTENT, parseContent } from "@/lib/templates/content";
import { versionLabel } from "@/lib/templates/format";

// Шаблон: поточна версія з секціями й задачами (AC-EDITOR-02). Адміністратор додатково бачить позначку
// «Unpublished changes» (AC-EDITOR-01) і посилання на редактор і список версій. Шаблон, якого користувач не бачить
// (RLS: менеджер — лише збережені), — «Template not found» без даних (до відповіді PM, solomchaak/property-workflows-spec#26).
export default async function TemplatePage({ params }: PageProps<"/templates/[id]">) {
  const { id } = await params;
  const { supabase, actor } = await requireActor();
  const admin = canManageTemplates(actor);

  const { data: tpl } = await supabase
    .from("templates")
    .select("id, name, current_version, current_content")
    .eq("id", id)
    .maybeSingle();
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

  const { data: draft } = admin
    ? await supabase.from("template_drafts").select("template_id").eq("template_id", id).maybeSingle()
    : { data: null };
  const content = parseContent(tpl.current_content) ?? EMPTY_CONTENT;

  return (
    <main className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link href="/templates" className="text-sm underline-offset-4 hover:underline">
          Back to templates
        </Link>
        <h1 className="text-2xl font-semibold">{tpl.name}</h1>
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span data-testid="template-version" className="tabular-nums">
            {versionLabel(tpl.current_version)}
          </span>
          {draft ? <StatusBadge data-testid="unpublished" kind="unpublished" /> : null}
        </div>
        {admin ? (
          <div className="flex flex-wrap gap-3">
            <Link href={`/templates/${id}/edit`} className={buttonVariants({ variant: "outline" })}>
              Edit
            </Link>
            <Link href={`/templates/${id}/versions`} className={buttonVariants({ variant: "outline" })}>
              Versions
            </Link>
          </div>
        ) : null}
      </div>

      {tpl.current_version === null ? (
        <p className="text-base text-muted-foreground">This template has no saved version yet.</p>
      ) : (
        content.sections.map((section) => (
          <Card key={section.id} size="sm">
            <CardHeader>
              <CardTitle>
                <h2 className="text-lg font-semibold">{section.name}</h2>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col divide-y">
                {section.tasks.map((task) => (
                  <li key={task.id} data-testid="template-task" className="flex items-center justify-between gap-2 py-2">
                    <span>{task.name}</span>
                    <span className="text-sm text-muted-foreground">{requiredLabel(task.required)}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))
      )}
    </main>
  );
}
