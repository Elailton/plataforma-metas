import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"

// Imagens das questões dos Mini Simulados. Exige sessão; a leitura passa pela RLS.
export const dynamic = "force-dynamic"

function decodeBytea(value: unknown): Buffer | null {
  if (typeof value !== "string") return null
  if (value.startsWith("\\x")) return Buffer.from(value.slice(2), "hex")
  return Buffer.from(value, "base64")
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ hash: string }> }) {
  const { hash } = await params
  if (!/^[0-9a-f]{16}$/.test(hash)) return new NextResponse(null, { status: 404 })
  const supabase = await createClient()
  const { data: claims } = await supabase.auth.getClaims()
  if (!claims?.claims?.sub) return new NextResponse(null, { status: 401 })

  const { data } = await supabase.from("mini_quiz_images").select("mime, data").eq("hash", hash).maybeSingle()
  const bytes = data ? decodeBytea(data.data) : null
  if (!data || !bytes) return new NextResponse(null, { status: 404 })

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": data.mime,
      "Cache-Control": "private, max-age=86400, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'",
    },
  })
}
