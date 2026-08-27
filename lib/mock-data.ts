import type { Course, Discipline, EditalTopic, Goal, GoalItem, Material, Student } from "./types"

// ---------------------------------------------------------------------------
// Cursos
// ---------------------------------------------------------------------------
// Estrutura pensada para múltiplos concursos. Nenhuma tela deve conter regra
// hardcoded para um curso específico — tudo navega por courseId.

export const courses: Course[] = [
  {
    id: "prf",
    name: "Polícia Rodoviária Federal",
    organization: "PRF",
    shortName: "PRF",
    coverColor: "chart-1",
    studentsCount: 214,
    goalsCount: 6,
    published: true,
  },
  {
    id: "gm-fortaleza",
    name: "Guarda Municipal de Fortaleza",
    organization: "Prefeitura de Fortaleza",
    shortName: "GM Fortaleza",
    coverColor: "chart-2",
    studentsCount: 132,
    goalsCount: 4,
    published: true,
  },
  {
    id: "pol-penal-ce",
    name: "Polícia Penal do Ceará",
    organization: "SAP-CE",
    shortName: "Polícia Penal CE",
    coverColor: "chart-3",
    studentsCount: 89,
    goalsCount: 3,
    published: false,
  },
]

export function getCourse(courseId: string): Course | undefined {
  return courses.find((c) => c.id === courseId)
}

// ---------------------------------------------------------------------------
// Aluno logado (mock)
// ---------------------------------------------------------------------------

export const currentStudent: Student = {
  id: "student-1",
  name: "Ana Beatriz Souza",
  email: "ana.souza@email.com",
  courseId: "prf",
  avatarInitials: "AS",
  joinedAt: "2025-02-10",
}

export const students: Student[] = [
  currentStudent,
  { id: "student-2", name: "Carlos Eduardo Lima", email: "carlos.lima@email.com", courseId: "prf", avatarInitials: "CL", joinedAt: "2025-02-12" },
  { id: "student-3", name: "Fernanda Ramos", email: "fernanda.ramos@email.com", courseId: "prf", avatarInitials: "FR", joinedAt: "2025-02-15" },
  { id: "student-4", name: "João Pedro Alves", email: "joao.alves@email.com", courseId: "prf", avatarInitials: "JA", joinedAt: "2025-03-01" },
  { id: "student-5", name: "Larissa Martins", email: "larissa.martins@email.com", courseId: "prf", avatarInitials: "LM", joinedAt: "2025-03-04" },
  { id: "student-6", name: "Rafael Nogueira", email: "rafael.nogueira@email.com", courseId: "gm-fortaleza", avatarInitials: "RN", joinedAt: "2025-04-02" },
  { id: "student-7", name: "Beatriz Cavalcante", email: "beatriz.cavalcante@email.com", courseId: "gm-fortaleza", avatarInitials: "BC", joinedAt: "2025-04-06" },
  { id: "student-8", name: "Diego Farias", email: "diego.farias@email.com", courseId: "pol-penal-ce", avatarInitials: "DF", joinedAt: "2025-05-10" },
]

export function getStudentsByCourse(courseId: string): Student[] {
  return students.filter((s) => s.courseId === courseId)
}

// ---------------------------------------------------------------------------
// Disciplinas e edital
// ---------------------------------------------------------------------------

export const disciplines: Discipline[] = [
  { id: "prf-portugues", courseId: "prf", name: "Língua Portuguesa" },
  { id: "prf-constitucional", courseId: "prf", name: "Direito Constitucional" },
  { id: "prf-administrativo", courseId: "prf", name: "Direito Administrativo" },
  { id: "prf-transito", courseId: "prf", name: "Legislação de Trânsito" },
  { id: "prf-informatica", courseId: "prf", name: "Informática" },
  { id: "prf-raciocinio", courseId: "prf", name: "Raciocínio Lógico" },

  { id: "gm-portugues", courseId: "gm-fortaleza", name: "Língua Portuguesa" },
  { id: "gm-constitucional", courseId: "gm-fortaleza", name: "Direito Constitucional" },
  { id: "gm-penal", courseId: "gm-fortaleza", name: "Direito Penal" },

  { id: "pp-portugues", courseId: "pol-penal-ce", name: "Língua Portuguesa" },
  { id: "pp-penal", courseId: "pol-penal-ce", name: "Direito Penal e Execução Penal" },
]

