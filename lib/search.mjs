// Busca textual usada nas listas da plataforma.
// Ignora maiúsculas, acentos e espaços extras; todas as palavras digitadas
// precisam aparecer em algum dos campos (em qualquer ordem).

/** @param {unknown} value */
export function normalizeSearchText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
}

/** @param {string} query */
export function searchTerms(query) {
  const normalized = normalizeSearchText(query)
  return normalized ? normalized.split(" ") : []
}

/**
 * @param {string} query
 * @param {Array<string | null | undefined>} fields
 */
export function matchesSearch(query, fields) {
  const terms = searchTerms(query)
  if (terms.length === 0) return true
  const haystack = normalizeSearchText(fields.filter(Boolean).join(" "))
  return terms.every((term) => haystack.includes(term))
}

/**
 * @template T
 * @param {T[]} items
 * @param {string} query
 * @param {(item: T) => Array<string | null | undefined>} fields
 * @returns {T[]}
 */
export function filterBySearch(items, query, fields) {
  if (searchTerms(query).length === 0) return items
  return items.filter((item) => matchesSearch(query, fields(item)))
}
