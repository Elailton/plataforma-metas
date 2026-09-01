import type { StudentGoalStatus, StudentGoalItem } from "./types"

export function calculatePercentage(completed: number, total: number): number
export function getGoalProgressStatus(completed: number, total: number): StudentGoalStatus
export function collectStudiedTopicIds(items: StudentGoalItem[]): Set<string>

