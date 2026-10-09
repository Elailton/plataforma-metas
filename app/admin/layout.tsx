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
        <main className="flex-1 bg-background">
          <div className="mx-auto w-full max-w-6xl px-4 pb-10 pt-5 sm:px-6 md:px-8 md:pb-14 md:pt-8">{children}</div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
