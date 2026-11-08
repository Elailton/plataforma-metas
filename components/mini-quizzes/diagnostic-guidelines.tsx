import { BookOpenCheck } from "lucide-react"

/** Orientações do Diagnóstico Semanal, mostradas antes de iniciar e depois de concluir. */
export function DiagnosticGuidelines({
  questionCount,
  weekly,
  monthly = false,
  timeLimitMinutes = null,
  hasEssay = false,
}: {
  questionCount: number
  weekly: boolean
  monthly?: boolean
  timeLimitMinutes?: number | null
  hasEssay?: boolean
}) {
  const items = [
    monthly
      ? `São ${questionCount} questões de concursos anteriores, de todas as disciplinas do edital, no formato da prova.`
      : `São ${questionCount} questões de concursos anteriores sobre o que você estudou nas metas da semana.`,
    ...(monthly && timeLimitMinutes
      ? [
          `Reserve ${formatMinutes(timeLimitMinutes)} sem interrupções, o tempo da prova real${hasEssay ? " (questões + redação)" : ""}. Faça de uma vez, como no dia da prova.`,
          "O cronômetro é regressivo: começa quando você clica em Iniciar, mostra o tempo que falta e só para quando você envia as respostas.",
        ]
      : ["O cronômetro começa quando você clica em Iniciar e só para quando você envia as respostas."]),
    ...(hasEssay
      ? [
          "A redação é opcional e faz parte do tempo da prova. O tema aparece no fim da prova: escreva na folha e/ou digite no campo da plataforma e envie junto com as respostas (depois do envio, não é possível mandar a redação). A correção sai em até 7 dias, no Relatório.",
        ]
      : []),
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

/** 240 → "4 horas"; 90 → "1h30". */
export function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `${rest} minutos`
  if (rest === 0) return hours === 1 ? "1 hora" : `${hours} horas`
  return `${hours}h${String(rest).padStart(2, "0")}`
}
