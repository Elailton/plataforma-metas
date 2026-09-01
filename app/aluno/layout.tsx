import type React from "react"
import { redirect } from "next/navigation"
import { SideNav } from "@/components/student/side-nav"
import { BottomNav } from "@/components/student/bottom-nav"
import { MobileTopbar } from "@/components/student/mobile-topbar"
import { getStudentContext } from "@/lib/student/queries"

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const context = await getStudentContext()
  if (!context) redirect("/auth/sem-acesso")

  return (
    <div className="flex min-h-screen bg-background">
      <SideNav courses={context.courses} currentCourse={context.currentCourse} />
      <div className="flex min-h-screen flex-1 flex-col">
        <MobileTopbar
          courses={context.courses}
          currentCourse={context.currentCourse}
          avatarInitials={context.profile.avatarInitials}
        />
        <main className="flex-1 pb-24 md:pb-10">{children}</main>
        <BottomNav />
      </div>
    </div>
  )
}
