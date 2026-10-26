import { CircleIcon, HistoryIcon, PencilIcon } from "lucide-react";
import Link from "next/link";
import { Chip } from "@/components/chip";
import { NumberBadge } from "@/components/number-badge";
import { PageHeader } from "@/components/page-header";
import { RequirementPill } from "@/components/requirement-pill";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { canManageTemplates, requireActor } from "@/lib/auth/actor";
import { cn } from "@/lib/utils";
import { EMPTY_CONTENT, parseContent, summarizeContent } from "@/lib/templates/content";
import { countLabel, versionLabel } from "@/lib/templates/format";

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
  const summary = summarizeContent(content);
  const saved = tpl.current_version !== null;

  return (
    <main className="flex flex-col gap-6">
      <PageHeader
        back={{ href: "/templates", label: "Back to templates" }}
        title={tpl.name}
        badges={
          <>
            {saved ? (
              <Badge
                data-testid="template-version"
                className="h-7 bg-accent px-3 text-sm text-accent-foreground tabular-nums"
              >
                {versionLabel(tpl.current_version)}
              </Badge>
            ) : null}
            {draft ? <StatusBadge data-testid="unpublished" kind="unpublished" /> : null}
          </>
        }
        details={
          saved ? (
            <>
              <Chip>{countLabel(summary.sections, "section")}</Chip>
              <Chip>{countLabel(summary.tasks, "task")}</Chip>
              <Chip>
                {summary.required} required · {summary.optional} optional
              </Chip>
            </>
          ) : null
        }
        actions={
          admin ? (
            <>
              {/* cn: buttonVariants (cva) не зливає border-transparent бази з border-border варіанта outline. */}
              <Link
                href={`/templates/${id}/versions`}
                className={cn(buttonVariants({ variant: "outline", size: "xl" }))}
              >
                <HistoryIcon aria-hidden />
                Versions
              </Link>
              <Link href={`/templates/${id}/edit`} className={buttonVariants({ size: "xl" })}>
                <PencilIcon aria-hidden />
                Edit template
              </Link>
            </>
          ) : null
        }
      />

      {!saved ? (
        <p className="text-base text-muted-foreground">This template has no saved version yet.</p>
      ) : (
        content.sections.map((section, index) => (
          <Card key={section.id} className="gap-0 bg-background py-0">
            <div className="flex flex-wrap items-center gap-3 border-b bg-muted px-5 py-3">
              <NumberBadge>{index + 1}</NumberBadge>
              <h2 className="text-lg font-semibold">{section.name}</h2>
              <span className="ml-auto text-sm text-muted-foreground tabular-nums">
                {countLabel(section.tasks.length, "task")}
              </span>
            </div>
            <ol className="flex flex-col divide-y divide-border/60">
              {section.tasks.map((task) => (
                <li key={task.id} data-testid="template-task" className="flex min-h-14 items-center gap-3 px-5 py-2">
                  <CircleIcon aria-hidden className="size-5 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 text-sm">{task.name}</span>
                  <RequirementPill required={task.required} />
                </li>
              ))}
            </ol>
          </Card>
        ))
      )}
    </main>
  );
}
