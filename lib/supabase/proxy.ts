import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // Com Fluid compute, não guarde este client em uma variável de ambiente
  // global. Sempre crie um novo em cada requisição.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Cookies seguros em produção; em dev, não, para que o localhost continue funcionando.
      cookieOptions: { secure: process.env.NODE_ENV === "production" },
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    },
  )

  // Não execute código entre createServerClient e supabase.auth.getUser().
  // Um erro simples aqui pode causar logout aleatório de usuários.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isStudentArea = pathname.startsWith("/aluno")
  const isAdminArea = pathname.startsWith("/admin")

  if ((isStudentArea || isAdminArea) && !user) {
    const url = request.nextUrl.clone()
    url.pathname = "/auth/login"
    url.searchParams.set("next", pathname)
    return NextResponse.redirect(url)
  }

  if ((isStudentArea || isAdminArea) && user) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
    const role = profile?.role

    if (!role) {
      const url = request.nextUrl.clone()
      url.pathname = "/auth/sem-acesso"
      return NextResponse.redirect(url)
    }

    if (isAdminArea && role !== "admin") {
      const url = request.nextUrl.clone()
      url.pathname = "/aluno"
      return NextResponse.redirect(url)
    }

    if (isStudentArea && role !== "student") {
      const url = request.nextUrl.clone()
      url.pathname = "/admin"
      return NextResponse.redirect(url)
    }

    if (isStudentArea && role === "student") {
      const { data: enrollment } = await supabase
        .from("enrollments")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle()

      if (!enrollment) {
        const url = request.nextUrl.clone()
        url.pathname = "/auth/sem-acesso"
        return NextResponse.redirect(url)
      }
    }
  }

  // IMPORTANTE: você *deve* retornar o objeto supabaseResponse como está.
  // Se criar um novo response com NextResponse.next(), lembre de:
  // 1. Passar o request nele: const myNewResponse = NextResponse.next({ request })
  // 2. Copiar os cookies: myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Alterar o myNewResponse conforme necessário, mas sem tocar nos cookies
  // Caso contrário, o browser e o servidor podem perder sincronia e a sessão
  // do usuário pode ser encerrada prematuramente!

  return supabaseResponse
}
