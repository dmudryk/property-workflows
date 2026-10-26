import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// Порожній стан — однаковий на всіх сторінках (DESIGN.md, розділ 6): текст і посилання на наступну дію, без
// порожньої таблиці.
export function EmptyState({ message, action }: { message: string; action?: { href: string; label: string } }) {
  return (
    <Card data-testid="empty-state">
      <CardContent className="flex flex-col items-start gap-3">
        <p className="text-base">{message}</p>
        {action ? (
          <Link href={action.href} className={buttonVariants({ variant: "outline" })}>
            {action.label}
          </Link>
        ) : null}
      </CardContent>
    </Card>
  );
}
