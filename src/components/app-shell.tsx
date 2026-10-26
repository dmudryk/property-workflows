import Link from "next/link";
import { signOut } from "@/app/login/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// Одна розкладка для всіх сторінок, зокрема для входу (DESIGN.md, розділ 4): шапка з назвою застосунку, а для
// користувача, який увійшов, — навігація, email, роль і вихід. Вміст сторінки — у тому самому контейнері.
export function AppShell({
  user,
  children,
}: {
  user?: { email: string | null; role: string | null } | null;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b bg-card">
        <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-base font-semibold">
              Property Workflows
            </Link>
            {user ? (
              <nav aria-label="Main" className="flex gap-4 text-sm">
                <Link href="/runs" className="underline-offset-4 hover:underline">
                  Runs
                </Link>
                <Link href="/templates" className="underline-offset-4 hover:underline">
                  Templates
                </Link>
              </nav>
            ) : null}
          </div>
          {user ? (
            <div className="flex items-center gap-3 text-sm">
              <span data-testid="user-email" className="text-muted-foreground">
                {user.email ?? "—"}
              </span>
              <Badge variant="outline" data-testid="user-role" className="h-6 px-2.5 text-sm">
                {user.role ?? "no role"}
              </Badge>
              <form action={signOut}>
                <Button type="submit" variant="outline">
                  Sign out
                </Button>
              </form>
            </div>
          ) : null}
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">{children}</div>
    </div>
  );
}
