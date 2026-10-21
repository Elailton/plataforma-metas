import { BookOpenCheck } from "lucide-react"

/** Orientações do Diagnóstico Semanal, mostradas antes de iniciar e depois de concluir. */
export function DiagnosticGuidelines({ questionCount, weekly }: { questionCount: number; weekly: boolean }) {
  const items = [
    `São ${questionCount} questões de concursos anteriores sobre o que você estudou nas metas da semana.`,
    "O cronômetro começa quando você clica em Iniciar e só para quando você envia as respostas.",
    weekly
      ? "É uma tentativa única: depois de enviar, não dá para refazer. Confira tudo antes de enviar."
      : "Depois de enviar, você poderá refazer após 7 dias.",
    "Durante a prova não é possível copiar o texto das questões. Responda sem pesquisar, como no dia da prova.",
    "Questões em branco contam como erro.",
    "Depois do envio você vê a correção comentada, e os seus erros vão para o Relatório, organizados por disciplina e assunto.",
  ]
  return (
    <section aria-labelledby="orientacoes" className="rounded-xl border border-border bg-card p-4 md:p-5">
      <h2 id="orientacoes" className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
        <BookOpenCheck className="size-4 text-primary" aria-hidden="true" />
        Orientações
      </h2>
      <ol className="flex flex-col gap-2 text-sm leading-relaxed text-muted-foreground">
        {items.map((item, index) => (
          <li key={item} className="flex gap-2.5">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-foreground tabular-nums">
              {index + 1}
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}
