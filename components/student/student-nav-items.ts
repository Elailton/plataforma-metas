import { Home, ListChecks, BookOpen, LineChart, CircleUser, ClipboardCheck, FileText } from "lucide-react"

export const studentNavItems = [
  { href: "/aluno", label: "Início", shortLabel: "Início", icon: Home },
  { href: "/aluno/metas", label: "Minhas Metas", shortLabel: "Metas", icon: ListChecks },
  { href: "/aluno/edital", label: "Edital", shortLabel: "Edital", icon: BookOpen },
  { href: "/aluno/diagnostico-semanal", label: "Diagnóstico Semanal", shortLabel: "Diagnóstico", icon: ClipboardCheck },
  { href: "/aluno/relatorio", label: "Relatório", shortLabel: "Relatório", icon: FileText },
  { href: "/aluno/progresso", label: "Progresso", shortLabel: "Progresso", icon: LineChart },
  { href: "/aluno/conta", label: "Conta", shortLabel: "Conta", icon: CircleUser },
] as const
