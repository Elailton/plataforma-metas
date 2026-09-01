import Link from "next/link"
import { GraduationCap } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { getCurrentProfile } from "@/lib/supabase/queries"

export async function MobileTopbar() {
  const profile = await getCurrentProfile()

  return (
    <header className="flex items-center justify-between border-b border-border bg-card/95 px-4 py-3 backdrop-blur md:hidden">
      <div className="flex items-center gap-2">
        <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <GraduationCap className="size-4" />
        </div>
        <span className="text-sm font-semibold tracking-tight">Plataforma Metas</span>
      </div>
      <Link href="/aluno/conta" aria-label="Minha conta">
        <Avatar className="size-8">
          <AvatarFallback className="bg-secondary text-secondary-foreground text-xs font-semibold">
            {profile?.avatarInitials ?? "US"}
          </AvatarFallback>
        </Avatar>
      </Link>
    </header>
  )
}
