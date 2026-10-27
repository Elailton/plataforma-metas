// Imported only by the server repository. All endpoints are fixed; callers cannot
// choose a host, redirect, product or recipient. Errors never include responses,
// credentials, URLs or buyer data.
import { normalizeEmail } from "./core.mjs"

const API = "https://developers.hotmart.com"
const TOKEN = "https://api-sec-vlc.hotmart.com/security/oauth/token"
const PAID = new Set(["APPROVED", "COMPLETE"])
// Compras anteriores a 2020 já são recusadas; a API devolve 400 para start_date=0.
const HISTORY_START = Date.UTC(2020, 0, 1)
const PAGE_SIZE = "50"

export class HotmartSalesError extends Error {
  constructor(code, status, detail, parameter, operation) {
    super("Não foi possível verificar a compra na Hotmart.")
    this.name = "HotmartSalesError"
    this.code = code
    // Somente o código HTTP numérico, para diagnóstico (nunca corpo/URL/credencial).
    if (Number.isInteger(status)) this.status = status
    // Código curto de erro da própria Hotmart (ex.: invalid_parameter); nunca a descrição.
    if (typeof detail === "string" && /^[A-Za-z0-9_.-]{1,60}$/.test(detail)) this.detail = detail
    if (parameter) this.parameter = parameter
    if (operation) this.operation = operation
  }
}

