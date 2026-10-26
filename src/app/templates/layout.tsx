import { AppShell } from "@/components/app-shell";
import { requireActor } from "@/lib/auth/actor";

export default async function TemplatesLayout({ children }: LayoutProps<"/templates">) {
  const { actor, email } = await requireActor();

  return <AppShell user={{ email, role: actor?.role ?? null }}>{children}</AppShell>;
}
