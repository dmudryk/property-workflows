import { AppShell } from "@/components/app-shell";
import { requireActor } from "@/lib/auth/actor";

export default async function RunsLayout({ children }: LayoutProps<"/runs">) {
  const { actor, email } = await requireActor();

  return <AppShell user={{ email, role: actor?.role ?? null }}>{children}</AppShell>;
}
