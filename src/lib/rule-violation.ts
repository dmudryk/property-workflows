import type { SupabaseClient } from "@supabase/supabase-js";

// Навмисне порушення правила «запис лише через функції бази» — доказ, що job його ловить. Revert наступним комітом.
export async function directWrite(supabase: SupabaseClient) {
  await supabase.from("template_drafts").delete().eq("template_id", "00000000-0000-4000-8000-000000000000");
}
