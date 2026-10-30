
import { BrandLogo } from "@/components/brand-logo"
import Link from "next/link"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { CourseSwitcher } from "@/components/student/course-switcher"
import type { StudentCourse } from "@/lib/student/types"
import { BRAND_NAME } from "@/lib/brand"
import { TurboUpgradePill } from "@/components/student/turbo-upgrade"

export function MobileTopbar({
  courses,
  currentCourse,
  avatarInitials,
}: {
  courses: StudentCourse[]
  currentCourse: StudentCourse
  avatarInitials: string
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur supports-backdrop-filter:bg-background/75 md:hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-2.5">
        <Link href="/aluno" className="flex min-w-0 items-center gap-2.5" aria-label={`${BRAND_NAME} — início`}>
          <BrandLogo className="h-6 w-14 shrink-0" alt="" aria-hidden="true" />
          <span className="truncate text-[13px] font-semibold tracking-tight text-foreground">{BRAND_NAME}</span>
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          <TurboUpgradePill />
          <Link href="/aluno/conta" aria-label="Minha conta" className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Avatar className="size-8">
              <AvatarFallback className="bg-secondary text-xs font-semibold text-secondary-foreground">
                {avatarInitials}
              </AvatarFallback>
            </Avatar>
          </Link>
        </div>
      </div>
      <div className="flex items-center gap-2 border-t border-border/60 px-4 py-2">
        <span className="shrink-0 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Curso</span>
        <div className="min-w-0 flex-1">
          <CourseSwitcher courses={courses} currentCourseId={currentCourse.id} compact />
        </div>
      </div>
    </header>
  )
}
