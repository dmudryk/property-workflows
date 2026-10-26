import { ChevronLeftIcon } from "lucide-react";
import Link from "next/link";

// Посилання назад над заголовком сторінки: шеврон і текст, дотикова ціль 44px.
export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="-ml-1 inline-flex min-h-11 items-center gap-1 self-start rounded-lg px-1 text-sm font-medium text-muted-foreground underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring"
    >
      <ChevronLeftIcon className="size-4 shrink-0" aria-hidden />
      {children}
    </Link>
  );
}

// Шапка сторінки (DESIGN.md, розділ 3): посилання назад, заголовок 32px і позначки поруч, підзаголовок, рядок деталей
// (чипи); дії — праворуч, а на вузькому екрані — під заголовком.
export function PageHeader({
  back,
  title,
  badges,
  description,
  details,
  actions,
}: {
  back?: { href: string; label: string };
  title: React.ReactNode;
  badges?: React.ReactNode;
  description?: React.ReactNode;
  details?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      {back ? <BackLink href={back.href}>{back.label}</BackLink> : null}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[2rem] leading-tight font-semibold">{title}</h1>
            {badges}
          </div>
          {description ? <p className="text-base text-muted-foreground">{description}</p> : null}
          {details ? <div className="flex flex-wrap items-center gap-2">{details}</div> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
      </div>
    </div>
  );
}
