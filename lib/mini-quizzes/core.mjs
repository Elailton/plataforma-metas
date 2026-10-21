// Regras puras dos Mini Simulados (sem Next.js nem Supabase), testáveis isoladamente.
export const RETAKE_DAYS = 7
export const WEAK_TOPIC_THRESHOLD = 60
export const WEAK_TOPIC_MIN_QUESTIONS = 3
export const ALTERNATIVE_KEYS = ["A", "B", "C", "D", "E"]

const DAY_MS = 24 * 60 * 60 * 1000

export function percentage(correct, total) {
  if (!total) return 0
  return Math.round((correct / total) * 100)
}

/** Data a partir da qual o aluno pode refazer, contada da última tentativa. */
export function nextAvailableAt(lastSubmittedAt) {
  if (!lastSubmittedAt) return null
  const time = new Date(lastSubmittedAt).getTime()
  if (Number.isNaN(time)) return null
  return new Date(time + RETAKE_DAYS * DAY_MS)
}

export function canAttempt(lastSubmittedAt, now = new Date()) {
  const next = nextAvailableAt(lastSubmittedAt)
  return !next || next.getTime() <= now.getTime()
}

/** Extrai a data de liberação do erro de intervalo devolvido pelo banco. */
export function parseCooldownError(message) {
  const match = /MINI_QUIZ_COOLDOWN:(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z)/.exec(String(message ?? ""))
  return match ? new Date(match[1]) : null
}

/** Chave do mês no fuso de Brasília (YYYY-MM-01), igual a month_start do banco. */
export function monthKey(date) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit" })
    .formatToParts(new Date(date))
  const year = parts.find((part) => part.type === "year")?.value
  const month = parts.find((part) => part.type === "month")?.value
  return `${year}-${month}-01`
}

export function isValidMonthKey(value) {
  return typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])-01$/.test(value)
}

/**
 * Situação de cada mini simulado para o aluno, agrupada por disciplina na ordem do curso.
 * attempts: tentativas do aluno (qualquer ordem).
 */
/** Id do grupo de simulados com várias disciplinas (semanais) na aba do aluno. */
export const WEEKLY_GROUP_ID = "semanal"

export function groupQuizzesBySubject({ subjects, quizzes, questionCounts, attempts, now = new Date() }) {
  const bySubject = new Map()
  const attemptsByQuiz = new Map()
  for (const attempt of attempts ?? []) {
    const list = attemptsByQuiz.get(attempt.quiz_id) ?? []
    list.push(attempt)
    attemptsByQuiz.set(attempt.quiz_id, list)
  }
  const sortedQuizzes = [...(quizzes ?? [])].sort(
    (a, b) =>
      (a.week_number ?? 0) - (b.week_number ?? 0) ||
      String(a.release_date ?? "").localeCompare(String(b.release_date ?? "")) ||
      (a.position ?? 0) - (b.position ?? 0) ||
      String(a.title).localeCompare(String(b.title), "pt-BR", { numeric: true }),
  )
  for (const quiz of sortedQuizzes) {
    const list = [...(attemptsByQuiz.get(quiz.id) ?? [])].sort((a, b) => a.attempt_number - b.attempt_number)
    const first = list[0] ?? null
    const last = list[list.length - 1] ?? null
    const next = last ? nextAvailableAt(last.submitted_at) : null
    const available = !last || next.getTime() <= now.getTime()
    const entry = {
      id: quiz.id,
      title: quiz.title,
      description: quiz.description ?? null,
      questionCount: questionCounts?.[quiz.id] ?? 0,
      attemptCount: list.length,
      firstScore: first ? percentage(first.correct_count, first.total_count) : null,
      lastScore: last ? percentage(last.correct_count, last.total_count) : null,
      lastAttemptId: last?.id ?? null,
      nextAvailableAt: available ? null : next.toISOString(),
      status: !last ? "new" : available ? "retake" : "waiting",
      weekNumber: quiz.week_number ?? null,
      releaseDate: quiz.release_date ?? null,
    }
    const key = quiz.subject_id ?? WEEKLY_GROUP_ID
    const group = bySubject.get(key) ?? []
    group.push(entry)
    bySubject.set(key, group)
  }
  const weekly = bySubject.has(WEEKLY_GROUP_ID)
    ? [{ id: WEEKLY_GROUP_ID, name: "Diagnóstico Semanal", quizzes: bySubject.get(WEEKLY_GROUP_ID) }]
    : []
  return [
    ...weekly,
    ...[...(subjects ?? [])]
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .filter((subject) => bySubject.has(subject.id))
      .map((subject) => ({ id: subject.id, name: subject.name, quizzes: bySubject.get(subject.id) })),
  ]
}

