import { Rocket } from "lucide-react"
import { cn } from "@/lib/utils"

// Oferta "Upgrade Turbo": 12 meses de Qconcursos para quem já tem o curso completo.
// Link externo de vendas, igual para todos os cursos e grupos; nada do aluno vai na URL.
export const TURBO_UPGRADE_URL = "https://ingresso.cursoprofericklima.com.br/upgrade-turbo/"
const TURBO_LABEL = "Upgrade Turbo: acesso ao Qconcursos por 12 meses (abre em nova aba)"

/** Card do menu lateral (computador), acima de "Sair da plataforma". */
export function TurboUpgradeCard({ className }: { className?: string }) {
  return (
    <a
      href={TURBO_UPGRADE_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={TURBO_LABEL}
      className={cn(
        "flex items-center gap-3 rounded-xl bg-orange-500 px-3 py-3 text-white shadow-sm transition-colors hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300",
        className,
      )}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/15">
        <Rocket className="size-5 text-white" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-bold leading-tight">Upgrade TURBO</span>
        <span className="block text-xs leading-snug text-white/85">Qconcursos por 12 meses</span>
      </span>
    </a>
  )
}

/** Botão compacto do topo (celular), sempre visível ao lado do avatar. */
export function TurboUpgradePill({ className }: { className?: string }) {
  return (
    <a
      href={TURBO_UPGRADE_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={TURBO_LABEL}
      className={cn(
        "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-orange-500 px-3 text-xs font-bold tracking-wide text-white shadow-sm transition-colors hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300",
        className,
      )}
    >
      <Rocket className="size-3.5 text-white" aria-hidden="true" />
      TURBO
    </a>
  )
}
