import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get("code")
  const requestedNext = searchParams.get("next")

  if (code) {
    const supabase = await createClient()
    const { error, data } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single()
      let destination = profile?.role === "admin" ? "/admin" : "/aluno"

      if (profile?.role !== "admin") {
        const { data: enrollment } = await supabase
          .from("enrollments")
          .select("id")
          .eq("user_id", data.user.id)
          .eq("status", "active")
          .limit(1)
          .maybeSingle()

        if (!enrollment) destination = "/auth/sem-acesso"
        if (requestedNext === "/auth/primeiro-acesso") destination = requestedNext
      }

      return NextResponse.redirect(`${origin}${destination}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/error`)
}
