import Link from "next/link"
import { BrandLockup } from "@/components/brand-logo"
import type { LegalDocument } from "@/lib/legal/content"

/** Página pública de texto legal (sem login). */
export function LegalPage({ document, other }: { document: LegalDocument; other: { href: string; label: string } }) {
  return (
    <div className="min-h-dvh bg-background font-sans">
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-10 sm:px-6 sm:py-16">
        <BrandLockup size="lg" subtitle="Acompanhamento de estudos para concursos" />
        <article className="flex flex-col gap-6">
          <header className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{document.title}</h1>
            <p className="text-sm text-muted-foreground">Última atualização: {document.updatedAt}</p>
            <p className="text-sm leading-relaxed text-foreground">{document.intro}</p>
          </header>
          {document.sections.map((section) => (
            <section key={section.title} className="flex flex-col gap-3">
              <h2 className="text-base font-semibold text-foreground">{section.title}</h2>
              {section.blocks.map((block, index) => {
                if (block.type === "p") {
                  return <p key={index} className="text-sm leading-relaxed text-muted-foreground">{block.text}</p>
                }
                if (block.type === "ul") {
                  return (
                    <ul key={index} className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground">
                      {block.items.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                  )
                }
                return (
                  <div key={index} className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-secondary/50 text-foreground">
                        <tr>{block.head.map((cell) => <th key={cell} className="px-3 py-2 font-medium">{cell}</th>)}</tr>
                      </thead>
                      <tbody className="divide-y divide-border text-muted-foreground">
                        {block.rows.map((row) => (
                          <tr key={row[0]}>{row.map((cell, cellIndex) => <td key={cellIndex} className="px-3 py-2 align-top">{cell}</td>)}</tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              })}
            </section>
          ))}
        </article>
        <footer className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-4 text-sm text-muted-foreground">
          <Link href={other.href} className="underline-offset-4 hover:text-foreground hover:underline">{other.label}</Link>
          <Link href="/auth/login" className="underline-offset-4 hover:text-foreground hover:underline">Voltar ao login</Link>
        </footer>
      </main>
    </div>
  )
}
