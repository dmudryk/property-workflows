import Link from "next/link";
import { NotEnoughRights } from "@/components/not-enough-rights";
import { SubmitButton } from "@/components/submit-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { canManageTemplates, requireActor } from "@/lib/auth/actor";
import { templateErrorMessage } from "@/lib/templates/errors";
import { createTemplate } from "../actions";

// Новий шаблон — лише адміністратор (матриця прав). Менеджеру — та сама відмова, що й на редакторі (AC-DSYS-02).
export default async function NewTemplatePage({ searchParams }: PageProps<"/templates/new">) {
  const { actor } = await requireActor();
  if (!canManageTemplates(actor)) return <NotEnoughRights />;

  const { error } = await searchParams;
  const message = templateErrorMessage(error);

  return (
    <main className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Link href="/templates" className="text-sm underline-offset-4 hover:underline">
          Back to templates
        </Link>
        <h1 className="text-2xl font-semibold">New template</h1>
      </div>
      <Card>
        <CardContent>
          <form action={createTemplate} className="flex flex-col gap-4">
            {message ? (
              <Alert variant="destructive">
                <AlertDescription className="text-destructive">{message}</AlertDescription>
              </Alert>
            ) : null}
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Template name</Label>
              <Input id="name" name="name" placeholder="Tenant move-in" required />
            </div>
            <SubmitButton size="lg" pendingLabel="Creating…" className="self-start">
              Create
            </SubmitButton>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