export function getDisciplinesByCourse(courseId: string): Discipline[] {
  return disciplines.filter((d) => d.courseId === courseId)
}

export function getDiscipline(disciplineId: string): Discipline | undefined {
  return disciplines.find((d) => d.id === disciplineId)
}

export const editalTopics: EditalTopic[] = [
  // Língua Portuguesa (PRF)
  { id: "t-pt-1", disciplineId: "prf-portugues", courseId: "prf", name: "Interpretação de textos", studied: true },
  { id: "t-pt-2", disciplineId: "prf-portugues", courseId: "prf", name: "Tipologia textual", studied: true },
  { id: "t-pt-3", disciplineId: "prf-portugues", courseId: "prf", name: "Ortografia oficial", studied: true },
  { id: "t-pt-4", disciplineId: "prf-portugues", courseId: "prf", name: "Acentuação gráfica", studied: false },
  { id: "t-pt-5", disciplineId: "prf-portugues", courseId: "prf", name: "Emprego das classes de palavras", studied: false },
  { id: "t-pt-6", disciplineId: "prf-portugues", courseId: "prf", name: "Concordância nominal e verbal", studied: false },
  { id: "t-pt-7", disciplineId: "prf-portugues", courseId: "prf", name: "Regência nominal e verbal", studied: false },
  { id: "t-pt-8", disciplineId: "prf-portugues", courseId: "prf", name: "Pontuação", studied: false },

  // Direito Constitucional (PRF)
  { id: "t-dc-1", disciplineId: "prf-constitucional", courseId: "prf", name: "Princípios fundamentais", studied: true },
  { id: "t-dc-2", disciplineId: "prf-constitucional", courseId: "prf", name: "Direitos e garantias fundamentais", studied: true },
  { id: "t-dc-3", disciplineId: "prf-constitucional", courseId: "prf", name: "Organização do Estado", studied: false },
  { id: "t-dc-4", disciplineId: "prf-constitucional", courseId: "prf", name: "Administração pública", studied: false },
  { id: "t-dc-5", disciplineId: "prf-constitucional", courseId: "prf", name: "Segurança pública", studied: false },

  // Direito Administrativo (PRF)
  { id: "t-da-1", disciplineId: "prf-administrativo", courseId: "prf", name: "Princípios da administração pública", studied: true },
  { id: "t-da-2", disciplineId: "prf-administrativo", courseId: "prf", name: "Poderes administrativos", studied: false },
  { id: "t-da-3", disciplineId: "prf-administrativo", courseId: "prf", name: "Atos administrativos", studied: false },
  { id: "t-da-4", disciplineId: "prf-administrativo", courseId: "prf", name: "Licitações e contratos", studied: false },

  // Legislação de Trânsito (PRF)
  { id: "t-lt-1", disciplineId: "prf-transito", courseId: "prf", name: "Sistema Nacional de Trânsito", studied: true },
  { id: "t-lt-2", disciplineId: "prf-transito", courseId: "prf", name: "Normas gerais de circulação", studied: true },
  { id: "t-lt-3", disciplineId: "prf-transito", courseId: "prf", name: "Infrações e penalidades", studied: false },
  { id: "t-lt-4", disciplineId: "prf-transito", courseId: "prf", name: "Direção defensiva", studied: false },
  { id: "t-lt-5", disciplineId: "prf-transito", courseId: "prf", name: "Sinalização viária", studied: false },

  // Informática (PRF)
  { id: "t-inf-1", disciplineId: "prf-informatica", courseId: "prf", name: "Conceitos básicos de internet", studied: true },
  { id: "t-inf-2", disciplineId: "prf-informatica", courseId: "prf", name: "Segurança da informação", studied: false },
  { id: "t-inf-3", disciplineId: "prf-informatica", courseId: "prf", name: "Edição de textos e planilhas", studied: false },

  // Raciocínio Lógico (PRF)
  { id: "t-rl-1", disciplineId: "prf-raciocinio", courseId: "prf", name: "Estruturas lógicas", studied: false },
  { id: "t-rl-2", disciplineId: "prf-raciocinio", courseId: "prf", name: "Lógica de argumentação", studied: false },
  { id: "t-rl-3", disciplineId: "prf-raciocinio", courseId: "prf", name: "Diagramas lógicos", studied: false },

  // GM Fortaleza (exemplo reduzido)
  { id: "t-gmpt-1", disciplineId: "gm-portugues", courseId: "gm-fortaleza", name: "Interpretação de textos", studied: true },
  { id: "t-gmpt-2", disciplineId: "gm-portugues", courseId: "gm-fortaleza", name: "Ortografia oficial", studied: false },
  { id: "t-gmdc-1", disciplineId: "gm-constitucional", courseId: "gm-fortaleza", name: "Direitos e garantias fundamentais", studied: false },
  { id: "t-gmdp-1", disciplineId: "gm-penal", courseId: "gm-fortaleza", name: "Teoria do crime", studied: false },

  // Polícia Penal CE (exemplo reduzido)
  { id: "t-pppt-1", disciplineId: "pp-portugues", courseId: "pol-penal-ce", name: "Interpretação de textos", studied: false },
  { id: "t-ppdp-1", disciplineId: "pp-penal", courseId: "pol-penal-ce", name: "Execução penal", studied: false },
]

