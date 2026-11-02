"use client";

import { LayoutTemplateIcon, ListChecksIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";

const ITEMS = [
  { href: "/runs", label: "Runs", icon: ListChecksIcon, vendor: true },
  { href: "/templates", label: "Templates", icon: LayoutTemplateIcon, vendor: false },
];

// Навігація бічної панелі (DESIGN.md, розділ 4): пункти 44px з іконкою; поточний розділ — тло accent, напівжирний
// текст і aria-current. Коли панель над вмістом (контейнер AppShell < 50rem), пункти стоять у рядок.
// Вендору розділу «Templates» не показуємо: шаблонів він не бачить (матриця прав; DESIGN.md — дію, якої роль не має,
// не показуємо). Відмову за прямим посиланням дає сама сторінка (AC-VENDOR-08).
export function SidebarNav({ labelledBy, role }: { labelledBy?: string; role?: string | null }) {
  const pathname = usePathname();
  const items = role === "vendor" ? ITEMS.filter((item) => item.vendor) : ITEMS;

  return (
    <nav aria-labelledby={labelledBy} aria-label={labelledBy ? undefined : "Main"} className="flex gap-1 @min-[50rem]:flex-col">
      {items.map(({ href, label, icon: Icon }) => {
        const current = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={current ? "page" : undefined}
            className={cn(
              "flex h-11 flex-1 items-center gap-3 rounded-lg px-3 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring @min-[50rem]:flex-none",
              current
                ? "bg-accent font-semibold text-accent-foreground"
                : "font-medium text-muted-foreground hover:bg-accent/60 hover:text-accent-foreground",
            )}
          >
            <Icon className="size-5 shrink-0" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
