import type React from "react"
import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

export interface HomeNotice {
  key: string
  icon: React.ComponentType<{ className?: string }>
  title: string
  text?: string
  href?: string
  highlight?: boolean
}

/** Avisos do Início num só cartão, uma linha por aviso, para a tela não ficar carregada. */
export function HomeNotices({ items, extra }: { items: HomeNotice[]; extra?: React.ReactNode }) {
  if (items.length === 0) return null
  return (
    <section aria-label="Avisos" className="mb-6 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
      {items.map((item) => {
        const Icon = item.icon
        const body = (
          <>
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-lg",
                item.highlight ? "bg-primary text-primary-foreground" : "bg-muted text-primary",
              )}
              aria-hidden="true"
            >
              <Icon className="size-4.5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-foreground">{item.title}</span>
              {item.text ? (
                <span className="block whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{item.text}</span>
              ) : null}
            </span>
            {item.href ? <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" /> : null}
          </>
        )
        return item.href ? (
          <Link
            key={item.key}
            href={item.href}
            className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
          >
            {body}
          </Link>
        ) : (
          <div key={item.key} className="flex items-start gap-3 px-4 py-3">
            {body}
          </div>
        )
      })}
      {extra}
    </section>
  )
}