export function createHotmartSalesClient({ credentials, fetchImpl = fetch, now = Date.now }) {
  let token = null
  let pendingToken = null

  async function json(url, init, signal) {
    try {
      const response = await fetchImpl(url, {
        ...init, cache: "no-store", redirect: "error",
        signal: AbortSignal.any([signal, AbortSignal.timeout(8000)]),
      })
      if (!response.ok) {
        let detail = null
        let parameter = null
        try {
          const body = await response.json()
          detail = typeof body?.error === "string" ? body.error : null
          // Extract only fixed parameter names; never persist error descriptions,
          // URLs, buyer data or arbitrary vendor fields.
          const description = typeof body?.error_description === "string" ? body.error_description : ""
          parameter = ["start_date", "end_date", "max_results", "page_token", "buyer_email", "product_id", "transaction", "date_range"]
            .find(name => new RegExp(`\\b${name}\\b`, "i").test(description)) ?? null
        } catch {}
        return { status: response.status, data: null, detail, parameter }
      }
      const data = await response.json()
      if (!data || typeof data !== "object") throw new Error()
      return { status: response.status, data }
    } catch {
      throw new HotmartSalesError("hotmart_unavailable")
    }
  }

  async function accessToken(signal) {
    if (token && token.expiresAt > now()) return token.value
    if (pendingToken) return pendingToken
    pendingToken = (async () => {
      const { clientId, clientSecret, basic } = credentials()
      if (!clientId?.trim() || !clientSecret?.trim() || !basic?.trim()) {
        throw new HotmartSalesError("hotmart_not_configured")
      }
      const url = new URL(TOKEN)
      url.search = new URLSearchParams({ grant_type: "client_credentials", client_id: clientId.trim(), client_secret: clientSecret.trim() }).toString()
      const auth = basic.trim().replace(/^Basic\s+/i, "")
      const result = await json(url, { method: "POST", headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" } }, signal)
      if (result.status !== 200 || typeof result.data?.access_token !== "string" || !result.data.access_token ||
          !Number.isFinite(result.data.expires_in) || result.data.expires_in <= 60) {
        throw new HotmartSalesError("hotmart_auth_failed", result.status)
      }
      token = { value: result.data.access_token, expiresAt: now() + Math.min(result.data.expires_in - 60, 3600) * 1000 }
      return token.value
    })()
    try { return await pendingToken } finally { pendingToken = null }
  }

  async function get(path, params, signal) {
    const url = new URL(path, API)
    url.search = new URLSearchParams(params).toString()
    for (let attempt = 0; attempt < 2; attempt++) {
      const bearer = await accessToken(signal)
      const result = await json(url, { headers: { Authorization: `Bearer ${bearer}`, Accept: "application/json", "Content-Type": "application/json" } }, signal)
      if (result.status === 401 && attempt === 0) { token = null; continue }
      if (result.status !== 200) throw new HotmartSalesError("hotmart_query_failed", result.status, result.detail, result.parameter,
        path === "/products/api/v1/products" ? "product_catalog" : path.endsWith("/users") ? "find_participants" : params.transaction ? "confirm_transaction" : "find_sales")
      return result.data
    }
    throw new HotmartSalesError("hotmart_auth_failed")
  }

  async function pages(path, params, signal, maxPages = 20) {
    const rows = []
    const cursors = new Set()
    let cursor = ""
    for (let page = 0; page < maxPages; page++) {
      const data = await get(path, { ...params, max_results: PAGE_SIZE, ...(cursor ? { page_token: cursor } : {}) }, signal)
      if (!Array.isArray(data.items)) throw new HotmartSalesError("hotmart_invalid_response")
      rows.push(...data.items)
      const next = data.page_info?.next_page_token
      if (next === undefined || next === null || next === "") return rows
      if (typeof next !== "string" || next.length > 4096 || cursors.has(next)) throw new HotmartSalesError("hotmart_pagination_failed")
      cursors.add(next)
      cursor = next
    }
    // No partial list may authorize an account when pagination is incomplete.
    throw new HotmartSalesError("hotmart_page_limit")
  }

  function paidSale(row, email) {
    try {
      return normalizeEmail(row?.buyer?.email) === email && PAID.has(row?.purchase?.status) &&
        /^HP[A-Za-z0-9_-]{1,100}$/.test(row?.purchase?.transaction) &&
        /^\d+$/.test(String(row?.product?.id)) && Number(row.product.id) > 0 &&
        Number.isSafeInteger(row?.purchase?.approved_date) && row.purchase.approved_date >= HISTORY_START &&
        row.purchase.approved_date <= now() && row.purchase.is_subscription === false
    } catch { return false }
  }

  async function salesFromParticipants(email, signal) {
    const participants = await pages("/payments/api/v1/sales/users", { buyer_email: email }, signal)
    const transactions = new Set()
    for (const row of participants) {
      const buyerMatches = Array.isArray(row?.users) && row.users.some(participant => {
        try { return participant?.role === "BUYER" && normalizeEmail(participant.user?.email) === email } catch { return false }
      })
      if (buyerMatches && /^HP[A-Za-z0-9_-]{1,100}$/.test(row?.transaction)) transactions.add(row.transaction)
    }
    if (transactions.size > 20) throw new HotmartSalesError("hotmart_transaction_limit")
    const sales = []
    for (const transaction of transactions) {
      const result = await pages("/payments/api/v1/sales/history", { transaction }, signal, 2)
      if (result.length !== 1 || result[0]?.purchase?.transaction !== transaction) throw new HotmartSalesError("hotmart_transaction_identity")
      // Participants are a locator, never proof of payment; the sale still
      // needs the exact buyer email, current paid status, product and offer.
      sales.push(result[0])
    }
    return sales
  }

  return {
    async findPaidPurchases(email, signal = AbortSignal.timeout(35000)) {
      email = normalizeEmail(email)
      let rows
      try {
        rows = await pages("/payments/api/v1/sales/history", {
          buyer_email: email, start_date: String(HISTORY_START), end_date: String(now()),
        }, signal)
      } catch (error) {
        // Some production accounts reject an explicit historical date range
        // with generic invalid_parameter. Dates are optional in this endpoint.
        // Retry only that exact validation error with the buyer filter intact.
        // Auth, rate-limit, network and pagination errors never use this retry.
        if (!(error instanceof HotmartSalesError) || error.status !== 400 || error.detail !== "invalid_parameter" ||
            (error.parameter && !["start_date", "end_date", "date_range"].includes(error.parameter))) throw error
        try {
          rows = await pages("/payments/api/v1/sales/history", { buyer_email: email }, signal)
        } catch (minimalError) {
          if (!(minimalError instanceof HotmartSalesError) || minimalError.status !== 400 || minimalError.detail !== "invalid_parameter" ||
              (minimalError.parameter && minimalError.parameter !== "buyer_email")) throw minimalError
          rows = await salesFromParticipants(email, signal)
        }
      }
      const candidates = rows.filter(row => paidSale(row, email))
      const unique = new Map()
      const products = new Map()
      for (const row of candidates) {
        const productId = String(row.product.id)
        if (!products.has(productId)) {
          if (products.size >= 20) throw new HotmartSalesError("hotmart_product_limit")
          const catalog = await pages("/products/api/v1/products", { id: productId }, signal, 2)
          const matches = catalog.filter(product => String(product.id) === productId)
          if (matches.length !== 1 || typeof matches[0].ucode !== "string" ||
              !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(matches[0].ucode)) {
            throw new HotmartSalesError("hotmart_product_identity_failed")
          }
          products.set(productId, matches[0].ucode)
        }
        const transaction = row.purchase.transaction
        if (unique.has(transaction)) throw new HotmartSalesError("hotmart_duplicate_transaction")
        unique.set(transaction, {
          transaction, productId, productUcode: products.get(productId),
          email, fullName: typeof row.buyer.name === "string" ? row.buyer.name.slice(0, 200) : null,
          buyerUcode: typeof row.buyer.ucode === "string" ? row.buyer.ucode : null,
          approvedDate: row.purchase.approved_date, offerCode: row.purchase.offer?.code ?? null,
        })
      }
      return [...unique.values()]
    },
    /**
     * Busca UMA venda pelo código da transação (HP…), para o autoatendimento.
     * Devolve null quando não existe ou não está paga. Parcelamentos (assinatura
     * de parcelas) contam como pagos enquanto a Hotmart mantiver APPROVED/COMPLETE.
     */
    async findPaidSaleByTransaction(transaction, signal = AbortSignal.timeout(20000)) {
      if (typeof transaction !== "string" || !/^HP[A-Za-z0-9_-]{1,100}$/.test(transaction)) return null
      const rows = await pages("/payments/api/v1/sales/history", { transaction }, signal, 2)
      const exact = rows.filter(row => row?.purchase?.transaction === transaction)
      if (exact.length === 0) return null
      if (exact.length !== 1) throw new HotmartSalesError("hotmart_transaction_identity")
      const row = exact[0]
      let email
      try { email = normalizeEmail(row?.buyer?.email) } catch { return null }
      const productId = String(row?.product?.id ?? "")
      if (!PAID.has(row?.purchase?.status) || !/^\d+$/.test(productId) || Number(productId) <= 0 ||
          !Number.isSafeInteger(row?.purchase?.approved_date) || row.purchase.approved_date < HISTORY_START ||
          row.purchase.approved_date > now()) return null
      const catalog = await pages("/products/api/v1/products", { id: productId }, signal, 2)
      const matches = catalog.filter(product => String(product.id) === productId)
      if (matches.length !== 1 || typeof matches[0].ucode !== "string" ||
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(matches[0].ucode)) {
        throw new HotmartSalesError("hotmart_product_identity_failed")
      }
      return {
        transaction, productId, productUcode: matches[0].ucode, email,
        fullName: typeof row.buyer?.name === "string" ? row.buyer.name.slice(0, 200) : null,
        buyerUcode: typeof row.buyer?.ucode === "string" ? row.buyer.ucode : null,
        approvedDate: row.purchase.approved_date, offerCode: row.purchase.offer?.code ?? null,
      }
    },
    async confirmPurchase(purchase, signal = AbortSignal.timeout(8000)) {
      const rows = await pages("/payments/api/v1/sales/history", { transaction: purchase.transaction }, signal, 2)
      return rows.length === 1 && paidSale(rows[0], purchase.email) &&
        rows[0].purchase.transaction === purchase.transaction &&
        String(rows[0].product.id) === purchase.productId &&
        rows[0].purchase.approved_date === purchase.approvedDate &&
        (rows[0].purchase.offer?.code ?? null) === purchase.offerCode
    },
  }
}
