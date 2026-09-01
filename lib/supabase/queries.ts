import { createClient } from "@/lib/supabase/server"

export interface CurrentProfile {
  id: string
  email: string
  fullName: string
  role: "student" | "admin"
  avatarInitials: string
  enrollments: CurrentEnrollment[]
}

export interface CurrentEnrollment {
  id: string
  courseId: string
  status: "active" | "suspended" | "revoked"
  enrolledAt: string
  course: {
    id: string
    name: string
    slug: string
    status: string
  } | null
}

export async function getCurrentProfile(): Promise<CurrentProfile | null> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, avatar_initials")
    .eq("id", user.id)
    .single()

  if (!profile) return null

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("id, course_id, status, enrolled_at, courses!enrollments_course_id_fkey(id, name, slug, status)")
    .eq("user_id", user.id)
    .order("enrolled_at", { ascending: false })

  return {
    id: user.id,
    email: user.email ?? "",
    fullName: profile.full_name || "Usuário",
    role: profile.role === "admin" ? "admin" : "student",
    avatarInitials:
      profile.avatar_initials ||
      profile.full_name
        ?.split(" ")
        .slice(0, 2)
        .map((part: string) => part[0]?.toUpperCase())
        .join("") ||
      "US",
    enrollments: (enrollments ?? []).map((enrollment: any) => ({
      id: enrollment.id,
      courseId: enrollment.course_id,
      status: enrollment.status,
      enrolledAt: enrollment.enrolled_at,
      course: Array.isArray(enrollment.courses) ? enrollment.courses[0] ?? null : enrollment.courses,
    })),
  }
}
