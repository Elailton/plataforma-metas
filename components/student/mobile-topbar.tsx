
import { BrandSkull } from "@/components/brand-skull"
import Link from "next/link"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { CourseSwitcher } from "@/components/student/course-switcher"
import type { StudentCourse } from "@/lib/student/types"

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
    <header className="flex items-center justify-between border-b border-border bg-card/95 px-4 py-3 backdrop-blur md:hidden">
      <div className="flex items-center gap-2">
        <div className="flex size-7 items-center justify-center rounded-sm border border-primary/80 bg-primary/10 text-primary">
          <BrandSkull className="size-4.5" />
        </div>
        <CourseSwitcher courses={courses} currentCourseId={currentCourse.id} compact />
      </div>
      <Link href="/aluno/conta" aria-label="Minha conta">
        <Avatar className="size-8">
          <AvatarFallback className="bg-secondary text-secondary-foreground text-xs font-semibold">
            {avatarInitials}
          </AvatarFallback>
        </Avatar>
      </Link>
    </header>
  )
}

