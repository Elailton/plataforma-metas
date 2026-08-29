import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

/**
 * Especialmente importante com Fluid compute: nunca guarde este client em uma
 * variável global. Sempre crie um novo dentro de cada função ao utilizá-lo.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    // Cookies seguros em produção; em dev, não, para que o localhost continue funcionando.
    cookieOptions: { secure: process.env.NODE_ENV === "production" },
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // O método "setAll" foi chamado a partir de um Server Component.
          // Pode ser ignorado se houver refresh de sessão no proxy.
        }
      },
    },
  })
}
