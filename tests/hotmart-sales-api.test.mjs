import test from "node:test"
import assert from "node:assert/strict"
import { createHotmartSalesClient, HotmartSalesError } from "../lib/hotmart/sales-api.mjs"

const EMAIL = "buyer@test.invalid"
const UCODE = "00000000-0000-4000-8000-000000000010"
const NOW = Date.UTC(2026, 9, 16)
const sale = (changes = {}) => ({
  buyer: { email: EMAIL, name: "Aluno" }, product: { id: 123 },
  purchase: { transaction: "HP123", status: "APPROVED", is_subscription: false, approved_date: NOW - 86400000, offer: { code: "authorized" } },
  ...changes,
})
function setup(handler, credentials = () => ({ clientId: "id", clientSecret: "secret", basic: "Basic basic-value" })) {
  const calls = []
  const client = createHotmartSalesClient({ credentials, now: () => NOW, fetchImpl: async (url, init) => {
    calls.push({ url: new URL(url), init })
    const result = await handler(new URL(url), init, calls)
    return Response.json(result?.body ?? result, { status: result?.status ?? 200 })
  } })
  return { client, calls }
}
const token = { access_token: "bearer-value", expires_in: 3600 }
const catalog = { items: [{ id: 123, ucode: UCODE }] }

test("API: autenticação privada, compra antiga, paginação e identidade ID→ucode", async () => {
  const { client, calls } = setup(url => {
    if (url.pathname.endsWith("/token")) return token
    if (url.pathname.endsWith("/products")) return catalog
    if (!url.searchParams.has("page_token")) return { items: [], page_info: { next_page_token: "page2" } }
    return { items: [sale()] }
  })
  const purchases = await client.findPaidPurchases(" BUYER@test.invalid ")
  assert.equal(purchases.length, 1)
  assert.equal(purchases[0].productUcode, UCODE)
  assert.equal(purchases[0].offerCode, "authorized")
  assert.equal(calls[0].init.headers.Authorization, "Basic basic-value")
  assert.equal(calls[1].url.searchParams.get("buyer_email"), EMAIL)
  assert.equal(calls[1].url.searchParams.get("start_date"), String(Date.UTC(2020, 0, 1)))
  assert.equal(calls[1].init.headers.Authorization, "Bearer bearer-value")
  assert.ok(calls.every(call => call.init.redirect === "error" && call.init.cache === "no-store" && call.init.signal))
})

test("API: não aceita reembolso, e-mail diferente, assinatura ou aprovação sem data", async () => {
  const original = sale()
  const rows = [
    sale({ buyer: { email: "other@test.invalid" } }),
    sale({ purchase: { ...original.purchase, status: "REFUNDED" } }),
    sale({ purchase: { ...original.purchase, is_subscription: true } }),
    sale({ purchase: { ...original.purchase, approved_date: undefined } }),
    sale({ purchase: { ...original.purchase, status: "WAITING_PAYMENT" } }),
    sale({ purchase: { ...original.purchase, approved_date: NOW + 1 } }),
  ]
  const { client, calls } = setup(url => url.pathname.endsWith("/token") ? token : { items: rows })
  assert.deepEqual(await client.findPaidPurchases(EMAIL), [])
  assert.equal(calls.length, 2)
})

test("API: reconfirma a transação e rejeita mudanças de comprador/produto/oferta/status", async () => {
  let current = sale()
  const { client } = setup(url => url.pathname.endsWith("/token") ? token :
    url.pathname.endsWith("/products") ? catalog : { items: [current] })
  const [purchase] = await client.findPaidPurchases(EMAIL)
  assert.equal(await client.confirmPurchase(purchase), true)
  for (const next of [sale({ buyer: { email: "other@test.invalid" } }), sale({ product: { id: 124 } }),
    sale({ purchase: { ...sale().purchase, status: "REFUNDED" } }),
    sale({ purchase: { ...sale().purchase, offer: { code: "other" } } })]) {
    current = next
    assert.equal(await client.confirmPurchase(purchase), false)
  }
})

test("API: renova o token uma vez em 401 e reutiliza token válido", async () => {
  let tokens = 0
  let queries = 0
  const { client } = setup(url => {
    if (url.pathname.endsWith("/token")) { tokens++; return token }
    queries++
    return queries === 1 ? { status: 401 } : { items: [] }
  })
  await client.findPaidPurchases(EMAIL)
  await client.findPaidPurchases(EMAIL)
  assert.equal(tokens, 2)
  assert.equal(queries, 3)
})

test("API: credenciais ausentes, erro, catálogo ambíguo e paginação incompleta nunca autorizam", async () => {
  const missing = setup(() => { throw new Error("must not fetch") }, () => ({}))
  await assert.rejects(missing.client.findPaidPurchases(EMAIL), error => error.code === "hotmart_not_configured")
  assert.equal(missing.calls.length, 0)
  for (const response of [{ status: 403 }, { status: 429 }, { body: { items: [], page_info: { next_page_token: "loop" } } }, { body: {} }]) {
    const { client } = setup(url => url.pathname.endsWith("/token") ? token : response)
    await assert.rejects(client.findPaidPurchases(EMAIL), HotmartSalesError)
  }
  const { client } = setup(url => url.pathname.endsWith("/token") ? token :
    url.pathname.endsWith("/products") ? { items: [{ id: 999, ucode: UCODE }] } : { items: [sale()] })
  await assert.rejects(client.findPaidPurchases(EMAIL), error => error.code === "hotmart_product_identity_failed")
})

