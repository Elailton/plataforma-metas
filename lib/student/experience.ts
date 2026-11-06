import "server-only"

import { cache } from "react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { logSafeServerError } from "@/lib/security/safe-error"
import { getStudentContext } from "@/lib/student/queries"
import {
  TEST_GROUP,
  hiddenHrefs,
  normalizeDisabledFeatures,
  settingsGroupFor,
  type GroupFeatureKey,
} from "@/lib/groups/experience.mjs"

export interface StudentExperience {
  disabled: GroupFeatureKey[]
  hiddenHrefs: string[]
  notice: string | null
  isEnabled: (feature: GroupFeatureKey) => boolean
}

const EMPTY: StudentExperience = { disabled: [], hiddenHrefs: [], notice: null, isEnabled: () => true }

/**
 * Abas/funções e aviso definidos pelo administrador para o grupo do aluno no
 * curso atual. Sem configuração (ou em erro), tudo fica ligado.
 */
export const getStudentExperience = cache(async function getStudentExperience(): Promise<StudentExperience> {
  const context = await getStudentContext()
  if (!context) return EMPTY
  const enrollment = context.profile.enrollments.find((entry) => entry.courseId === context.currentCourse.id)
  const group = settingsGroupFor(Boolean(enrollment?.course?.groups_enabled), enrollment?.studyGroup ?? null)
  if (group === null) return EMPTY

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("course_group_settings")
    .select("disabled_features, notice")
    .eq("course_id", context.currentCourse.id)
    .eq("study_group", group)
    .maybeSingle()
  if (error) {
    logSafeServerError("student.group_settings_failed", error)
    return EMPTY
  }
  const disabled = normalizeDisabledFeatures(data?.disabled_features ?? [])
  // Simulado Mensal: o Grupo 3 (teste) sempre vê a seção; os demais só depois que um
  // simulado mensal for liberado para o grupo (a RLS aplica grupo e data).
  if (!disabled.includes("simulado_mensal") && enrollment?.studyGroup !== TEST_GROUP) {
    const monthly = await supabase
      .from("mini_quizzes")
      .select("id", { count: "exact", head: true })
      .eq("course_id", context.currentCourse.id)
      .eq("status", "published")
      .eq("kind", "mensal")
    if (monthly.error) logSafeServerError("student.monthly_check_failed", monthly.error)
    if (monthly.error || !monthly.count) disabled.push("simulado_mensal")
  }
  const off = new Set<string>(disabled)
  return {
    disabled,
    hiddenHrefs: hiddenHrefs(disabled),
    notice: data?.notice?.trim() ? data.notice.trim() : null,
    isEnabled: (feature) => !off.has(feature),
  }
})

/** Usado no layout de cada aba: função desligada para o grupo volta para o início. */
export async function requireStudentFeature(feature: GroupFeatureKey) {
  const experience = await getStudentExperience()
  if (!experience.isEnabled(feature)) redirect("/aluno")
  return experience
}
