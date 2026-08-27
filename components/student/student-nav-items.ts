import { Home, ListChecks, BookOpen, LineChart, CircleUser } from "lucide-react"

export const studentNavItems = [
  { href: "/aluno", label: "Início", icon: Home },
  { href: "/aluno/metas", label: "Minhas Metas", icon: ListChecks },
  { href: "/aluno/edital", label: "Edital", icon: BookOpen },
  { href: "/aluno/progresso", label: "Progresso", icon: LineChart },
  { href: "/aluno/conta", label: "Conta", icon: CircleUser },
] as const
