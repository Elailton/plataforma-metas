"use server"

import { after } from "next/server"
import { headers } from "next/headers"
import { acceptResendRequest, clientIpFrom, RESEND_GENERIC_MESSAGE } from "@/lib/auth/resend-access.mjs"
import { createResendAccessDependencies } from "@/lib/auth/resend-access-repository"

export interface ResendAccessState {
  message: string | null
}

export async function requestAccessResend(_previous: ResendAccessState, formData: FormData): Promise<ResendAccessState> {
  try {
    const deps = createResendAccessDependencies()
    const result = await acceptResendRequest(
      { email: formData.get("email"), ip: clientIpFrom(await headers()) },
      deps,
    )
    // Verificação e envio após a resposta: o tempo de resposta não revela se o e-mail existe.
    if (result.deliver) after(result.deliver)
  } catch (error) {
    console.error("auth.resend_access.failed", error instanceof Error ? error.message : "unknown")
  }
  return { message: RESEND_GENERIC_MESSAGE }
}
