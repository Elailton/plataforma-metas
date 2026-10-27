// Monta a visão do aluno (metas, itens, materiais e progresso do edital) a partir
// das linhas já autorizadas pelo RLS. Lógica pura, sem Supabase, para ser testável.
import { calculatePercentage, collectStudiedTopicIds, getGoalProgressStatus } from "./core.mjs"
import { isGoalReleased } from "../goals/release.mjs"

const IMPORTANCE_VALUES = new Set(["high", "medium", "low"])
const normalizeImportance = (value) => (IMPORTANCE_VALUES.has(value) ? value : null)

const byPosition = (a, b) => (a.position ?? 0) - (b.position ?? 0)

/**
 * Ordem do aluno: liberação (sem data primeiro), depois criação e título.
 * Metas criadas em lote têm o mesmo created_at; a data de liberação garante
 * numeração estável e cronológica.
 */
export function compareGoalsByRelease(a, b) {
  if (a.due_date !== b.due_date) {
    if (!a.due_date) return -1
    if (!b.due_date) return 1
    return a.due_date < b.due_date ? -1 : 1
  }
  const createdA = a.created_at ?? ""
  const createdB = b.created_at ?? ""
  if (createdA !== createdB) return createdA < createdB ? -1 : 1
  return String(a.title ?? "").localeCompare(String(b.title ?? ""), "pt-BR", { numeric: true })
}

/**
 * Converte as linhas goal_item_materials (com `materials` embutido) na lista
 * ordenada que o aluno vê. Linhas sem material visível (RLS) são descartadas.
 */
export function materialsFromRelations(relations) {
  return [...(relations ?? [])]
    .sort(byPosition)
    .map((relation) => relation.materials)
    .filter(Boolean)
    .map((material) => ({ id: material.id, title: material.title, type: material.type, url: material.url }))
}

/** Meta sem itens ativos não trava a sequência. */
export const isGoalComplete = (goal) => goal.totalItems === 0 || goal.completedItems >= goal.totalItems

/**
 * Liberação em duas regras, as duas obrigatórias: a data da meta já chegou E
 * todas as metas anteriores (na ordem do aluno) estão concluídas.
 * `lockReason`: "previous" quando falta concluir a anterior; "date" quando só
 * falta a data; null quando liberada. Uso: `goals.map(withSequentialRelease)`
 * sobre a lista já ordenada (o terceiro argumento do map é a lista).
 */
export function withSequentialRelease(goal, index, list) {
  const previousCompleted = list.slice(0, index).every(isGoalComplete)
  const lockReason = !previousCompleted ? "previous" : goal.isDateReleased ? null : "date"
  return { ...goal, isReleased: lockReason === null, lockReason }
}

/**
 * @param {object} input
 * @param {Array} input.subjects  subjects com syllabus_topics embutidos
 * @param {Array} input.goals     goals com goal_items -> goal_item_materials -> materials
 * @param {Iterable<string>} input.completedItemIds
 * @param {Date} [input.now]
 */