export function getTopicsByDiscipline(disciplineId: string): EditalTopic[] {
  return editalTopics.filter((t) => t.disciplineId === disciplineId)
}

export function getTopicsByCourse(courseId: string): EditalTopic[] {
  return editalTopics.filter((t) => t.courseId === courseId)
}

export function getTopic(topicId: string): EditalTopic | undefined {
  return editalTopics.find((t) => t.id === topicId)
}

// ---------------------------------------------------------------------------
// Biblioteca de materiais
// ---------------------------------------------------------------------------

export const materials: Material[] = [
  { id: "m-1", courseId: "prf", title: "Interpretação de textos na prática", disciplineId: "prf-portugues", type: "videoaula", url: "#" },
  { id: "m-2", courseId: "prf", title: "Apostila de Português — Módulo 1", disciplineId: "prf-portugues", type: "apostila", url: "#" },
  { id: "m-3", courseId: "prf", title: "Direitos e garantias fundamentais", disciplineId: "prf-constitucional", type: "videoaula", url: "#" },
  { id: "m-4", courseId: "prf", title: "Apostila de Constitucional — Título II", disciplineId: "prf-constitucional", type: "apostila", url: "#" },
  { id: "m-5", courseId: "prf", title: "Resumo de princípios administrativos", disciplineId: "prf-administrativo", type: "link", url: "#" },
  { id: "m-6", courseId: "prf", title: "Infrações de trânsito comentadas", disciplineId: "prf-transito", type: "videoaula", url: "#" },
  { id: "m-7", courseId: "prf", title: "Apostila de Legislação de Trânsito", disciplineId: "prf-transito", type: "apostila", url: "#" },
  { id: "m-8", courseId: "prf", title: "Segurança da informação para concursos", disciplineId: "prf-informatica", type: "link", url: "#" },
  { id: "m-9", courseId: "gm-fortaleza", title: "Ortografia oficial na prática", disciplineId: "gm-portugues", type: "videoaula", url: "#" },
  { id: "m-10", courseId: "pol-penal-ce", title: "Execução penal — visão geral", disciplineId: "pp-penal", type: "apostila", url: "#" },
]

export function getMaterialsByCourse(courseId: string): Material[] {
  return materials.filter((m) => m.courseId === courseId)
}

// ---------------------------------------------------------------------------
// Metas
// ---------------------------------------------------------------------------

function checklist(studied: boolean, watchedLesson: boolean, consultedMaterial: boolean, solvedQuestions: boolean) {
  return { studied, watchedLesson, consultedMaterial, solvedQuestions }
}

