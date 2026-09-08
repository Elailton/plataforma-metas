"use client"

import { BrandSkull } from "@/components/brand-skull"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import { studentNavItems } from "./student-nav-items"
import { signOut } from "@/lib/supabase/actions"
import { CourseSwitcher } from "@/components/student/course-switcher"
import type { StudentCourse } from "@/lib/student/types"

export function SideNav({ courses, currentCourse }: { courses: StudentCourse[]; currentCourse: StudentCourse }) {
  const pathname = usePathname()

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-4 py-6 text-sidebar-foreground md:flex">
      <div className="flex items-center gap-2 px-2 pb-8">
        <div className="flex size-8 items-center justify-center rounded-sm border border-sidebar-primary/80 bg-sidebar-primary/10 text-sidebar-primary">
          <BrandSkull className="size-5" />
        </div>
        <span className="text-sm font-semibold tracking-tight">Mentoria Imparáveis</span>
      </div>

      <div className="mb-5 px-2">
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-sidebar-foreground/50">Curso</p>
        <CourseSwitcher courses={courses} currentCourseId={currentCourse.id} />
      </div>

      <ul className="flex flex-1 flex-col gap-1">
        {studentNavItems.map((item) => {
          const isActive = item.href === "/aluno" ? pathname === "/aluno" : pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                )}
              >
                <Icon className="size-4.5" strokeWidth={isActive ? 2.4 : 2} />
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>

      <form action={signOut}>
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

