import type React from "react"
import { BrandLockup } from "@/components/brand-logo"
import { cn } from "@/lib/utils"

/** Moldura das telas públicas e de acesso: marca no topo e conteúdo centralizado. */
export function AuthShell({
  children,
  footer,
  className,
}: {
  children: React.ReactNode
  footer?: React.ReactNode
  className?: string
}) {
  return (
    <div className="flex min-h-dvh w-full flex-col bg-background font-sans">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 h-64 bg-[radial-gradient(60%_100%_at_50%_0%,color-mix(in_oklab,var(--primary)_7%,transparent),transparent)]"
      />
      <main className="relative flex flex-1 items-center justify-center px-4 py-10 sm:px-6 sm:py-16">
        <div className={cn("flex w-full max-w-sm flex-col gap-8", className)}>
          <BrandLockup size="lg" subtitle="Acompanhamento de estudos para concursos" className="justify-center sm:justify-start" />
          {children}
          {footer ? <div className="text-center text-sm text-muted-foreground">{footer}</div> : null}
        </div>
      </main>
    </div>
  )
}

/** Cartão padrão das telas de acesso. */
export function AuthCard({
  icon,
  title,
  description,
  children,
  tone = "default",
}: {
  icon?: React.ReactNode
  title: string
  description?: React.ReactNode
  children?: React.ReactNode
  tone?: "default" | "danger"
}) {
  return (
    <section className="flex flex-col gap-6 rounded-2xl border border-border bg-card p-6 shadow-[0_1px_0_0_rgb(255_255_255/0.03)_inset] sm:p-7">
      <div className="flex flex-col gap-3">
        {icon ? (
          <div
            className={cn(
              "flex size-11 items-center justify-center rounded-xl",
              tone === "danger" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary",
            )}
          >
            {icon}
          </div>
        ) : null}
        <div className="flex flex-col gap-1.5">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
          {description ? <p className="text-sm leading-relaxed text-muted-foreground">{description}</p> : null}
        </div>
      </div>
      {children}
    </section>
  )
}
