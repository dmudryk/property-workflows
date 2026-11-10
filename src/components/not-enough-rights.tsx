import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { MSG_BACK_TO_RUNS, MSG_BACK_TO_TEMPLATES, MSG_NOT_ENOUGH_RIGHTS } from "@/lib/templates/content";

// Відмова в правах — у тій самій розкладці, що й інші сторінки (AppShell), без даних сторінки (AC-DSYS-02, AC-EDITOR-07).
// Вендору — назад до списку запусків, бо шаблонів він не бачить: «Back to runs» на кожній сторінці, яку йому
// відкривати не можна (AC-VENDOR-08, AC-VENDOR-14; solomchaak/property-workflows-spec#47, #49). Іншим — «Back to
// templates» або явне посилання (форма запуску).
export function NotEnoughRights({
  vendor = false,
  backHref = vendor ? "/runs" : "/templates",
  backLabel = vendor ? MSG_BACK_TO_RUNS : MSG_BACK_TO_TEMPLATES,
}: {
  vendor?: boolean;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <main className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex flex-col gap-3">
          <p role="alert" data-testid="not-enough-rights" className="text-lg font-semibold">
            {MSG_NOT_ENOUGH_RIGHTS}
          </p>
          <Link href={backHref} className="text-sm underline-offset-4 hover:underline">
            {backLabel}
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
