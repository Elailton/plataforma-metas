import { LayoutDashboard, GraduationCap, Users, FolderKanban } from "lucide-react"

export const adminNavItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/cursos", label: "Cursos", icon: GraduationCap },
  { href: "/admin/materiais", label: "Materiais", icon: FolderKanban },
  { href: "/admin/alunos", label: "Alunos", icon: Users },
] as const
