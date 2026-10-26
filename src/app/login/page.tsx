import { AppShell } from "@/components/app-shell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login } from "./actions";

// Тексти — спокійні, без звинувачень (DESIGN.md, розділ 1); помилка входу не підказує, чи існує email.
const ERRORS: Record<string, string> = {
  missing: "Enter your email and password.",
  invalid: "The email or password is not correct.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;
  const message = typeof error === "string" && Object.hasOwn(ERRORS, error) ? ERRORS[error] : undefined;

  return (
    <AppShell>
      <main className="flex flex-1 items-start justify-center sm:items-center">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>
              <h1 className="text-2xl font-semibold">Sign in</h1>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form action={login} className="flex flex-col gap-4">
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
              <Button type="submit" size="lg">
                Sign in
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </AppShell>
  );
}
