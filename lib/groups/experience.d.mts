export const TEST_GROUP: 3
export type GroupFeatureKey = "metas" | "edital" | "diagnostico_semanal" | "relatorio" | "ranking" | "progresso"
export const GROUP_FEATURES: ReadonlyArray<{ key: GroupFeatureKey; label: string; href: string | null }>
export function isFeatureKey(value: unknown): value is GroupFeatureKey
export function normalizeDisabledFeatures(values: unknown): GroupFeatureKey[]
export function settingsGroupFor(groupsEnabled: boolean, studyGroup: number | null | undefined): 1 | 2 | 3 | null
export function hiddenHrefs(disabled: readonly string[] | null | undefined): string[]
export function groupLabel(group: number | null | undefined, mirror?: number | null): string
export function audienceLabel(groups: readonly number[] | null | undefined): string
