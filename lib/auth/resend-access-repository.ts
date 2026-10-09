import "server-only"

import { createHmac } from "node:crypto"
import { inviteRedirectUrl } from "@/lib/auth/invite-url"
import { createAdminClient } from "@/lib/supabase/admin"
import type { ResendDependencies } from "@/lib/auth/resend-access.mjs"

const RETENTION_DAYS = 30

function hashKey() {
  const key = process.env.ACCESS_RESEND_HASH_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error("Segredo server-only ausente para o reenvio de acesso.")
  return key
}

/** Dependências reais do reenvio: somente service_role, nunca exposto ao navegador. */
export function createResendAccessDependencies(): ResendDependencies {
  const admin = createAdminClient()
  const key = hashKey()

  return {
    hash(value) {
      return createHmac("sha256", key).update(value).digest("hex")
    },

    async countRecent({ emailHash, ipHash, since }) {
      const sinceIso = since.toISOString()
      const count = async (column?: "email_hash" | "ip_hash", value?: string) => {
        let query = admin.from("access_resend_requests")
          .select("id", { count: "exact", head: true })
          .gte("created_at", sinceIso)
        if (column && value) query = query.eq(column, value)
        const { count: total, error } = await query
        if (error) throw new Error("Não foi possível aplicar o limite de reenvio.")
        return total ?? 0
      }
      const [email, ip, total] = await Promise.all([count("email_hash", emailHash), count("ip_hash", ipHash), count()])
      return { email, ip, total }
    },

    async record({ emailHash, ipHash, outcome }) {
      const { data, error } = await admin.from("access_resend_requests")
        .insert({ email_hash: emailHash, ip_hash: ipHash, outcome })
        .select("id").single()
      if (error) throw new Error("Não foi possível registrar o pedido de reenvio.")
      return typeof data?.id === "number" ? data.id : null
    },

    async updateOutcome(requestId, outcome) {
      if (requestId !== null) {
        await admin.from("access_resend_requests").update({ outcome }).eq("id", requestId)
      }
      // Retenção curta: os hashes servem apenas para o limite de frequência.
      const cutoff = new Date(Date.now() - RETENTION_DAYS * 86_400_000).toISOString()
      await admin.from("access_resend_requests").delete().lt("created_at", cutoff)
    },

    async hasActiveStudentAccess(email) {
      const { data: userId, error } = await admin.rpc("find_auth_user_id_by_email", { requested_email: email })
      if (error) throw new Error("Falha ao consultar a conta.")
      if (typeof userId !== "string") return false

      const { data: profile, error: profileError } = await admin.from("profiles")
        .select("role").eq("id", userId).maybeSingle()
      if (profileError) throw new Error("Falha ao consultar o perfil.")
      // Nunca reenviar acesso para administradores por esta rota pública.
      if (profile?.role !== "student") return false

      const { data: enrollments, error: enrollmentError } = await admin.from("enrollments")
        .select("course_id, courses!enrollments_course_id_fkey(status)")
        .eq("user_id", userId).eq("status", "active")
      if (enrollmentError) throw new Error("Falha ao consultar matrículas.")
      const courseIds = (enrollments ?? []).filter((row) => {
        const course = Array.isArray(row.courses) ? row.courses[0] : row.courses
        return course?.status === "published"
      }).map((row) => row.course_id as string)
      if (!courseIds.length) return false

      const { data: blocks, error: blockError } = await admin.from("course_access_blocks")
        .select("course_id").eq("user_id", userId).is("released_at", null).in("course_id", courseIds)
      if (blockError) throw new Error("Falha ao consultar bloqueios.")
      const blocked = new Set((blocks ?? []).map((row) => row.course_id as string))
      return courseIds.some((courseId) => !blocked.has(courseId))
    },

    async sendAccessEmail(email) {
      // Link de recuperação enviado somente ao próprio e-mail da conta: nenhuma senha
      // é alterada até que o titular abra o link e defina a nova senha no primeiro acesso.
      const { error } = await admin.auth.resetPasswordForEmail(email, { redirectTo: inviteRedirectUrl() })
      if (error) throw new Error("Falha ao enviar o e-mail de acesso.")
    },
  }
}
