"use client";

import { LayoutTemplateIcon, ListChecksIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";

const ITEMS = [
  { href: "/runs", label: "Runs", icon: ListChecksIcon },
  { href: "/templates", label: "Templates", icon: LayoutTemplateIcon },
];

// Навігація бічної панелі (DESIGN.md, розділ 4): поточний розділ — тло accent і aria-current; на телефоні — рядок
// під логотипом.
export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="flex gap-1 px-3 pb-3 md:flex-col md:pb-0">
      {ITEMS.map(({ href, label, icon: Icon }) => {
        const current = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={current ? "page" : undefined}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
              current
                ? "bg-accent font-medium text-accent-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
