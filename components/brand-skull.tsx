import type { SVGProps } from "react"

export function BrandSkull(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 36" fill="none" aria-hidden="true" {...props}>
      <path
        d="M16 2.5C8.6 2.5 4 7 4 13.5v7.2l4.5 3.2v6.6h4.2v-5.8h2.1v8.8h2.4v-8.8h2.1v5.8h4.2v-6.6l4.5-3.2v-7.2C28 7 23.4 2.5 16 2.5Z"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <path d="m7.2 13.2 7 2.2-2.6 4.2-4.4-1.8v-4.6Zm17.6 0-7 2.2 2.6 4.2 4.4-1.8v-4.6ZM16 17.8l-2 4h4l-2-4Z" fill="currentColor" />
      <path d="M9 24.5h14M12.7 28.5h6.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

