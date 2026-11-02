import { beforeEach, describe, expect, it, vi } from "vitest";
import { launchRun } from "./actions";

// Дія запуску зі справжнім requireActor(): клієнт Supabase замінено — менеджер A, rpc launch_run повертає `run.id`
// і записує передану назву випадку.
const run = vi.hoisted(() => ({ id: "run-1", caseNames: [] as string[] }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getClaims: async () => ({ data: { claims: { sub: "manager-a" } }, error: null }) },
    from: () => {
      const q = {
        select: () => q,
        eq: () => q,
        maybeSingle: async () => ({ data: { role: "manager", email: "manager.a@example.test", full_name: null } }),
      };
      return q;
    },
    rpc: async (_name: string, args: { p_case_name: string }) => {
      run.caseNames.push(args.p_case_name);
      return { data: run.id, error: null };
    },
  }),
}));

// redirect() у Next.js кидає виняток і перериває дію — у тесті так само, з адресою в тексті.
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT ${url}`);
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

function form(caseName: string) {
  const data = new FormData();
  data.set("template_id", "a1000000-0000-4000-8000-000000000001");
  data.set("case_name", caseName);
  return data;
}

beforeEach(() => {
  run.caseNames = [];
});

describe("workflow-runs", () => {
  it("AC-RUN-11: назва зі 100 символів після одного пробілу — запуск створено, перехід на сторінку запуску", async () => {
    await expect(launchRun(form(` ${"b".repeat(100)}`))).rejects.toThrow("REDIRECT /runs/run-1");
    expect(run.caseNames).toHaveLength(1);
  });

  it("AC-RUN-07: назва зі 101 символу — запуску немає, повідомлення про довжину", async () => {
    await expect(launchRun(form("a".repeat(101)))).rejects.toThrow(/error=too_long$/);
    expect(run.caseNames).toEqual([]);
  });
});
