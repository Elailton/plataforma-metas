import "server-only"
import { getStudentEssays, type StudentEssay } from "@/lib/mini-quizzes/essays"
import { createClient } from "@/lib/supabase/server"
import { logSafeServerError } from "@/lib/security/safe-error"
import { isUuid } from "@/lib/mini-quizzes/core.mjs"

export interface EssayReport {
  essay_id: string
  storage_path: string
  published_at: string
  viewed_at: string | null
}

/** RLS verifica dono, matrícula, curso publicado, grupo e status da correção. */
export async function getEssayReports(essayIds: string[]): Promise<EssayReport[]> {
  const ids = essayIds.filter(isUuid)
  if (!ids.length) return []
  const supabase = await createClient()
  const { data, error } = await supabase.from("mini_quiz_essay_reports")
    .select("essay_id, storage_path, published_at, viewed_at").in("essay_id", ids)
  if (error) {
    // Antes da migração, o relatório e as notas existentes continuam funcionando.
    if (error.code !== "42P01" && error.code !== "PGRST205") logSafeServerError("essay_report.read_failed", error)
    return []
  }
  return data ?? []
}

export interface EssayAnalysis extends StudentEssay { isTestCopy?: boolean }

/** Entregas reais e cópias autorizadas, sem inventar tentativas no relatório do aluno. */
export async function getEssayAnalysisData(courseId: string, userId: string): Promise<{essays: EssayAnalysis[]; reports: EssayReport[]}> {
  if (!isUuid(courseId) || !isUuid(userId)) return {essays:[],reports:[]}
  const supabase = await createClient()
  const [own, copies] = await Promise.all([
    getStudentEssays(courseId,userId),
    supabase.rpc("student_essay_report_test_copies",{p_course_id:courseId}),
  ])
  if (copies.error && !["PGRST202","42883"].includes(copies.error.code)) {
    logSafeServerError("essay_report.test_copies_failed",copies.error)
  }
  const items = !copies.error && Array.isArray(copies.data)
    ? copies.data as {essay:EssayAnalysis;report:EssayReport}[] : []
  const reports = await getEssayReports(own.map((essay) => essay.id))
  return {essays:[...own,...items.map((item) => item.essay)],reports:[...reports,...items.map((item) => item.report)]}
}
