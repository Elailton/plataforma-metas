import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"
import type {
  EventProcessingStatus,
  HotmartRepository,
  ParsedHotmartEvent,
} from "@/lib/hotmart/core.mjs"

function throwDatabaseError(error: { message: string } | null) {
  if (error) throw new Error(error.message)
}

function inviteRedirectUrl() {
  const siteUrl = process.env.SITE_URL
  if (!siteUrl) {
    throw new Error("SITE_URL não está configurada para o convite de primeiro acesso.")
  }

  // O link real enviado ao aluno vem do template "Invite user" do Supabase
  // (que usa {{ .TokenHash }} e type=invite diretamente). Este redirectTo
  // só precisa apontar para uma URL da allow-list de Redirect URLs do
  // Supabase Auth; usamos o próprio endpoint de confirmação SSR.
  const confirm = new URL("/auth/confirm", siteUrl)
  confirm.searchParams.set("next", "/auth/primeiro-acesso")
  return confirm.toString()
}

export function createHotmartRepository(): HotmartRepository {
  const supabase = createAdminClient()

  async function findUserByEmail(email: string | null) {
    if (!email) return null

    const { data, error } = await supabase.rpc("find_auth_user_id_by_email", {
      requested_email: email,
    })
    throwDatabaseError(error)

    return typeof data === "string" ? data : null
  }

  return {
    async claimEvent(event: ParsedHotmartEvent) {
      const { data, error } = await supabase
        .rpc("claim_hotmart_webhook_event", {
          requested_event_id: event.eventId,
          requested_event_type: event.eventType,
          requested_transaction: event.transaction,
          requested_product_ucode: event.productUcode,
        })
        .single()

      throwDatabaseError(error)

      const claim = data as {
        was_claimed?: boolean
        current_status?: EventProcessingStatus
      } | null

      return {
        claimed: Boolean(claim?.was_claimed),
        status: claim?.current_status ?? "processing",
      }
    },

    async finishEvent(eventId, status, message) {
      const { error } = await supabase
        .from("hotmart_webhook_events")
        .update({
          processing_status: status,
          processed_at: new Date().toISOString(),
          error_message: message,
        })
        .eq("hotmart_event_id", eventId)

      throwDatabaseError(error)
    },

    async failEvent(eventId, message) {
      const { error } = await supabase
        .from("hotmart_webhook_events")
        .update({
          processing_status: "failed",
          processed_at: null,
          error_message: message.slice(0, 1000),
        })
        .eq("hotmart_event_id", eventId)

      throwDatabaseError(error)
    },

    async findProductMapping(productUcode) {
      if (!productUcode) return null

      const { data, error } = await supabase
        .from("hotmart_product_mappings")
        .select("course_id, active")
        .eq("hotmart_product_ucode", productUcode)
        .maybeSingle()

      throwDatabaseError(error)
      return data ? { courseId: data.course_id as string, active: Boolean(data.active) } : null
    },

    findUserByEmail,

    async inviteStudent({ email, fullName, avatarInitials }) {
      const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
        redirectTo: inviteRedirectUrl(),
        data: {
          full_name: fullName,
          avatar_initials: avatarInitials,
          role: "student",
        },
      })

      if (error) {
        // A delivery may race with another approved purchase for the same
        // e-mail. Reuse the account if it appeared between lookup and invite.
        const existingUserId = await findUserByEmail(email)
        if (existingUserId) return existingUserId
        throw new Error(error.message)
      }

      if (!data.user) throw new Error("A Hotmart não conseguiu provisionar o aluno.")
      return data.user.id
    },

    async ensureStudentProfile(userId, { fullName, avatarInitials }) {
      const { data: existing, error: selectError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .maybeSingle()

      throwDatabaseError(selectError)
      if (existing?.role === "admin") return "admin"
      if (existing) return "student"

      const { error: insertError } = await supabase.from("profiles").insert({
        id: userId,
        full_name: fullName || "Aluno",
        avatar_initials: avatarInitials,
        role: "student",
      })

      if (insertError && insertError.code !== "23505") {
        throw new Error(insertError.message)
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single()

      throwDatabaseError(profileError)
      if (!profile) throw new Error("Não foi possível criar o perfil do aluno.")
      return profile.role === "admin" ? "admin" : "student"
    },

    async getProfileRole(userId) {
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .maybeSingle()

      throwDatabaseError(error)
      if (!data) return null
      return data.role === "admin" ? "admin" : "student"
    },

    async findEntitlement(transaction) {
      const { data, error } = await supabase.from("hotmart_entitlements")
        .select("user_id, course_id, product_ucode, status, last_event_creation_date")
        .eq("transaction", transaction).maybeSingle()
      throwDatabaseError(error)
      return data ? {
        userId: data.user_id, courseId: data.course_id, productUcode: data.product_ucode,
        status: data.status, eventCreationDate: data.last_event_creation_date,
      } : null
    },

    async applyEntitlementEvent({
      transaction,
      userId,
      courseId,
      productUcode,
      productId,
      buyerUcode,
      status,
      eventId,
      eventCreationDate,
    }) {
      const { data, error } = await supabase
        .rpc("apply_hotmart_entitlement_event", {
          requested_transaction: transaction,
          requested_user_id: userId,
          requested_course_id: courseId,
          requested_product_ucode: productUcode,
          requested_product_id: productId,
          requested_buyer_ucode: buyerUcode,
          requested_status: status,
          requested_event_id: eventId,
          requested_event_creation_date: eventCreationDate,
        })
        .single()

      throwDatabaseError(error)

      const result = data as {
        event_applied?: boolean
        entitlement_status?: "active" | "suspended" | "revoked"
        enrollment_status?: "active" | "suspended" | "revoked" | null
      } | null

      if (!result?.entitlement_status || result.enrollment_status === undefined) {
        throw new Error("A reconciliação do acesso Hotmart não retornou um estado válido.")
      }

      return {
        applied: Boolean(result.event_applied),
        entitlementStatus: result.entitlement_status,
        enrollmentStatus: result.enrollment_status,
      }
    },
  }
}
