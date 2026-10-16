import type { HotmartRepository } from "./core.mjs"
import type { HotmartSalesClient } from "./sales-api.mjs"
export function recoverHotmartPurchases(email: string, dependencies: {
  sales: HotmartSalesClient
  repository: HotmartRepository
  signal?: AbortSignal
}): Promise<void>
