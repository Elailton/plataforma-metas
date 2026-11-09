// Contador da prova (puro, testável). Datas no fuso de Brasília.

const DAY = 86_400_000

/** "AAAA-MM-DD" de hoje em America/Sao_Paulo. */
export function todayInBrazil(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(now)
}

export function isIsoDate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
}

/** Dias inteiros até a prova (0 = hoje; negativo = já passou); null sem data válida. */
export function daysUntilExam(examDate, now = new Date()) {
  if (!isIsoDate(examDate)) return null
  const today = Date.parse(`${todayInBrazil(now)}T00:00:00Z`)
  return Math.round((Date.parse(`${examDate}T00:00:00Z`) - today) / DAY)
}

/** Texto do contador; null quando não deve aparecer (sem data ou prova já passou). */
export function examCountdown(examDate, confirmed, now = new Date()) {
  const days = daysUntilExam(examDate, now)
  if (days === null || days < 0) return null
  const [year, month, day] = examDate.split("-")
  const label = days === 0 ? "A prova é hoje" : days === 1 ? "Falta 1 dia para a prova" : `Faltam ${days} dias para a prova`
  return { days, label, date: `${day}/${month}/${year}`, status: confirmed ? "confirmada" : "prevista" }
}
