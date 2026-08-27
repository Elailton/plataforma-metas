import Link from "next/link"
import { GraduationCap } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { currentStudent } from "@/lib/mock-data"

export function MobileTopbar() {
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
            {currentStudent.avatarInitials}
          </AvatarFallback>
        </Avatar>
      </Link>
    </header>
  )
}
