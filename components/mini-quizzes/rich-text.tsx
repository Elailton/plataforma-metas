import type React from "react"
import { cn } from "@/lib/utils"

const IMAGE_LINE = /^\[\[imagem:([0-9a-f]{16})\]\]$/

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[\s\S]+?\*\*)/g)
  return parts.flatMap((part, index) => {
    const key = `${keyPrefix}-b${index}`
    if (/^\*\*[\s\S]+\*\*$/.test(part)) return [<strong key={key}>{renderUnderline(part.slice(2, -2), key)}</strong>]
    return renderUnderline(part, key)
  })
}

function renderUnderline(text: string, keyPrefix: string): React.ReactNode[] {
  return text.split(/(__[\s\S]+?__)/g).map((part, index) =>
    /^__[\s\S]+__$/.test(part) ? (
      <u key={`${keyPrefix}-u${index}`} className="decoration-primary/70 underline-offset-2">
        {part.slice(2, -2)}
      </u>
    ) : (
      part
    ),
  )
}

/**
 * Texto das questões com **negrito**, __sublinhado__ e linhas [[imagem:hash]].
 * Nada é interpretado como HTML.
 */
export function RichText({ text, className }: { text: string; className?: string }) {
  const lines = text.split("\n")
  return (
    <span className={cn("block", className)}>
      {lines.map((line, index) => {
        const image = IMAGE_LINE.exec(line.trim())
        if (image) {
          return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={index}
              src={`/api/mini-simulados/imagens/${image[1]}`}
              alt="Imagem da questão"
              loading="lazy"
              className="my-2 block h-auto max-w-full rounded-md border border-border bg-white"
            />
          )
        }
        if (!line.trim()) return <span key={index} className="block h-2" aria-hidden="true" />
        return (
          <span key={index} className="block">
            {renderInline(line, String(index))}
          </span>
        )
      })}
    </span>
  )
}
