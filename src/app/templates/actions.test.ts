import { beforeEach, describe, expect, it, vi } from "vitest";
import { templateErrorMessage } from "@/lib/templates/errors";
import { createTemplate, publishVersion, saveDraft } from "./actions";

// Дії шаблонів зі справжнім requireActor(): клієнт Supabase замінено — getClaims() повертає `auth.claims`
// (null — відвідувач не увійшов), профіль — `auth.role`, а кожен rpc записується в `auth.rpc`.
const auth = vi.hoisted(() => ({
  claims: null as { sub: string } | null,
  role: "admin" as string | null,
  rpc: [] as string[],
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getClaims: async () => ({ data: auth.claims ? { claims: auth.claims } : null, error: null }) },
    from: () => {
      const q = {
        select: () => q,
        eq: () => q,
        maybeSingle: async () => ({ data: auth.role ? { role: auth.role, email: null, full_name: null } : null }),
      };
      return q;
    },
    rpc: async (name: string) => {
      auth.rpc.push(name);
      return { data: null, error: null };
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

const TENANT_MOVE_IN = "a1000000-0000-4000-8000-000000000001";

beforeEach(() => {
  auth.claims = null;
  auth.role = "admin";
  auth.rpc = [];
});

describe("template-editor", () => {
  it("AC-EDITOR-26: відвідувач без входу напряму змінює шаблон чи зберігає версію — перенаправлення на вхід, жодного запиту до бази", async () => {
    const content = { sections: [] };

    await expect(saveDraft(TENANT_MOVE_IN, content)).rejects.toThrow("REDIRECT /login");
    await expect(publishVersion(TENANT_MOVE_IN)).rejects.toThrow("REDIRECT /login");
    const form = new FormData();
    form.set("name", "Repair");
    await expect(createTemplate(form)).rejects.toThrow("REDIRECT /login");

    expect(auth.rpc).toEqual([]); // нічого не змінено й нічого не прочитано з шаблонів
  });

  it("AC-EDITOR-19: порожня назва чи лише пробіли — «Enter a template name», шаблон не створено", async () => {
    auth.claims = { sub: "admin-a" };
    for (const name of ["", "   "]) {
      const form = new FormData();
      form.set("name", name);
      await expect(createTemplate(form)).rejects.toThrow("REDIRECT /templates/new?error=empty_template_name");
    }

    expect(auth.rpc).toEqual([]);
    expect(templateErrorMessage("empty_template_name")).toBe("Enter a template name");
  });
});
