export function parseOfferInput(value: unknown): string | null
export function offerConfigurationWarning(
  policy: "any" | "authorized_offers",
  rules: { grantsAccess: boolean }[],
): string | null
