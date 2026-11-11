export const TEST_GROUP: 3
export type GroupFeatureKey = "metas" | "edital" | "diagnostico_semanal" | "simulado_mensal" | "relatorio" | "ranking" | "progresso" | "ultimo_concurso" | "contador_prova" | "reta_final" | "se_sobrar_tempo" | "nota_geral" | "ranking_nota_final"
export const GROUP_FEATURES: ReadonlyArray<{ key: GroupFeatureKey; label: string; href: string | null }>
export function isFeatureKey(value: unknown): value is GroupFeatureKey
export function normalizeDisabledFeatures(values: unknown): GroupFeatureKey[]
export function settingsGroupFor(groupsEnabled: boolean, studyGroup: number | null | undefined): 1 | 2 | 3 | null
export function hiddenHrefs(disabled: readonly string[] | null | undefined): string[]
export function groupLabel(group: number | null | undefined, mirror?: number | null): string
export function audienceLabel(groups: readonly number[] | null | undefined): string
export const SIMULADOS_HREF: "/aluno/simulados"
export function simuladosSections(
  disabled: readonly string[] | null | undefined,
): Array<{ key: "diagnostico_semanal" | "simulado_mensal" | "relatorio"; label: string; href: string }>

export function groupOptionLabel(group: number): string;
