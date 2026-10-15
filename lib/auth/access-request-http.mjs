import { acceptResendRequest, clientIpFrom, normalizeResendEmail, RESEND_GENERIC_MESSAGE } from "./resend-access.mjs"

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
const DIAGNOSTIC_ORIGIN = "https://sg-diagnostico.vercel.app"

/** No course, role, password, callback URL or alternate recipient is accepted. */
export async function handleAccessRequest(request, { dependencies, schedule, siteUrl }) {
  const origin = request.headers.get("origin")
  const allowed = [DIAGNOSTIC_ORIGIN, new URL(siteUrl).origin]
  const cors = allowed.includes(origin) ? { "Access-Control-Allow-Origin": origin, "Vary": "Origin" } : {}
  const json = (status, value) => Response.json(value, { status, headers: { "Cache-Control": "no-store", ...cors } })
  if (!origin || !allowed.includes(origin)) return json(403, { error: "origem" })
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: {
    ...cors, "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "content-type", "Access-Control-Max-Age": "600",
  } })
  if (!request.headers.get("content-type")?.startsWith("application/json")) return json(415, { error: "content_type" })
  const reader = request.body?.getReader()
  if (!reader) return json(400, { error: "corpo" })
  let size = 0
  const chunks = []
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.length
    if (size > 4096) { await reader.cancel(); return json(413, { error: "tamanho" }) }
    chunks.push(Buffer.from(value))
  }
  let body
  try { body = JSON.parse(Buffer.concat(chunks).toString("utf8")) } catch { return json(400, { error: "json" }) }
  if (!body || Array.isArray(body) || Object.keys(body).some(key => !["email", "request_id"].includes(key)) || !UUID.test(body.request_id || "") || !normalizeResendEmail(body.email)) return json(422, { error: "dados" })
  try {
    const result = await acceptResendRequest({ email: body.email, requestKey: body.request_id, ip: clientIpFrom(request.headers) }, dependencies())
    // Enrollment checks and email delivery cannot be inferred from response timing.
    if (result.deliver) schedule(result.deliver)
    return json(202, { status: "accepted", message: RESEND_GENERIC_MESSAGE })
  } catch {
    return json(503, { status: "unavailable", message: "Não foi possível registrar o reenvio. Tente novamente em alguns minutos." })
  }
}
