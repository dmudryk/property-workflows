import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateSession } from "./proxy";

// Клієнт Supabase у proxy замінено: getClaims() повертає claims із `session.claims` (null — відвідувач не увійшов).
const session = vi.hoisted(() => ({ claims: null as Record<string, unknown> | null }));
vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: { getClaims: async () => ({ data: session.claims ? { claims: session.claims } : null, error: null }) },
  }),
}));

const RUN_URL = "http://localhost:3000/runs/acde19d4-83ed-432b-a9e0-c75e12ab2d1e";

beforeEach(() => {
  session.claims = null;
});

describe("proxy (updateSession)", () => {
  it("AC-DSYS-03: відвідувач без входу відкриває сторінку запуску за прямим посиланням — перенаправлення на /login", async () => {
    const response = await updateSession(new NextRequest(RUN_URL));
    expect(response.status).toBe(307);
    expect(new URL(response.headers.get("location") ?? "").pathname).toBe("/login");
  });

  it("AC-DSYS-08: відвідувач без входу на сторінці запуску — вхід з адресою повернення ?next=", async () => {
    const response = await updateSession(new NextRequest(`${RUN_URL}?tab=tasks`));
    const location = new URL(response.headers.get("location") ?? "");
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("next")).toBe("/runs/acde19d4-83ed-432b-a9e0-c75e12ab2d1e?tab=tasks");
    // Головна — без ?next= (після входу й так головна).
    const home = await updateSession(new NextRequest("http://localhost:3000/"));
    expect(new URL(home.headers.get("location") ?? "").search).toBe("");
  });

  it("користувач, який увійшов, отримує сторінку запуску без перенаправлення; /login відкрита гостю", async () => {
    session.claims = { sub: "manager-b" };
    const signedIn = await updateSession(new NextRequest(RUN_URL));
    expect(signedIn.headers.get("location")).toBeNull();
    expect(signedIn.headers.get("x-middleware-next")).toBe("1");

    session.claims = null;
    const login = await updateSession(new NextRequest("http://localhost:3000/login"));
    expect(login.headers.get("location")).toBeNull();
  });
});
