import type React from "react"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { AdminTopbar } from "@/components/admin/admin-topbar"
import { getCurrentProfile } from "@/lib/supabase/queries"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile()

  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset>
        <AdminTopbar avatarInitials={profile?.avatarInitials} />
        <main className="flex-1 bg-secondary/30 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
