import type React from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Cabeçalho padrão das páginas (aluno e administrador): título, descrição,
 * link de voltar opcional e ações. No celular, as ações descem para baixo do título.
 */
export function PageHeader({
  title,
  description,
  eyebrow,
  backHref,
  backLabel = "Voltar",
  badge,
  actions,
  className,
}: {
  title: React.ReactNode
  description?: React.ReactNode
  eyebrow?: React.ReactNode
  backHref?: string
  backLabel?: string
  badge?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <header className={cn("mb-6 flex flex-col gap-4 md:mb-8 md:flex-row md:items-end md:justify-between", className)}>
      <div className="flex min-w-0 flex-col gap-2">
        {backHref ? (
          <Link
            href={backHref}
            className="-ml-1 inline-flex w-fit items-center gap-1.5 rounded-md px-1 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft className="size-3.5" />
            {backLabel}
          </Link>
        ) : null}
        {eyebrow ? (
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{eyebrow}</span>
        ) : null}
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
          <h1 className="min-w-0 text-balance text-2xl font-semibold tracking-tight text-foreground md:text-[28px] md:leading-9">
            {title}
          </h1>
          {badge}
        </div>
        {description ? (
          <p className="max-w-2xl text-pretty text-sm leading-relaxed text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  )
}

/** Título de seção dentro de uma página, com ação opcional à direita. */
export function SectionHeader({
  title,
  description,
  action,
  className,
}: {
  title: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("mb-3 flex items-end justify-between gap-3", className)}>
      <div className="flex min-w-0 flex-col gap-0.5">
        <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}
