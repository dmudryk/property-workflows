"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { canManageTemplates, requireActor } from "@/lib/auth/actor";
import { parseContent } from "@/lib/templates/content";
import { templateErrorCode, type TemplateError } from "@/lib/templates/errors";

// Дії редактора шаблонів (impl-ws7-templates/design.md, U1–U2 і Auth). Кожна: requireActor() → лише адміністратор →
// функція бази private.* (security definer, власна перевірка ролі) через обгортку public.*. Без ролі — жодного запису.
export type TemplateActionResult = { ok: true; version?: number } | { ok: false; error: TemplateError };

export async function createTemplate(formData: FormData) {
  const { supabase, actor } = await requireActor();
  if (!canManageTemplates(actor)) redirect("/templates/new?error=not_allowed");

  // AC-EDITOR-19: порожня назва чи лише пробіли — без запиту до бази; зайняту назву (AC-EDITOR-23) відхиляє база.
  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect("/templates/new?error=empty_template_name");

  const { data: id, error } = await supabase.rpc("create_template", { p_name: name });
  if (error || !id) redirect(`/templates/new?error=${templateErrorCode(error)}`);

  revalidatePath("/templates");
  redirect(`/templates/${id}/edit`);
}

// AC-EDITOR-01: автозбереження — кожна зміна редактора замінює незбережені зміни шаблону.
export async function saveDraft(templateId: string, content: unknown): Promise<TemplateActionResult> {
  const { supabase, actor } = await requireActor();
  if (!canManageTemplates(actor)) return { ok: false, error: "not_allowed" };

  const parsed = parseContent(content);
  if (typeof templateId !== "string" || !templateId || !parsed) return { ok: false, error: "invalid" };

  const { error } = await supabase.rpc("save_template_draft", { p_template_id: templateId, p_content: parsed });
  return error ? { ok: false, error: templateErrorCode(error) } : { ok: true };
}

// AC-EDITOR-03, AC-EDITOR-04: збереження шаблону — нова версія або повідомлення без жодних змін.
export async function publishVersion(templateId: string): Promise<TemplateActionResult> {
  const { supabase, actor } = await requireActor();
  if (!canManageTemplates(actor)) return { ok: false, error: "not_allowed" };
  if (typeof templateId !== "string" || !templateId) return { ok: false, error: "invalid" };

  const { data: version, error } = await supabase.rpc("publish_template_version", { p_template_id: templateId });
  if (error) return { ok: false, error: templateErrorCode(error) };

  revalidatePath("/templates");
  revalidatePath(`/templates/${templateId}`);
  revalidatePath("/runs/new");
  return { ok: true, version: version ?? undefined };
}
