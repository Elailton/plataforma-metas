"use client"

import { usePathname } from "next/navigation"
import { LogOut } from "lucide-react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { adminNavItems } from "./admin-nav-items"
import { signOut } from "@/lib/supabase/actions"

function getSectionLabel(pathname: string): string {
  const match = [...adminNavItems].reverse().find((item) => pathname.startsWith(item.href))
  return match?.label ?? "Painel do administrador"
}

export function AdminTopbar({ avatarInitials = "AD" }: { avatarInitials?: string }) {
  const pathname = usePathname()

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border bg-background px-4">
      <div className="flex items-center gap-2">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-5!" />
        <span className="text-sm font-medium text-foreground">{getSectionLabel(pathname)}</span>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Avatar className="size-8">
            <AvatarFallback className="bg-secondary text-xs font-semibold text-secondary-foreground">
              {avatarInitials}
            </AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            render={
              <form action={signOut} className="w-full">
                <button type="submit" className="flex w-full items-center gap-2">
                  <LogOut className="size-4" />
                  Sair da plataforma
                </button>
              </form>
            }
          />
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
