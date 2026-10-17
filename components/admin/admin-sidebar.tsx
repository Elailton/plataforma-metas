"use client"

import { BrandLockup } from "@/components/brand-logo"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LogOut } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { adminNavItems } from "./admin-nav-items"
import { signOut } from "@/lib/supabase/actions"

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <BrandLockup subtitle="Painel do administrador" />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="px-3 py-4">
          <SidebarGroupContent>
            <SidebarMenu>
              {adminNavItems.map((item) => {
                const isActive = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href)
                const Icon = item.icon
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={<Link href={item.href} />}
                      isActive={isActive}
                      className="h-9 data-active:font-semibold"
                    >
                      <Icon className={isActive ? "text-primary" : undefined} />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <form action={signOut}>
              <SidebarMenuButton render={<button type="submit" />}>
                <LogOut />
                <span>Sair da plataforma</span>
              </SidebarMenuButton>
            </form>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}

