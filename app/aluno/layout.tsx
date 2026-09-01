import type React from "react"
import { SideNav } from "@/components/student/side-nav"
import { BottomNav } from "@/components/student/bottom-nav"
import { MobileTopbar } from "@/components/student/mobile-topbar"

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <SideNav />
      <div className="flex min-h-screen flex-1 flex-col">
        <MobileTopbar />
        <main className="flex-1 pb-24 md:pb-10">{children}</main>
        <BottomNav />
      </div>
    </div>
  )
}
