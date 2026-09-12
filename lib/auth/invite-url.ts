import "server-only"

export function inviteRedirectUrl() {
  const siteUrl = process.env.SITE_URL
  if (!siteUrl) throw new Error("SITE_URL não está configurada para o convite de primeiro acesso.")
  const confirm = new URL("/auth/confirm", siteUrl)
  confirm.searchParams.set("next", "/auth/primeiro-acesso")
  return confirm.toString()
}
