// Configuração da plataforma por grupo (pura, testável).

/** Grupo interno de teste: vê o grupo espelhado e o que foi lançado só para ele. */
export const TEST_GROUP = 3

/** Abas e funções que o administrador liga/desliga por grupo. */
export const GROUP_FEATURES = Object.freeze([
  { key: "metas", label: "Minhas Metas", href: "/aluno/metas" },
  { key: "edital", label: "Edital", href: "/aluno/edital" },
  { key: "diagnostico_semanal", label: "Diagnóstico Semanal", href: "/aluno/diagnostico-semanal" },
  { key: "simulado_mensal", label: "Simulado Geral", href: "/aluno/simulado-geral" },
  { key: "relatorio", label: "Relatório", href: "/aluno/relatorio" },
  { key: "ranking", label: "Ranking (tela inicial e diagnósticos)", href: null },
  { key: "progresso", label: "Progresso", href: "/aluno/progresso" },
  { key: "contador_prova", label: "Contador da prova (tela inicial)", href: null },
  { key: "ultimo_concurso", label: "Selo \"Cobrado no último concurso\" (metas e edital)", href: null },
])

const KEYS = new Set(GROUP_FEATURES.map((feature) => feature.key))

export function isFeatureKey(value) {
  return typeof value === "string" && KEYS.has(value)
}

/** Lista limpa e sem repetição de funções desligadas. */
export function normalizeDisabledFeatures(values) {
  if (!Array.isArray(values)) return []
  return [...new Set(values.filter(isFeatureKey))]
}

/**
 * Grupo cuja configuração vale para o aluno: o próprio grupo (inclusive o 3);
 * em curso sem divisão, a configuração geral fica guardada no grupo 1.
 */
export function settingsGroupFor(groupsEnabled, studyGroup) {
  if (!groupsEnabled) return 1
  return studyGroup === 1 || studyGroup === 2 || studyGroup === TEST_GROUP ? studyGroup : null
}

/** Rotas de abas que o aluno não deve ver. */
export function hiddenHrefs(disabled) {
  const off = new Set(normalizeDisabledFeatures(disabled))
  const hidden = GROUP_FEATURES.filter((feature) => feature.href && off.has(feature.key)).map((feature) => feature.href)
  // A aba "Simulados" reúne diagnóstico, simulado mensal e relatório: some só quando todos estão desligados.
  if (SIMULADOS_SECTIONS.every((section) => off.has(section.key))) hidden.push(SIMULADOS_HREF)
  return hidden
}

/** Aba que reúne diagnóstico semanal, simulado mensal e relatório. */
export const SIMULADOS_HREF = "/aluno/simulados"

const SIMULADOS_SECTIONS = Object.freeze([
  { key: "diagnostico_semanal", label: "Semanal", href: "/aluno/diagnostico-semanal" },
  { key: "simulado_mensal", label: "Geral", href: "/aluno/simulado-geral" },
  { key: "relatorio", label: "Relatório", href: "/aluno/relatorio" },
])

/** Seções da aba "Simulados" visíveis para o aluno, na ordem das abas internas. */
export function simuladosSections(disabled) {
  const off = new Set(normalizeDisabledFeatures(disabled))
  return SIMULADOS_SECTIONS.filter((section) => !off.has(section.key))
}

/** Nome do grupo no painel do administrador (nunca exibido ao aluno). */
export function groupLabel(group, mirror = null) {
  if (group === TEST_GROUP) return mirror ? `Grupo 3 · teste (vê o G${mirror})` : "Grupo 3 · teste"
  return group ? `Grupo ${group}` : "Sem grupo"
}

/** Rótulo de público de uma meta/diagnóstico: "Grupos 1 e 2", "Só teste" etc. */
export function audienceLabel(groups) {
  const list = [...new Set((groups ?? []).filter((g) => g === 1 || g === 2 || g === TEST_GROUP))].sort()
  if (list.length === 0) return "Nenhum grupo"
  if (list.length === 1 && list[0] === TEST_GROUP) return "Só teste (Grupo 3)"
  const students = list.filter((g) => g !== TEST_GROUP)
  const base = students.length === 2 ? "Grupos 1 e 2" : `Grupo ${students[0]}`
  return list.includes(TEST_GROUP) ? `${base} + teste` : base
}
