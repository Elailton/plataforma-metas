import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { isUuid, materialFileRoute, parsePdfStoragePath, PDF_BUCKET } from "@/lib/materials/pdf.mjs"

// Abre um PDF guardado na plataforma. A autorização é feita pelo banco:
// a RLS de materials só devolve materiais de cursos com acesso efetivo, e a
// política do bucket repete essa regra ao assinar a URL com o token do usuário.
// Nenhum cliente com service_role é usado aqui.
const SIGNED_URL_SECONDS = 120

export const dynamic = "force-dynamic"

function notFound() {
  return new NextResponse("Material não encontrado.", { status: 404, headers: { "Cache-Control": "no-store" } })
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ materialId: string }> }) {
  const { materialId } = await params
  if (!isUuid(materialId)) return notFound()

  const supabase = await createClient()
  const { data: claims } = await supabase.auth.getClaims()
  if (!claims?.claims?.sub) {
    const login = new URL("/auth/login", request.nextUrl.origin)
    login.searchParams.set("next", materialFileRoute(materialId))
    return NextResponse.redirect(login, { status: 303 })
  }

  const { data: material } = await supabase
    .from("materials")
    .select("id, course_id, storage_path")
    .eq("id", materialId)
    .maybeSingle()

  const path = material?.course_id ? parsePdfStoragePath(material.storage_path, material.course_id) : null
  if (!material || !path || path.materialId !== material.id) return notFound()

  const { data: signed, error } = await supabase.storage
    .from(PDF_BUCKET)
    .createSignedUrl(material.storage_path as string, SIGNED_URL_SECONDS)
  if (error || !signed?.signedUrl) return notFound()

  return NextResponse.redirect(signed.signedUrl, { status: 303, headers: { "Cache-Control": "no-store" } })
}
