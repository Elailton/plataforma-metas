"use client"

import { BrandLockup } from "@/components/brand-logo"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import { studentNavItems } from "./student-nav-items"
import { signOut } from "@/lib/supabase/actions"
import { CourseSwitcher } from "@/components/student/course-switcher"
import { TurboUpgradeCard } from "@/components/student/turbo-upgrade"
import type { StudentCourse } from "@/lib/student/types"

export function SideNav({
  courses,
  currentCourse,
  hiddenHrefs = [],
}: {
  courses: StudentCourse[]
  currentCourse: StudentCourse
  hiddenHrefs?: string[]
}) {
  const pathname = usePathname()

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
      <div className="px-5 pb-6 pt-6">
        <BrandLockup subtitle="Área do aluno" />
      </div>

      <div className="mx-4 mb-6 rounded-xl border border-sidebar-border bg-background/40 p-3">
        <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-sidebar-foreground/50">Curso atual</p>
        <CourseSwitcher courses={courses} currentCourseId={currentCourse.id} />
      </div>

      <nav aria-label="Navegação principal" className="flex-1 px-3">
        <ul className="flex flex-col gap-0.5">
          {studentNavItems.filter((item) => !hiddenHrefs.includes(item.href)).map((item) => {
            const isActive = item.href === "/aluno" ? pathname === "/aluno" : pathname.startsWith(item.href)
            const Icon = item.icon
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-primary"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                  )}
                >
                  <Icon className={cn("size-4.5", isActive && "text-primary")} strokeWidth={isActive ? 2.4 : 2} />
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="px-3 pb-3">
        <TurboUpgradeCard />
      </div>

      <form action={signOut} className="border-t border-sidebar-border p-3">
        <button
          type="submit"
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
        >
          <LogOut className="size-4.5" />
          Sair da plataforma
        </button>
      </form>
    </aside>
  )
}
