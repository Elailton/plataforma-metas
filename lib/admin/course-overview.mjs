/**
 * Resumo da visão geral de um curso no painel do administrador.
 * Funções puras: recebem metas, alunos e materiais já carregados e a data de hoje
 * (AAAA-MM-DD no fuso da aplicação).
 */

function isReleasedOn(goal, today) {
  return !goal.dueDate || goal.dueDate <= today
}

function compareByRelease(a, b) {
  // metas sem data (liberadas desde o início) vêm antes das datadas
  const da = a.dueDate ?? ""
  const db = b.dueDate ?? ""
  if (da !== db) return da < db ? -1 : 1
  return a.title.localeCompare(b.title, "pt-BR", { numeric: true })
}

function slim(goal) {
  if (!goal) return null
  return { id: goal.id, title: goal.title, dueDate: goal.dueDate, itemCount: goal.items.length }
}

/** Metas publicadas de um recorte (grupo ou curso todo): última liberada, próxima e totais. */
export function summarizeGoalTimeline(goals, today) {
  const published = goals.filter((goal) => goal.status === "published").sort(compareByRelease)
  const released = published.filter((goal) => isReleasedOn(goal, today))
  const upcoming = published.filter((goal) => !isReleasedOn(goal, today))
  const dated = published.filter((goal) => goal.dueDate)
  return {
    lastReleased: slim(released.at(-1)),
    next: slim(upcoming[0]),
    upcoming: upcoming.slice(0, 5).map(slim),
    releasedCount: released.length,
    scheduledCount: upcoming.length,
    lastDate: dated.length ? dated.at(-1).dueDate : null,
  }
}

/**
 * Linha do tempo por grupo de estudo (1 e 2) quando as metas são separadas por grupo;
 * caso contrário, uma única linha para o curso todo (group = null).
 */
export function summarizeCourseTimelines(goals, today) {
  const usesGroups = goals.some((goal) => goal.targetGroups.length === 1 && [1, 2].includes(goal.targetGroups[0]))
  if (!usesGroups) return [{ group: null, ...summarizeGoalTimeline(goals, today) }]
  return [1, 2].map((group) => ({
    group,
    ...summarizeGoalTimeline(goals.filter((goal) => goal.targetGroups.includes(group)), today),
  }))
}

export function summarizeStudents(students) {
  const byStatus = { active: 0, suspended: 0, revoked: 0 }
  const byGroup = { 1: 0, 2: 0, 3: 0, none: 0 }
  let neverSignedIn = 0
  let blocked = 0
  for (const student of students) {
    byStatus[student.enrollmentStatus] = (byStatus[student.enrollmentStatus] ?? 0) + 1
    if (student.enrollmentStatus === "active") {
      const key = [1, 2, 3].includes(student.studyGroup) ? student.studyGroup : "none"
      byGroup[key] += 1
      if (student.neverSignedIn) neverSignedIn += 1
    }
    if (student.accessBlock) blocked += 1
  }
  return { total: students.length, ...byStatus, byGroup, neverSignedIn, blocked }
}

export function summarizeMaterials(materials) {
  let videos = 0
  let notebooks = 0
  let pdfs = 0
  let others = 0
  for (const material of materials) {
    if (material.type === "videoaula") videos += 1
    else if (/qconcursos\.com/i.test(material.url ?? "")) notebooks += 1
    else if (material.type === "apostila") pdfs += 1
    else others += 1
  }
  return { total: materials.length, videos, notebooks, pdfs, others }
}
