"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/")
}

export async function updateOwnProfileName(value: string) {
  const fullName = value.trim()
  if (!fullName) throw new Error("Informe seu nome.")
  if (fullName.length > 150) throw new Error("O nome deve ter no máximo 150 caracteres.")

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Você precisa estar autenticado.")

  const avatarInitials = fullName.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("")
  const { error } = await supabase.from("profiles").update({ full_name: fullName, avatar_initials: avatarInitials }).eq("id", user.id)
  if (error) throw new Error("Não foi possível atualizar seu nome.")
  revalidatePath("/aluno", "layout")
}
