import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"
import { processHotmartEvent, type HotmartProductMapping } from "@/lib/hotmart/core.mjs"
import { createHotmartRepository } from "@/lib/hotmart/supabase-repository"
import {
  buildReprocessPreview,
  REPROCESS_EVENT_PREFIX,
  runReprocessBatch,
  type ReprocessEventRow,
  type ReprocessPreview,
} from "@/lib/hotmart/reprocess.mjs"

const PAGE = 1000

/** Início do dia em Brasília (sem horário de verão desde 2019). */
function startOfTodayBrasilia(now = new Date()) {
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(now)
  return new Date(`${day}T00:00:00-03:00`).toISOString()
}

function fail(): never {
  throw new Error("Não foi possível consultar as compras pendentes.")
}

/**
 * Monta a prévia do curso no servidor (service role). Chamar somente depois de
 * requireAdmin(). Nada aqui grava ou envia e-mail.
 */
export async function loadReprocessPreview(courseId: string): Promise<ReprocessPreview> {
  const admin = createAdminClient()
  const repository = createHotmartRepository()

  const [{ data: course, error: courseError }, { data: mappingRows, error: mappingError }] = await Promise.all([
    admin.from("courses").select("status").eq("id", courseId).maybeSingle(),
    admin.from("hotmart_product_mappings").select("hotmart_product_ucode").eq("course_id", courseId),
  ])
  if (courseError || mappingError) fail()
  if (!course) throw new Error("Curso inválido.")

  const ucodes = (mappingRows ?? []).map((row) => row.hotmart_product_ucode as string)
  const mappings = new Map<string, HotmartProductMapping>()
  for (const ucode of ucodes) {
    const mapping = await repository.findProductMapping(ucode)
    if (mapping && mapping.courseId === courseId) mappings.set(ucode, mapping)
  }

  const events: ReprocessEventRow[] = []
  const entitled = new Set<string>()
  if (ucodes.length) {
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await admin.from("hotmart_webhook_events")
        .select("hotmart_event_id, transaction, event_type, offer_code, buyer_email, product_ucode, created_at")
        .in("product_ucode", ucodes).not("transaction", "is", null)
        .order("created_at", { ascending: true }).range(from, from + PAGE - 1)
      if (error) fail()
      for (const row of data ?? []) {
        events.push({
          eventId: row.hotmart_event_id, transaction: row.transaction, eventType: row.event_type,
          offerCode: row.offer_code, buyerEmail: row.buyer_email, productUcode: row.product_ucode,
          createdAt: row.created_at,
        })
      }
      if (!data || data.length < PAGE) break
    }
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await admin.from("hotmart_entitlements").select("transaction")
        .in("product_ucode", ucodes).range(from, from + PAGE - 1)
      if (error) fail()
      for (const row of data ?? []) entitled.add(row.transaction)
      if (!data || data.length < PAGE) break
    }
  }

  // Contas existentes (e-mail -> papel), para não convidar quem já tem conta.
  const accounts = new Map<string, "student" | "admin" | null>()
  const ids = new Map<string, string>()
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: PAGE })
    if (error) fail()
    for (const user of data.users) {
      if (user.email) {
        accounts.set(user.email.toLowerCase(), null)
        ids.set(user.id, user.email.toLowerCase())
      }
    }
    if (data.users.length < PAGE) break
  }
  const { data: profiles, error: profileError } = await admin.from("profiles").select("id, role").in("role", ["admin", "student"])
  if (profileError) fail()
  for (const profile of profiles ?? []) {
    const email = ids.get(profile.id)
    if (email) accounts.set(email, profile.role === "admin" ? "admin" : "student")
  }

  const { count, error: countError } = await admin.from("hotmart_webhook_events")
    .select("id", { count: "exact", head: true })
    .like("hotmart_event_id", `${REPROCESS_EVENT_PREFIX}%`)
    .gte("created_at", startOfTodayBrasilia())
  if (countError) fail()

  return buildReprocessPreview({
    events, mappings, entitledTransactions: entitled, accounts,
    courseStatus: course.status, usedToday: count ?? 0,
  })
}

/** Recalcula a prévia e processa só o que foi confirmado e continua elegível. */
export async function runReprocess(courseId: string, confirmedTransactions: string[]) {
  const preview = await loadReprocessPreview(courseId)
  const repository = createHotmartRepository()
  const result = await runReprocessBatch({
    preview, confirmedTransactions,
    process: (payload) => processHotmartEvent(payload, repository),
  })
  return result
}
