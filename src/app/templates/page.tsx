import Link from "next/link";
import { ROW_LINK_ROW, RowLink } from "@/components/row-link";
import { StatusBadge } from "@/components/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { canManageTemplates, requireActor } from "@/lib/auth/actor";
import { versionLabel } from "@/lib/templates/format";

// Список шаблонів (impl-ws7-templates/design.md, U1). Які шаблони видно — вирішує RLS (templates_select_visible):
// адміністратор — усі, менеджер — лише збережені як версія (AC-EDITOR-02). Позначка «Unpublished changes» — лише
// адміністратору: незбережені зміни менеджер не читає (template_drafts_select_admin).
export default async function TemplatesPage() {
  const { supabase, actor } = await requireActor();
  const admin = canManageTemplates(actor);

  const { data: templates } = await supabase.from("templates").select("id, name, current_version").order("name");
  const { data: drafts } = admin ? await supabase.from("template_drafts").select("template_id") : { data: null };
  const unpublished = new Set((drafts ?? []).map((d) => d.template_id));
  const rows = templates ?? [];

  return (
    <main className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Templates</h1>
        {admin ? (
          <Link href="/templates/new" className={buttonVariants({ size: "lg" })}>
            New template
          </Link>
        ) : null}
      </div>
      {rows.length > 0 ? (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Template</TableHead>
                <TableHead>Version</TableHead>
                {admin ? <TableHead>Status</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((tpl) => (
                <TableRow key={tpl.id} data-testid="template-row" className={ROW_LINK_ROW}>
                  <TableCell className="whitespace-normal">
                    <RowLink href={`/templates/${tpl.id}`}>{tpl.name}</RowLink>
                  </TableCell>
                  <TableCell className="tabular-nums">{versionLabel(tpl.current_version)}</TableCell>
                  {admin ? (
                    <TableCell>{unpublished.has(tpl.id) ? <StatusBadge kind="unpublished" /> : null}</TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        // Текст порожнього списку — до відповіді PM (solomchaak/property-workflows-spec#27).
        <p className="text-base text-muted-foreground">No templates yet.</p>
      )}
    </main>
  );
}
