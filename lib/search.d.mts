export function normalizeSearchText(value: unknown): string
export function searchTerms(query: string): string[]
export function matchesSearch(
  query: string,
  fields: Array<string | null | undefined>,
): boolean
export function filterBySearch<T>(
  items: T[],
  query: string,
  fields: (item: T) => Array<string | null | undefined>,
): T[]
