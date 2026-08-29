import "server-only"

import { createClient } from "@/lib/supabase/server"

/**
 * Garante que o usuário autenticado é um administrador antes de qualquer
 * escrita. Lança erro se não houver sessão ou o papel não for "admin".
 * As políticas de RLS no banco são a barreira definitiva, mas esta checagem
 * evita round-trips inúteis e produz mensagens claras na UI.
 */
export async function requireAdmin() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("Você precisa estar autenticado.")
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  if (!profile || profile.role !== "admin") {
    throw new Error("Apenas administradores podem realizar esta ação.")
  }

  return { supabase, userId: user.id }
}
