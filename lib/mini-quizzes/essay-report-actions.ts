"use server"

import { randomUUID } from "node:crypto"
import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/admin/auth"
import { getStudentContext } from "@/lib/student/queries"
import { requireStudentFeature } from "@/lib/student/experience"
import { createClient } from "@/lib/supabase/server"
import { isUuid } from "@/lib/mini-quizzes/core.mjs"
import { REPORT_BUCKET, REPORT_MAX_BYTES, reportPath, validReportPdf } from "@/lib/mini-quizzes/essay-report.mjs"
import { logSafeServerError } from "@/lib/security/safe-error"

export async function publishEssayReport(form: FormData): Promise<{ ok: boolean; error?: string }> {
  const { supabase } = await requireAdmin()
  const essayId = String(form.get("essayId") ?? "")
  const expected = String(form.get("expectedPath") ?? "") || null
  const group = Number(form.get("targetGroup"))
  const file = form.get("pdf")
  if (!isUuid(essayId) || ![1,2,3].includes(group) || !(file instanceof File)
    || file.size > REPORT_MAX_BYTES || file.size < 5) return { ok: false, error: "Escolha uma redação, o público e um PDF de até 3 MB." }
  const header = await file.slice(0,5).text()
  if (!validReportPdf(file.type,file.size,header)) return { ok: false, error: "Envie um arquivo PDF válido, de até 3 MB." }
  const { data: essay, error } = await supabase.from("mini_quiz_essays")
    .select("id,course_id,status").eq("id",essayId).maybeSingle()
  if (error || !essay || essay.status !== "graded") return { ok: false, error: "Salve a correção antes de publicar o PDF." }
  const path = reportPath(essay.course_id,essay.id,randomUUID())
  if (!path) return { ok: false, error: "Não foi possível preparar o arquivo." }
  // Não usamos o nome do arquivo enviado: o caminho contém somente IDs aleatórios.
  const { error: uploadError } = await supabase.storage.from(REPORT_BUCKET).upload(path,file,{contentType:"application/pdf",upsert:false})
  if (uploadError) {
    logSafeServerError("essay_report.upload_failed", uploadError)
    return { ok: false, error: "Não foi possível enviar o PDF. Tente novamente." }
  }
  const { error: publishError } = await supabase.rpc("admin_publish_essay_report",{
    p_essay_id:essayId,p_storage_path:path,p_target_groups:[group],p_expected_path:expected,
  })
  if (publishError) {
    logSafeServerError("essay_report.publish_failed", publishError)
    return { ok: false, error: publishError.message.includes("REPORT_CONFLICT")
      ? "Esta correção foi atualizada em outra janela. Recarregue antes de enviar novamente."
      : "O arquivo foi recebido, mas não foi publicado. Recarregue e tente novamente." }
  }
  revalidatePath("/admin/mini-simulados/redacoes")
  revalidatePath("/aluno", "layout")
  return { ok:true }
}

export async function viewEssayReport(essayId: string, storagePath: string) {
  if (!isUuid(essayId) || typeof storagePath !== "string" || storagePath.length > 160) return
  const context = await getStudentContext()
  if (!context) return
  await requireStudentFeature("relatorio")
  const supabase = await createClient()
  const { data: essay } = await supabase.from("mini_quiz_essays").select("id")
    .eq("id",essayId).eq("course_id",context.currentCourse.id).eq("user_id",context.profile.id).maybeSingle()
  if (!essay) return
  const { error } = await supabase.rpc("student_view_essay_report",{p_essay_id:essayId,p_storage_path:storagePath})
  if (error) logSafeServerError("essay_report.view_failed", error)
  else revalidatePath("/aluno")
}
