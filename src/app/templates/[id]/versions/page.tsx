import Link from "next/link";
import { NotEnoughRights } from "@/components/not-enough-rights";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { canManageTemplates, requireActor } from "@/lib/auth/actor";
import { formatKyivDateTime, versionLabel } from "@/lib/templates/format";

// Список версій — лише адміністратор (AC-EDITOR-05); менеджер — «Not enough rights» без версій (AC-EDITOR-07).
// Роль перевіряємо ДО читання версій; база й сама не віддає версій менеджеру (template_versions_select_admin).
export default async function TemplateVersionsPage({ params }: PageProps<"/templates/[id]/versions">) {
  const { id } = await params;
  const { supabase, actor } = await requireActor();
  if (!canManageTemplates(actor)) return <NotEnoughRights />;

  const [{ data: tpl }, { data: versions }] = await Promise.all([
    supabase.from("templates").select("name").eq("id", id).maybeSingle(),
    supabase
      .from("template_versions")
      .select("number, created_at, author:profiles!template_versions_created_by_fkey(email)")
      .eq("template_id", id)
      .order("number", { ascending: false }),
  ]);
  const rows = versions ?? [];

  return (
    <main className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Link href={`/templates/${id}`} className="text-sm underline-offset-4 hover:underline">
          Back to the template
        </Link>
        <h1 className="text-2xl font-semibold">Versions{tpl ? ` of ${tpl.name}` : ""}</h1>
      </div>
      {rows.length > 0 ? (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Version</TableHead>
                <TableHead>Saved</TableHead>
                <TableHead>Saved by</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((v) => (
                <TableRow key={v.number} data-testid="version-row">
                  <TableCell className="tabular-nums">{versionLabel(v.number)}</TableCell>
                  <TableCell className="tabular-nums">{formatKyivDateTime(v.created_at)}</TableCell>
                  <TableCell className="text-muted-foreground">{v.author?.email ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        // Текст — до відповіді PM (solomchaak/property-workflows-spec#27).
        <p className="text-base text-muted-foreground">No versions yet.</p>
      )}
    </main>
  );
}
