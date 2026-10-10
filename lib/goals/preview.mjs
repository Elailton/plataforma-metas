// Regras da prévia de metas no painel: ordenação, filtro por grupo e estimativa
// de tempo a partir das orientações escritas ("~42 min", "em 50 min", "(10 min").

const MINUTES_PATTERN = /(?:~|\bem\s|\()\s*(\d{1,3})\s*min\b/gi

/** Soma os minutos citados em um texto de orientação. */
export function minutesInText(text) {
  if (!text) return 0
  let total = 0
  for (const match of String(text).matchAll(MINUTES_PATTERN)) total += Number(match[1])
  return total
}

/**
 * Resumo de uma meta para conferência: tempo estimado (itens + descrição),
 * questões sugeridas, itens sem tempo informado e disciplinas distintas.
 */
export function summarizeGoal(goal) {
  const items = goal.items ?? []
  let minutes = minutesInText(goal.description)
  let questions = 0
  let itemsWithoutTime = 0
  const subjects = new Set()
  for (const item of items) {
    const itemMinutes = minutesInText(item.instructions)
    if (itemMinutes === 0) itemsWithoutTime += 1
    minutes += itemMinutes
    questions += Number(item.suggestedQuestions) || 0
    if (item.subjectId) subjects.add(item.subjectId)
  }
  return { minutes, questions, items: items.length, itemsWithoutTime, subjects: subjects.size }
}

/** "2h56", "45 min", "3h". */
export function formatMinutes(minutes) {
  const value = Math.max(0, Math.round(Number(minutes) || 0))
  if (value < 60) return `${value} min`
  const hours = Math.floor(value / 60)
  const rest = value % 60
  return rest ? `${hours}h${String(rest).padStart(2, "0")}` : `${hours}h`
}

/** Metas que um aluno do grupo veria (sem arquivadas), na ordem de liberação. */
export function goalsForPreview(goals, group) {
  return goals
    .filter((goal) => goal.status !== "archived")
    .filter((goal) => !group || (goal.targetGroups ?? [1, 2]).includes(group))
    .slice()
    .sort((a, b) => {
      if (a.dueDate !== b.dueDate) {
        if (!a.dueDate) return -1
        if (!b.dueDate) return 1
        return a.dueDate < b.dueDate ? -1 : 1
      }
      return a.title.localeCompare(b.title, "pt-BR", { numeric: true })
    })
}

/** Grupo vindo da URL: 1, 2 ou null (todos). */
export function parsePreviewGroup(value) {
  const group = Number(Array.isArray(value) ? value[0] : value)
  return group === 1 || group === 2 ? group : null
}