function tally(map, key, isCorrect) {
  const current = map.get(key) ?? { correct: 0, total: 0 }
  current.total += 1
  if (isCorrect) current.correct += 1
  map.set(key, current)
}

/**
 * Diagnóstico do aluno. Só contam as primeiras tentativas de cada mini simulado no mês
 * (is_first_of_month). Refazer depois não altera o diagnóstico daquele mês.
 *
 * subjects: [{ id, name, position, topics: [{ id, title, parent_topic_id }] }]
 * attempts: [{ id, quiz_id, month_start, is_first_of_month, submitted_at }]
 * answers:  [{ attempt_id, subject_id, topic_id, is_correct }]
 */
export function buildDiagnosis({ subjects, attempts, answers, month = null }) {
  const counted = (attempts ?? []).filter((attempt) => attempt.is_first_of_month)
  const months = [...new Set(counted.map((attempt) => attempt.month_start))].sort().reverse()
  const selectedMonth = month && months.includes(month) ? month : months[0] ?? null
  const attemptMonth = new Map(counted.map((attempt) => [attempt.id, attempt.month_start]))

  const topicTitle = new Map()
  const topicParent = new Map()
  for (const subject of subjects ?? []) {
    for (const topic of subject.topics ?? []) {
      topicTitle.set(topic.id, topic.title)
      topicParent.set(topic.id, topic.parent_topic_id ?? null)
    }
  }

  const subjectMonth = new Map() // `${subject}|${month}` -> tally
  const subjectTotals = new Map()
  const topicTotals = new Map() // `${subject}|${topic}`
  let overallCorrect = 0
  let overallTotal = 0

  for (const answer of answers ?? []) {
    const answerMonth = attemptMonth.get(answer.attempt_id)
    if (!answerMonth || !answer.subject_id) continue
    tally(subjectMonth, `${answer.subject_id}|${answerMonth}`, answer.is_correct)
    if (answerMonth !== selectedMonth) continue
    overallTotal += 1
    if (answer.is_correct) overallCorrect += 1
    tally(subjectTotals, answer.subject_id, answer.is_correct)
    if (answer.topic_id) tally(topicTotals, `${answer.subject_id}|${answer.topic_id}`, answer.is_correct)
  }

  const orderedSubjects = [...(subjects ?? [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
  const subjectRows = orderedSubjects
    .map((subject) => {
      const totals = subjectTotals.get(subject.id)
      const topics = [...topicTotals.entries()]
        .filter(([key]) => key.startsWith(`${subject.id}|`))
        .map(([key, value]) => {
          const topicId = key.split("|")[1]
          return {
            id: topicId,
            title: topicTitle.get(topicId) ?? "Assunto",
            correct: value.correct,
            total: value.total,
            percentage: percentage(value.correct, value.total),
          }
        })
        .sort((a, b) => a.percentage - b.percentage || b.total - a.total)
      return {
        id: subject.id,
        name: subject.name,
        correct: totals?.correct ?? 0,
        total: totals?.total ?? 0,
        percentage: percentage(totals?.correct ?? 0, totals?.total ?? 0),
        topics,
        evolution: [...months].reverse().map((monthStart) => {
          const value = subjectMonth.get(`${subject.id}|${monthStart}`)
          return { month: monthStart, total: value?.total ?? 0, percentage: value ? percentage(value.correct, value.total) : null }
        }),
      }
    })

  const weakTopics = subjectRows
    .flatMap((subject) => subject.topics.map((topic) => ({ ...topic, subjectName: subject.name })))
    .filter((topic) => topic.total >= WEAK_TOPIC_MIN_QUESTIONS && topic.percentage < WEAK_TOPIC_THRESHOLD)
    .sort((a, b) => a.percentage - b.percentage || b.total - a.total)

  return {
    months,
    selectedMonth,
    quizzesCounted: counted.filter((attempt) => attempt.month_start === selectedMonth).length,
    overall: { correct: overallCorrect, total: overallTotal, percentage: percentage(overallCorrect, overallTotal) },
    subjects: subjectRows,
    weakTopics,
  }
}

/** Normaliza as respostas marcadas para o envio: só chaves válidas, sem vazias. */
export function normalizeAnswers(answers, questionIds) {
  const allowed = new Set(questionIds)
  const result = {}
  for (const [questionId, key] of Object.entries(answers ?? {})) {
    if (!allowed.has(questionId)) continue
    result[questionId] = ALTERNATIVE_KEYS.includes(key) ? key : null
  }
  for (const questionId of allowed) if (!(questionId in result)) result[questionId] = null
  return result
}

/** Validação do formulário administrativo de uma questão. Retorna mensagem ou null. */
export function validateQuestionDraft(question) {
  if (!question || !String(question.statement ?? "").trim()) return "Informe o enunciado."
  const alternatives = (question.alternatives ?? []).filter((alternative) => String(alternative.text ?? "").trim())
  if (alternatives.length < 2) return "Informe pelo menos duas alternativas."
  if (alternatives.length > 5) return "Use no máximo cinco alternativas."
  const keys = alternatives.map((alternative) => alternative.key)
  if (new Set(keys).size !== keys.length || keys.some((key) => !ALTERNATIVE_KEYS.includes(key))) return "Alternativas inválidas."
  if (!keys.includes(question.correctKey)) return "Marque a alternativa correta."
  return null
}

/**
 * Lê questões coladas em texto, no formato:
 *   1. Enunciado (pode ter várias linhas)
 *   A) alternativa   (ou "A -", "a)")
 *   ...
 *   Gabarito: C
 *   Comentário: texto (pode ter várias linhas)
 * Questões separadas por linha em branco seguida de número, ou pelo número no início.
 */
export function parseQuestionsText(text) {
  const lines = String(text ?? "").replace(/\r\n?/g, "\n").split("\n")
  const questions = []
  let current = null
  let section = null
  const push = () => {
    if (current) questions.push(current)
    current = null
    section = null
  }
  for (const raw of lines) {
    const line = raw.trimEnd()
    const start = /^\s*(\d{1,3})\s*[.)-]\s+(.*)$/.exec(line)
    const alternative = /^\s*\(?([A-Ea-e])\)?\s*[).\-–:]\s*(.*)$/.exec(line)
    const key = /^\s*gabarito\s*[:\-–]\s*([A-Ea-e])\b/i.exec(line)
    const comment = /^\s*coment[áa]rio\s*[:\-–]\s*(.*)$/i.exec(line)
    if (start && (!current || section !== "statement" || current.alternatives.length > 0 || current.correctKey)) {
      push()
      current = { statement: start[2], alternatives: [], correctKey: "", explanation: "" }
      section = "statement"
      continue
    }
    if (!current) continue
    if (key) {
      current.correctKey = key[1].toUpperCase()
      section = "key"
      continue
    }
    if (comment) {
      current.explanation = comment[1]
      section = "comment"
      continue
    }
    if (alternative && section !== "comment") {
      current.alternatives.push({ key: alternative[1].toUpperCase(), text: alternative[2] })
      section = "alternative"
      continue
    }
    if (!line.trim()) {
      if (section === "statement") current.statement += "\n"
      else if (section === "comment") current.explanation += "\n"
      continue
    }
    if (section === "statement") current.statement += `${current.statement.endsWith("\n") || !current.statement ? "" : "\n"}${line.trim()}`
    else if (section === "alternative") {
      const last = current.alternatives[current.alternatives.length - 1]
      last.text = `${last.text} ${line.trim()}`.trim()
    } else if (section === "comment") current.explanation += `${current.explanation.endsWith("\n") || !current.explanation ? "" : "\n"}${line.trim()}`
  }
  push()
  return questions.map((question) => ({
    statement: question.statement.replace(/\n{3,}/g, "\n\n").trim(),
    alternatives: question.alternatives.map((alternative) => ({ key: alternative.key, text: alternative.text.trim() })),
    correctKey: question.correctKey,
    explanation: question.explanation.replace(/\n{3,}/g, "\n\n").trim(),
  }))
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
export function isUuid(value) {
  return typeof value === "string" && UUID_RE.test(value)
}

/** Segundos decorridos desde o início registrado pelo banco (nunca negativo). */
export function elapsedSeconds(startedAt, now = new Date()) {
  const start = new Date(startedAt).getTime()
  if (Number.isNaN(start)) return 0
  return Math.max(0, Math.floor((now.getTime() - start) / 1000))
}

/** Cronômetro em relógio: 05:07 ou 1:02:03. */
export function formatClock(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const two = (n) => String(n).padStart(2, "0")
  return h > 0 ? `${h}:${two(m)}:${two(s)}` : `${two(m)}:${two(s)}`
}

/** Duração por extenso curto: 42 min 10 s, 1 h 05 min. Nulo vira "—". */
export function formatDuration(seconds) {
  if (seconds === null || seconds === undefined || Number.isNaN(Number(seconds))) return "—"
  const total = Math.max(0, Math.floor(Number(seconds)))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) return `${h} h ${String(m).padStart(2, "0")} min`
  if (m > 0) return `${m} min ${String(s).padStart(2, "0")} s`
  return `${s} s`
}
