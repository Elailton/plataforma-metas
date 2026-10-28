import Link from "next/link"

/** Links discretos para as páginas legais (login, rodapés). */
export function LegalLinks({ className }: { className?: string }) {
  return (
    <p className={className}>
      <Link href="/privacidade" className="underline-offset-4 hover:text-foreground hover:underline">Privacidade</Link>
      {" · "}
      <Link href="/termos" className="underline-offset-4 hover:text-foreground hover:underline">Termos de uso</Link>
    </p>
  )
}
