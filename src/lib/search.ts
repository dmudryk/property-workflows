// Пошук у списках (запуски, шаблони): підрядок без урахування регістру; пробіли на краях запиту не враховуються,
// порожній запит підходить до всього.
export function matchesSearch(text: string, query: string): boolean {
  const needle = query.trim().toLocaleLowerCase();
  return !needle || text.toLocaleLowerCase().includes(needle);
}
