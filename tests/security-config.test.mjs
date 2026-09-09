import assert from "node:assert/strict"
import test from "node:test"
import nextConfig from "../next.config.mjs"

test("todas as rotas recebem os cabeçalhos defensivos básicos", async () => {
  const rules = await nextConfig.headers()
  assert.equal(rules.length, 1)
  assert.equal(rules[0].source, "/:path*")

  const headers = new Map(rules[0].headers.map(({ key, value }) => [key, value]))
  assert.equal(headers.get("X-Content-Type-Options"), "nosniff")
  assert.equal(headers.get("X-Frame-Options"), "DENY")
  assert.equal(headers.get("Referrer-Policy"), "strict-origin-when-cross-origin")
  assert.match(headers.get("Permissions-Policy"), /camera=\(\)/)
  assert.match(headers.get("Content-Security-Policy"), /frame-ancestors 'none'/)
  assert.match(headers.get("Content-Security-Policy"), /object-src 'none'/)
  assert.equal(headers.has("X-XSS-Protection"), false)
})