export const goals: Goal[] = [
  {
    id: "prf-goal-1",
    courseId: "prf",
    number: 1,
    title: "Fundamentos de Português e Constitucional",
    date: "2025-11-03",
    description: "Primeiros passos no edital: interpretação de textos e princípios fundamentais.",
    published: true,
    items: [
      {
        id: "prf-goal-1-item-1",
        disciplineId: "prf-portugues",
        topicId: "t-pt-1",
        orientation: "Leia o texto motivador com atenção antes de resolver as questões. Foque em identificar a ideia central de cada parágrafo.",
        lessonUrl: "#",
        materialUrl: "#",
        suggestedQuestions: 15,
        checklist: checklist(true, true, true, true),
      },
      {
        id: "prf-goal-1-item-2",
        disciplineId: "prf-constitucional",
        topicId: "t-dc-1",
        orientation: "Revise os princípios fundamentais da CF/88, com atenção aos incisos do art. 1º ao 4º.",
        lessonUrl: "#",
        materialUrl: "#",
        suggestedQuestions: 10,
        checklist: checklist(true, true, true, true),
      },
    ],
  },
  {
    id: "prf-goal-2",
    courseId: "prf",
    number: 2,
    title: "Direitos Fundamentais e Trânsito Básico",
    date: "2025-11-10",
    description: "Aprofundamento em direitos e garantias fundamentais e introdução ao Código de Trânsito.",
    published: true,
    items: [
      {
        id: "prf-goal-2-item-1",
        disciplineId: "prf-constitucional",
        topicId: "t-dc-2",
        orientation: "Estude o art. 5º com calma. Grife os incisos mais citados em provas anteriores.",
        lessonUrl: "#",
        materialUrl: "#",
        suggestedQuestions: 12,
        checklist: checklist(true, true, true, true),
      },
      {
        id: "prf-goal-2-item-2",
        disciplineId: "prf-transito",
        topicId: "t-lt-1",
        orientation: "Entenda a composição do Sistema Nacional de Trânsito e os órgãos que o compõem.",
        lessonUrl: "#",
        materialUrl: "#",
        suggestedQuestions: 10,
        checklist: checklist(true, true, true, true),
      },
    ],
  },
  {
    id: "prf-goal-3",
    courseId: "prf",
    number: 3,
    title: "Direito Constitucional 3 — Direitos e Garantias Fundamentais",
    date: "2025-11-17",
    description: "Direito Constitucional: aprofundamento em direitos e garantias fundamentais, com foco nos pontos mais recorrentes em prova.",
    published: true,
    items: [
      {
        id: "prf-goal-3-item-1",
        disciplineId: "prf-constitucional",
        topicId: "t-dc-2",
        orientation: "Assista à aula sobre direitos e garantias fundamentais e depois consulte a apostila para revisar os pontos de maior incidência em prova.",
        lessonUrl: "#",
        materialUrl: "#",
        suggestedQuestions: 20,
        checklist: checklist(true, true, false, false),
      },
      {
        id: "prf-goal-3-item-2",
        disciplineId: "prf-transito",
        topicId: "t-lt-2",
        orientation: "Revise as normas gerais de circulação e conduta, com atenção às regras de prioridade.",
        lessonUrl: "#",
        materialUrl: "#",
        suggestedQuestions: 10,
        checklist: checklist(true, false, false, false),
      },
    ],
  },
  {
    id: "prf-goal-4",
    courseId: "prf",
    number: 4,
    title: "Administração Pública e Informática Básica",
    date: "2025-11-24",
    description: "Princípios da administração pública e conceitos introdutórios de informática.",
    published: true,
    items: [
      {
        id: "prf-goal-4-item-1",
        disciplineId: "prf-administrativo",
        topicId: "t-da-1",
        orientation: "Estude os princípios expressos e implícitos da administração pública.",
        lessonUrl: "#",
        materialUrl: "#",
        suggestedQuestions: 12,
        checklist: checklist(false, false, false, false),
      },
      {
        id: "prf-goal-4-item-2",
        disciplineId: "prf-informatica",
        topicId: "t-inf-1",
        orientation: "Revise conceitos básicos de internet e navegadores.",
        lessonUrl: "#",
        materialUrl: "#",
        suggestedQuestions: 8,
        checklist: checklist(false, false, false, false),
      },
    ],
  },
  {
    id: "prf-goal-5",
    courseId: "prf",
    number: 5,
    title: "Infrações de Trânsito e Poderes Administrativos",
    date: "2025-12-01",
    description: "Infrações e penalidades no CTB e poderes da administração pública.",
    published: true,
    items: [
      {
        id: "prf-goal-5-item-1",
        disciplineId: "prf-transito",
        topicId: "t-lt-3",
        orientation: "Monte um quadro comparativo das infrações leves, médias, graves e gravíssimas.",
        lessonUrl: "#",
        materialUrl: "#",
        suggestedQuestions: 15,
        checklist: checklist(false, false, false, false),
      },
      {
        id: "prf-goal-5-item-2",
        disciplineId: "prf-administrativo",
        topicId: "t-da-2",
        orientation: "Estude os poderes hierárquico, disciplinar, regulamentar e de polícia.",
        lessonUrl: "#",
        materialUrl: "#",
        suggestedQuestions: 10,
        checklist: checklist(false, false, false, false),
      },
    ],
  },
  {
    id: "prf-goal-6",
    courseId: "prf",
    number: 6,
    title: "Raciocínio Lógico Aplicado",
    date: "2025-12-08",
    description: "Introdução às estruturas lógicas e lógica de argumentação para a prova objetiva.",
    published: true,
    items: [
      {
        id: "prf-goal-6-item-1",
        disciplineId: "prf-raciocinio",
        topicId: "t-rl-1",
        orientation: "Revise proposições, conectivos e tabelas-verdade antes de resolver os exercícios.",
        lessonUrl: "#",
        materialUrl: "#",
        suggestedQuestions: 12,
        checklist: checklist(false, false, false, false),
      },
    ],
  },
]

