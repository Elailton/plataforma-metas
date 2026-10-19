import type { GoalLockReason } from "@/lib/student/types"

/** Texto de disponibilidade da meta para o aluno (cartões e detalhe). */
export function goalAvailabilityLabel(
  goal: { dueDate: string | null; isReleased: boolean; lockReason: GoalLockReason },
  formatDate: (date: string) => string,
  fallback = "Disponível imediatamente",
): string {
  if (goal.isReleased) return goal.dueDate ? `Liberada em ${formatDate(goal.dueDate)}` : fallback
  if (goal.lockReason === "previous") return "Conclua a meta anterior"
  return goal.dueDate ? `Libera em ${formatDate(goal.dueDate)}` : fallback
}
