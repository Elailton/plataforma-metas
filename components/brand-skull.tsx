import type { SVGProps } from "react"

/**
 * Marca da plataforma: caveira sólida de dentes serrilhados, no espírito do
 * símbolo do Justiceiro. Um único path preenchido (fill-rule evenodd) — sem
 * stroke — para permanecer nítido em qualquer tamanho e cor (currentColor).
 */
export function BrandSkull(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" {...props}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        fill="currentColor"
        d="M6 15C6 7 10.5 2 16 2C21.5 2 26 7 26 15L6 15Z
           M6 15L7.7 21L9.3 15L11 21L12.7 15L14.3 21L16 15L17.7 21L19.3 15L21 21L22.7 15L24.3 21L26 15Z
           M12 7.3L14.7 10L12 12.7L9.3 10Z
           M20 7.3L22.7 10L20 12.7L17.3 10Z
           M14.5 13L17.5 13L16 17.5Z"
      />
    </svg>
  )
}
