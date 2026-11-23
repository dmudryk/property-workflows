// WS11, трек B: навмисна помилка сервера, щоб перевірити трекер помилок (onRequestError у src/instrumentation.ts →
// повідомлення в Telegram з маршрутом і стеком). Перевіряємо на staging, не на проді.
// Лише адміністратор (роль з profiles через getClaims — requireActor); решті — 404, наче маршруту немає.
// Без входу proxy веде на /login. Текст помилки — без даних користувача (і він однаково не йде в повідомлення).
import { NextResponse } from "next/server";
import { requireActor } from "@/lib/auth/actor";

export const dynamic = "force-dynamic";

export async function GET() {
  const { actor } = await requireActor();
  if (actor?.role !== "admin") {
    return NextResponse.json({ error: "not found" }, { status: 404, headers: { "cache-control": "no-store" } });
  }
  throw new Error("ops error test: deliberate server error for the error tracker");
}
