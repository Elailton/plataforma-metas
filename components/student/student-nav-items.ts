import { Home, ListChecks, BookOpen, LineChart, CircleUser, ClipboardCheck } from "lucide-react"

export const studentNavItems = [
  { href: "/aluno", label: "Início", shortLabel: "Início", icon: Home },
  { href: "/aluno/metas", label: "Minhas Metas", shortLabel: "Metas", icon: ListChecks },
  { href: "/aluno/edital", label: "Edital", shortLabel: "Edital", icon: BookOpen },
  { href: "/aluno/mini-simulados", label: "Mini Simulados", shortLabel: "Simulados", icon: ClipboardCheck },
  { href: "/aluno/progresso", label: "Progresso", shortLabel: "Progresso", icon: LineChart },
  { href: "/aluno/conta", label: "Conta", shortLabel: "Conta", icon: CircleUser },
] as const
