export function formatDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00`)
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
}

export function formatDateLong(iso: string): string {
  const date = new Date(`${iso}T00:00:00`)
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
}
