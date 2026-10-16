import { evaluateOffer, normalizeOfferCode, normalizeEmail, processHotmartEvent } from "./core.mjs"

// API-only entry point; never receives a purchase, course or role from HTTP.
// Use the real approval timestamp, NEVER the lookup time: a delayed API response
// must not override a refund/chargeback received by the webhook concurrently.
export async function recoverHotmartPurchases(email, { sales, repository, signal = AbortSignal.timeout(40000) }) {
  email = normalizeEmail(email)
  const userId = await repository.findUserByEmail(email)
  if (userId && await repository.getProfileRole(userId) === "admin") return
  const purchases = await sales.findPaidPurchases(email, signal)
  for (const purchase of purchases) {
    if (normalizeEmail(purchase.email) !== email) throw new Error("Purchase identity conflict")
    const mapping = await repository.findProductMapping(purchase.productUcode)
    if (!mapping?.active || evaluateOffer(mapping, normalizeOfferCode(purchase.offerCode)).verdict !== "granting") continue
    if (!await sales.confirmPurchase(purchase, signal)) continue
    await processHotmartEvent({
      id: `sales-api:${purchase.transaction}:${purchase.approvedDate}`,
      event: "PURCHASE_APPROVED", version: "2.0.0", creation_date: purchase.approvedDate,
      data: {
        product: { id: purchase.productId, ucode: purchase.productUcode },
        buyer: { email, name: purchase.fullName, ucode: purchase.buyerUcode },
        purchase: { transaction: purchase.transaction, offer: { code: purchase.offerCode } },
      },
    }, repository)
  }
}
