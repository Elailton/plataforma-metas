import { Home, ListChecks, BookOpen, LineChart, CircleUser, ClipboardCheck } from "lucide-react"

/** Rotas reunidas na aba "Simulados" (diagnóstico semanal e relatório). */
export const SIMULADOS_HREF = "/aluno/simulados"

export const studentNavItems = [
  { href: "/aluno", label: "Início", shortLabel: "Início", icon: Home, matches: [] as string[] },
  { href: "/aluno/metas", label: "Minhas Metas", shortLabel: "Metas", icon: ListChecks, matches: [] as string[] },
  { href: "/aluno/edital", label: "Edital", shortLabel: "Edital", icon: BookOpen, matches: [] as string[] },
  {
    href: SIMULADOS_HREF,
    label: "Simulados",
    shortLabel: "Simulados",
    icon: ClipboardCheck,
    matches: ["/aluno/diagnostico-semanal", "/aluno/simulado-geral", "/aluno/relatorio"],
  },
  { href: "/aluno/progresso", label: "Progresso", shortLabel: "Progresso", icon: LineChart, matches: [] as string[] },
  { href: "/aluno/conta", label: "Conta", shortLabel: "Conta", icon: CircleUser, matches: [] as string[] },
] as const

/** Aba ativa: a própria rota ou uma das rotas que ela reúne. */
export function isNavItemActive(item: { href: string; matches: readonly string[] }, pathname: string) {
  if (item.href === "/aluno") return pathname === "/aluno"
  return [item.href, ...item.matches].some((href) => pathname === href || pathname.startsWith(`${href}/`))
}
