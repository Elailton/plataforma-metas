import type React from "react"
import { cn } from "@/lib/utils"
import { PageHeader } from "@/components/page-header"

const WIDTHS = {
  default: "max-w-3xl",
  wide: "max-w-5xl",
} as const

/** Área de conteúdo das páginas do aluno, com larguras e respiros padronizados. */
export function PageContainer({
  children,
  className,
  size = "default",
}: {
  children: React.ReactNode
  className?: string
  size?: keyof typeof WIDTHS
}) {
  return (
    <div className={cn("mx-auto w-full px-4 pb-8 pt-5 sm:px-6 md:px-10 md:pb-12 md:pt-10", WIDTHS[size], className)}>
      {children}
    </div>
  )
}

export function PageHeading({
  title,
  description,
  eyebrow,
  actions,
}: {
  title: string
  description?: string
  eyebrow?: string
  actions?: React.ReactNode
}) {
  return <PageHeader title={title} description={description} eyebrow={eyebrow} actions={actions} />
}
