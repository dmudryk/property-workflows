import Link from "next/link";
import { signOut } from "@/app/login/actions";
import { Logo } from "@/components/logo";
import { SidebarNav } from "@/components/sidebar-nav";
import { SubmitButton } from "@/components/submit-button";
import { Badge } from "@/components/ui/badge";

// Одна розкладка для всіх сторінок, зокрема для входу (DESIGN.md, розділ 4). Для користувача, який увійшов, — бічна
// панель: логотип, навігація, email, роль і вихід (на телефоні — смуга над вмістом). Гостю переходити нікуди, тож
// панелі немає, а логотип — у картці входу. Вміст сторінки — у тому самому контейнері.
export function AppShell({
  user,
  children,
}: {
  user?: { email: string | null; role: string | null } | null;
  children: React.ReactNode;
}) {
  const content = (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">{children}</div>
  );
  if (!user) return <div className="flex flex-1 flex-col">{content}</div>;

  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <aside className="border-b bg-card md:sticky md:top-0 md:flex md:h-svh md:w-60 md:shrink-0 md:flex-col md:border-r md:border-b-0">
        <div className="px-6 py-4 md:py-6">
          <Link href="/" className="inline-flex rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Logo />
          </Link>
        </div>
        <SidebarNav />
        <div className="flex items-center justify-between gap-3 border-t px-4 py-3 md:mt-auto md:flex-col md:items-stretch md:px-3 md:py-4">
          <div className="flex min-w-0 items-center gap-2 md:flex-col md:items-start md:px-3">
            <span data-testid="user-email" className="truncate text-sm text-muted-foreground">
              {user.email ?? "—"}
            </span>
            <Badge variant="outline" data-testid="user-role" className="h-6 px-2.5 text-sm">
              {user.role ?? "no role"}
            </Badge>
          </div>
          <form action={signOut}>
            <SubmitButton variant="outline" pendingLabel="Signing out…" className="md:w-full">
              Sign out
            </SubmitButton>
          </form>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">{content}</div>
    </div>
  );
}
