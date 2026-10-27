export interface VerifiedPurchase {
  transaction: string
  productId: string
  productUcode: string
  email: string
  fullName: string | null
  buyerUcode: string | null
  approvedDate: number
  offerCode: string | null
}
export interface HotmartSalesClient {
  findPaidPurchases(email: string, signal?: AbortSignal): Promise<VerifiedPurchase[]>
  confirmPurchase(purchase: VerifiedPurchase, signal?: AbortSignal): Promise<boolean>
  findPaidSaleByTransaction(transaction: string, signal?: AbortSignal): Promise<VerifiedPurchase | null>
}
export class HotmartSalesError extends Error { code: string; status?: number; detail?: string; parameter?: string; operation?: string; constructor(code: string, status?: number, detail?: string | null, parameter?: string | null, operation?: string) }
export function createHotmartSalesClient(options: {
  credentials(): { clientId?: string; clientSecret?: string; basic?: string }
  fetchImpl?: typeof fetch
  now?: () => number
}): HotmartSalesClient