export function getGoalsByCourse(courseId: string): Goal[] {
  return goals
    .filter((g) => g.courseId === courseId)
    .sort((a, b) => a.number - b.number)
}

export function getGoal(goalId: string): Goal | undefined {
  return goals.find((g) => g.id === goalId)
}

// ---------------------------------------------------------------------------
// Cálculos de progresso — únicos e reutilizáveis por courseId
// ---------------------------------------------------------------------------

export function getGoalChecklistTotals(goal: Goal) {
  let checked = 0
  let total = 0
  for (const item of goal.items) {
    const values = Object.values(item.checklist)
    total += values.length
    checked += values.filter(Boolean).length
  }
  return { checked, total }
}

export function getGoalProgress(goal: Goal): number {
  const { checked, total } = getGoalChecklistTotals(goal)
  if (total === 0) return 0
  return Math.round((checked / total) * 100)
}

export function getGoalStatus(goal: Goal): "pending" | "in_progress" | "completed" {
  const { checked, total } = getGoalChecklistTotals(goal)
  if (checked === 0) return "pending"
  if (checked === total) return "completed"
  return "in_progress"
}

export function getNextGoal(courseId: string): Goal | undefined {
  const courseGoals = getGoalsByCourse(courseId)
  return (
    courseGoals.find((g) => getGoalStatus(g) === "in_progress") ??
    courseGoals.find((g) => getGoalStatus(g) === "pending")
  )
}

export function getEditalProgressByDiscipline(courseId: string, disciplineId: string) {
  const topics = getTopicsByDiscipline(disciplineId).filter((t) => t.courseId === courseId)
  const studied = topics.filter((t) => t.studied).length
  const total = topics.length
  return { studied, total, percentage: total === 0 ? 0 : Math.round((studied / total) * 100) }
}

export function getEditalProgressByCourse(courseId: string) {
  const topics = getTopicsByCourse(courseId)
  const studied = topics.filter((t) => t.studied).length
  const total = topics.length
  return { studied, total, percentage: total === 0 ? 0 : Math.round((studied / total) * 100) }
}

export function getDisciplineProgressList(courseId: string) {
  return getDisciplinesByCourse(courseId).map((discipline) => ({
    discipline,
    ...getEditalProgressByDiscipline(courseId, discipline.id),
  }))
}

export function getGoalsSummary(courseId: string) {
  const courseGoals = getGoalsByCourse(courseId)
  const completed = courseGoals.filter((g) => getGoalStatus(g) === "completed").length
  const inProgress = courseGoals.filter((g) => getGoalStatus(g) === "in_progress").length
  const pending = courseGoals.filter((g) => getGoalStatus(g) === "pending").length
  return { total: courseGoals.length, completed, inProgress, pending }
}

export type { Course, Discipline, EditalTopic, Goal, GoalItem, Material, Student }
