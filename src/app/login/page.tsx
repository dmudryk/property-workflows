import Image from "next/image";
import { AppShell } from "@/components/app-shell";
import { Logo } from "@/components/logo";
import { SubmitButton } from "@/components/submit-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { safeNextPath } from "@/lib/auth/next-path";
import { login } from "./actions";
import hero from "./login-hero.jpg";

// Тексти — спокійні, без звинувачень (DESIGN.md, розділ 1); помилка входу не підказує, чи існує email.
const ERRORS: Record<string, string> = {
  missing: "Enter your email and password.",
  invalid: "The email or password is not correct.",
};

// Вхід — у тій самій розкладці AppShell (AC-DSYS-03): картка з ілюстрацією зліва (з md) і логотипом та формою справа;
// на телефоні — лише логотип і форма. Ілюстрація декоративна (порожній alt); підпис на ній — токени illustration.
export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error, next } = await searchParams;
  const message = typeof error === "string" && Object.hasOwn(ERRORS, error) ? ERRORS[error] : undefined;
  // Сторінка з прямого посилання, на яку повернути після входу (AC-DSYS-08).
  const nextPath = safeNextPath(next);

  return (
    <AppShell>
      <main className="flex flex-1 items-center justify-center">
        <Card className="w-full max-w-sm gap-0 py-0 md:grid md:max-w-none md:grid-cols-2">
          <div className="relative hidden min-h-[32rem] bg-illustration md:block">
            <Image
              src={hero}
              alt=""
              fill
              preload
              placeholder="blur"
              sizes="(min-width: 768px) 28rem, 1px"
              className="object-cover object-top"
            />
            <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 p-8 text-illustration-foreground">
              <p className="text-lg font-semibold">Every workflow, one step at a time.</p>
              <p className="text-sm">Templates, runs and tasks in one place.</p>
            </div>
          </div>
          <div className="flex flex-col justify-center gap-6 p-6 sm:p-10">
            <Logo size="lg" className="self-center" />
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-semibold">Sign in</h1>
              <p className="text-sm text-muted-foreground">Welcome back. Enter your email and password to continue.</p>
            </div>
            <form action={login} className="flex flex-col gap-4">
              {nextPath ? <input type="hidden" name="next" value={nextPath} /> : null}
              {message ? (
                <Alert variant="destructive">
                  <AlertDescription className="text-destructive">{message}</AlertDescription>
                </Alert>
              ) : null}
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" autoComplete="email" required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" name="password" type="password" autoComplete="current-password" required />
              </div>
              <SubmitButton size="lg" pendingLabel="Signing in…">
                Sign in
              </SubmitButton>
            </form>
          </div>
        </Card>
      </main>
    </AppShell>
  );
}
