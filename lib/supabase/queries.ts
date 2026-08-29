import { createClient } from "@/lib/supabase/server"

export interface CurrentProfile {
  id: string
  email: string
  fullName: string
  role: "student" | "admin"
  courseId: string | null
  avatarInitials: string
}

export async function getCurrentProfile(): Promise<CurrentProfile | null> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, course_id, avatar_initials")
    .eq("id", user.id)
    .single()

  if (!profile) return null

  return {
    id: user.id,
    email: user.email ?? "",
    fullName: profile.full_name || "Usuário",
    role: profile.role === "admin" ? "admin" : "student",
    courseId: profile.course_id,
    avatarInitials:
      profile.avatar_initials ||
      profile.full_name
        ?.split(" ")
        .slice(0, 2)
        .map((part: string) => part[0]?.toUpperCase())
        .join("") ||
      "US",
  }
}