export function buildStudentSnapshot({ subjects, goals, completedItemIds, now = new Date() }) {
  const completed = new Set(completedItemIds)
  const sortedSubjects = [...(subjects ?? [])].sort(byPosition)
  const subjectById = new Map(sortedSubjects.map((subject) => [subject.id, subject]))
  const topicById = new Map()
  for (const subject of sortedSubjects) {
    for (const topic of subject.syllabus_topics ?? []) topicById.set(topic.id, topic)
  }

  const mappedGoals = [...(goals ?? [])].sort(compareGoalsByRelease).map((goal, index) => {
    const explicitNumber = /^\s*meta\s+(\d+)\b/i.exec(goal.title ?? "")
    const goalNumber = explicitNumber ? Number(explicitNumber[1]) : index + 1
    const items = (goal.goal_items ?? []).filter((item) => !item.archived_at).sort(byPosition)
    const mappedItems = items.map((item) => {
      const topic = item.topic_id ? topicById.get(item.topic_id) : null
      const subtopic = item.subtopic_id ? topicById.get(item.subtopic_id) : null
      const materials = materialsFromRelations(item.goal_item_materials)
      return {
        id: item.id,
        subjectId: item.subject_id,
        subjectName: subjectById.get(item.subject_id)?.name ?? "Disciplina",
        topicId: item.topic_id ?? null,
        topicName: topic?.title ?? null,
        subtopicId: item.subtopic_id ?? null,
        subtopicName: subtopic?.title ?? null,
        importance: normalizeImportance(subtopic?.importance) ?? normalizeImportance(topic?.importance),
        instructions: item.instructions ?? null,
        suggestedQuestions: item.suggested_questions ?? null,
        materials,
        completed: completed.has(item.id),
      }
    })
    const completedItems = mappedItems.filter((item) => item.completed).length
    const totalItems = mappedItems.length
    return {
      id: goal.id,
      courseId: goal.course_id,
      number: Number.isSafeInteger(goalNumber) ? goalNumber : index + 1,
      title: goal.title,
      description: goal.description ?? null,
      dueDate: goal.due_date ?? null,
      isDateReleased: isGoalReleased(goal.due_date, now),
      items: mappedItems,
      completedItems,
      totalItems,
      progress: calculatePercentage(completedItems, totalItems),
      progressStatus: getGoalProgressStatus(completedItems, totalItems),
    }
  }).map(withSequentialRelease)

  const studiedTopicIds = collectStudiedTopicIds(mappedGoals.flatMap((goal) => goal.items))

  const mappedSubjects = sortedSubjects.map((subject) => {
    const topics = [...(subject.syllabus_topics ?? [])].sort(byPosition)
    const childrenByParent = new Map()
    for (const topic of topics) {
      if (!topic.parent_topic_id) continue
      const list = childrenByParent.get(topic.parent_topic_id) ?? []
      list.push(topic)
      childrenByParent.set(topic.parent_topic_id, list)
    }
    const toTopic = (topic, subtopics) => ({
      id: topic.id,
      parentTopicId: topic.parent_topic_id ?? null,
      title: topic.title,
      position: topic.position,
      studied: studiedTopicIds.has(topic.id),
      subtopics,
    })
    const mappedTopics = topics
      .filter((topic) => !topic.parent_topic_id)
      .map((topic) => toTopic(topic, (childrenByParent.get(topic.id) ?? []).map((child) => toTopic(child, []))))
    const flatTopics = mappedTopics.flatMap((topic) => [topic, ...topic.subtopics])
    const studied = flatTopics.filter((topic) => topic.studied).length
    return {
      id: subject.id,
      name: subject.name,
      position: subject.position,
      topics: mappedTopics,
      studied,
      total: flatTopics.length,
      percentage: calculatePercentage(studied, flatTopics.length),
    }
  })

  const totalTopics = mappedSubjects.reduce((total, subject) => total + subject.total, 0)
  const studiedTopics = mappedSubjects.reduce((total, subject) => total + subject.studied, 0)

  return {
    goals: mappedGoals,
    subjects: mappedSubjects,
    studiedTopics,
    totalTopics,
    editalPercentage: calculatePercentage(studiedTopics, totalTopics),
  }
}

/** Versão enxuta para listas: sem itens nem materiais (menos dados ao navegador). */
export function toGoalSummary(goal) {
  return {
    id: goal.id,
    number: goal.number,
    title: goal.title,
    dueDate: goal.dueDate,
    isReleased: goal.isReleased,
    lockReason: goal.lockReason ?? null,
    progress: goal.progress,
    progressStatus: goal.progressStatus,
    subjectNames: [...new Set(goal.items.map((item) => item.subjectName))],
  }
}

/** Quantas metas o aluno enxerga a partir da atual (a atual conta): Meta 1 → até a Meta 10. */
export const GOAL_PREVIEW_WINDOW = 10

/**
 * O aluno não vê o cronograma inteiro. A "atual" é a primeira meta não concluída;
 * ele vê as anteriores e, a partir da atual, até `preview` metas — mas só as que
 * já chegaram à data: meta com data futura não aparece nem como prévia.
 * As que já têm data mas esperam a anterior aparecem bloqueadas.
 * `recent` são as últimas liberadas (mais nova primeiro, até `limit`); `earlier`
 * as liberadas mais antigas; `upcoming` as bloqueadas visíveis, em ordem; `next`
 * a primeira bloqueada visível.
 */
export function studentGoalWindow(goals, limit = 5, preview = GOAL_PREVIEW_WINDOW) {
  const firstOpen = goals.findIndex((goal) => !isGoalComplete(goal))
  const current = firstOpen === -1 ? goals.length : firstOpen
  const visible = goals.slice(0, current + preview).filter((goal) => goal.isDateReleased)
  const released = visible.filter((goal) => goal.isReleased)
  const upcoming = visible.filter((goal) => !goal.isReleased)
  const newestFirst = [...released].reverse()
  return {
    next: upcoming[0] ?? null,
    upcoming,
    recent: newestFirst.slice(0, limit),
    earlier: newestFirst.slice(limit),
    visible,
    releasedCount: released.length,
  }
}
