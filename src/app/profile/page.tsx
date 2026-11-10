import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { requireActor } from "@/lib/auth/actor";

// Власний профіль — пункт «Profile» навігації (AC-VENDOR-13; матриця прав: «See own profile» — кожна роль). Лише той, хто
// увійшов: email і роль з його рядка profiles (RLS profiles_select_own_or_admin); профілів інших сторінка не читає.
export default async function ProfilePage() {
  const { actor, email } = await requireActor();

  return (
    <main className="flex flex-col gap-6">
      <PageHeader title="Profile" description="Your account in this workspace." />
      <Card>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-[10rem_1fr]">
            <dt className="text-sm font-medium tracking-wide text-muted-foreground uppercase">Email</dt>
            <dd data-testid="profile-email" className="text-sm break-all">
              {email ?? "—"}
            </dd>
            <dt className="text-sm font-medium tracking-wide text-muted-foreground uppercase">Role</dt>
            <dd data-testid="profile-role" className="text-sm">
              {actor?.role ?? "no role"}
            </dd>
          </dl>
        </CardContent>
      </Card>
    </main>
  );
}
