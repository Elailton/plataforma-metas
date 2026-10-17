import { InstallAppProvider } from "@/components/student/install-app"
import type React from "react"
import { redirect } from "next/navigation"
import { SideNav } from "@/components/student/side-nav"
import { BottomNav } from "@/components/student/bottom-nav"
import { MobileTopbar } from "@/components/student/mobile-topbar"
import { getStudentContext } from "@/lib/student/queries"

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const context = await getStudentContext()
  if (!context) redirect("/auth/sem-acesso")
  if (
    context.profile.enrollments.some(
      (enrollment) =>
        enrollment.status === "active" &&
        enrollment.course?.status === "published" &&
        enrollment.course.groups_enabled &&
        enrollment.course.questionnaire_schema?.length > 0 &&
        !enrollment.questionnaire,
    )
  )
    redirect("/auth/primeiro-acesso")

  return (
    <InstallAppProvider>
      <div className="flex min-h-screen bg-background">
        <SideNav courses={context.courses} currentCourse={context.currentCourse} />
        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <MobileTopbar
            courses={context.courses}
            currentCourse={context.currentCourse}
            avatarInitials={context.profile.avatarInitials}
          />
          <main className="flex-1 pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0">{children}</main>
          <BottomNav />
        </div>
      </div>
    </InstallAppProvider>
  )
}
