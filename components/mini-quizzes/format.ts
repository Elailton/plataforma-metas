/** Formatação de datas dos Mini Simulados, sempre no fuso de Brasília. */
export function formatMonth(monthStart: string) {
  const [year, month] = monthStart.split("-").map(Number)
  const label = new Date(Date.UTC(year, month - 1, 15)).toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  })
}

export function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Sao_Paulo" })
}

export function scoreTone(percentage: number) {
  if (percentage >= 70) return "text-success"
  if (percentage >= 50) return "text-amber-600 dark:text-amber-400"
  return "text-destructive"
}

export function barTone(percentage: number) {
  if (percentage >= 70) return "bg-success"
  if (percentage >= 50) return "bg-amber-500"
  return "bg-destructive"
}