test("API: erros de rede não vazam credenciais, URL nem dados pessoais", async () => {
  const { client } = setup(() => { throw new Error(`secret basic-value ${EMAIL}`) })
  await assert.rejects(client.findPaidPurchases(EMAIL), error => {
    assert.equal(String(error).includes(EMAIL), false)
    assert.equal(String(error).includes("basic-value"), false)
    assert.equal(String(error).includes("secret"), false)
    return error.code === "hotmart_unavailable"
  })
})

test("API: diagnóstico identifica somente etapa/parâmetro permitido sem expor a descrição", async () => {
  const { client } = setup(url => url.pathname.endsWith("/token") ? token : {status:400,body:{
    error:"invalid_parameter",error_description:`Invalid max_results for ${EMAIL} secret basic-value`,
  }})
  await assert.rejects(client.findPaidPurchases(EMAIL), error => {
    assert.equal(error.operation,"find_sales")
    assert.equal(error.parameter,"max_results")
    assert.equal(error.status,400)
    assert.equal(JSON.stringify(error).includes(EMAIL),false)
    assert.equal(JSON.stringify(error).includes("basic-value"),false)
    return true
  })
})

test("API: intervalo rejeitado usa datas padrão, preserva e-mail e reconfirmação", async () => {
  const { client, calls } = setup(url => {
    if (url.pathname.endsWith("/token")) return token
    if (url.pathname.endsWith("/products")) return catalog
    if (!url.searchParams.has("transaction")) assert.equal(url.searchParams.get("buyer_email"),EMAIL)
    if (url.searchParams.has("start_date")) return {status:400,body:{error:"invalid_parameter",error_description:"The request was unacceptable"}}
    return {items:[sale()]}
  })
  const [purchase] = await client.findPaidPurchases(EMAIL)
  assert.equal(purchase.productUcode,UCODE)
  assert.equal(calls.filter(call=>call.url.pathname.endsWith("/history")).length,2)
  assert.equal(await client.confirmPurchase(purchase),true)
})

test("API: participantes localizam transação; só o histórico confirma pagamento e comprador", async () => {
  let actual = sale()
  const { client, calls } = setup(url => {
    if (url.pathname.endsWith("/token")) return token
    if (url.pathname.endsWith("/products")) return catalog
    if (url.pathname.endsWith("/users")) return {items:[
      {transaction:"HP123",users:[{role:"BUYER",user:{email:EMAIL}}]},
      {transaction:"HP456",users:[{role:"PRODUCER",user:{email:EMAIL}}]},
      {transaction:"HP789",users:[{role:"BUYER",user:{email:"other@test.invalid"}}]},
    ]}
    if (url.searchParams.has("buyer_email")) return {status:400,body:{error:"invalid_parameter"}}
    assert.equal(url.searchParams.get("transaction"),"HP123")
    return {items:[actual]}
  })
  const [purchase] = await client.findPaidPurchases(EMAIL)
  assert.equal(purchase.transaction,"HP123")
  assert.equal(await client.confirmPurchase(purchase),true)
  actual = sale({purchase:{...sale().purchase,status:"REFUNDED"}})
  assert.equal(await client.confirmPurchase(purchase),false)
  assert.deepEqual(await client.findPaidPurchases(EMAIL),[])
  assert.ok(calls.filter(c=>c.url.pathname.endsWith("/users")).every(c=>c.url.searchParams.get("buyer_email")===EMAIL))
})

test("API: fallback não libera comprador diferente nem compra reembolsada", async () => {
  const { client, calls } = setup(url => {
    if (url.pathname.endsWith("/token")) return token
    if (url.searchParams.has("start_date")) return {status:400,body:{error:"invalid_parameter",error_description:"Invalid start_date"}}
    return {items:[sale({buyer:{email:"other@test.invalid"}}),sale({purchase:{...sale().purchase,status:"REFUNDED"}})]}
  })
  assert.deepEqual(await client.findPaidPurchases(EMAIL),[])
  assert.equal(calls.length,3)
})

test("API: busca por transação aceita parcelamento pago e devolve ucode; não paga ou inexistente = null", async () => {
  const subscription = sale({ purchase: { ...sale().purchase, transaction: "HP999", is_subscription: true } })
  const { client, calls } = setup(url => {
    if (url.pathname.endsWith("/token")) return token
    if (url.pathname.endsWith("/products")) return catalog
    if (url.searchParams.get("transaction") === "HP999") return { items: [subscription] }
    if (url.searchParams.get("transaction") === "HP777") return { items: [sale({ purchase: { ...sale().purchase, transaction: "HP777", status: "WAITING_PAYMENT" } })] }
    return { items: [] }
  })
  const found = await client.findPaidSaleByTransaction("HP999")
  assert.equal(found.productUcode, UCODE)
  assert.equal(found.email, EMAIL)
  assert.ok(calls.some(call => call.url.searchParams.get("transaction") === "HP999"))
  assert.equal(await client.findPaidSaleByTransaction("HP777"), null)
  assert.equal(await client.findPaidSaleByTransaction("HP000"), null)
  assert.equal(await client.findPaidSaleByTransaction("x"), null)
})
