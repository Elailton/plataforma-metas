import type { Metadata } from "next"
import { LegalPage } from "@/components/legal/legal-page"
import { TERMS } from "@/lib/legal/content"

export const metadata: Metadata = { title: "Termos de Uso · SGA" }

export default function TermsPage() {
  return <LegalPage document={TERMS} other={{ href: "/privacidade", label: "Aviso de privacidade" }} />
}
