import { after } from "next/server"
import { handleAccessRequest } from "@/lib/auth/access-request-http.mjs"
import { createResendAccessDependencies } from "@/lib/auth/resend-access-repository"

export const runtime = "nodejs"
export const maxDuration = 60

export async function POST(request: Request) {
  const siteUrl = process.env.SITE_URL
  if (!siteUrl) return Response.json({ status: "unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } })
  return handleAccessRequest(request, {
    dependencies: createResendAccessDependencies,
    schedule: work => after(work),
    siteUrl,
  })
}

export const OPTIONS = POST
