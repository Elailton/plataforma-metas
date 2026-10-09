export const groupLabels = {
  1: "Grupo 1 — até 4h por dia",
  2: "Grupo 2 — mais de 4h por dia",
}
const availability = {
  ate_1h: [1, "Até 1 hora"],
  de_1_a_2h: [1, "Mais de 1 até 2 horas"],
  de_2_a_3h: [1, "Mais de 2 até 3 horas"],
  de_3_a_4h: [1, "Mais de 3 até 4 horas"],
  de_4_a_6h: [2, "Mais de 4 até 6 horas"],
  mais_6h: [2, "Mais de 6 horas"],
}
export function groupFromAvailability(value) {
  const code = typeof value === "string" ? value.trim() : ""
  if (Object.hasOwn(availability, code)) return availability[code][0]
  const entry = Object.values(availability).find(
    ([, label]) =>
      label.toLocaleLowerCase("pt-BR") === code.toLocaleLowerCase("pt-BR"),
  )
  if (!entry)
    throw new Error(
      "A pergunta 1 deve informar uma faixa válida de disponibilidade diária.",
    )
  return entry[0]
}
export function normalizeSubmission(input) {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new Error("Envie um objeto JSON por resposta.")
  const email = String(input.email ?? "")
    .trim()
    .toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new Error("E-mail inválido.")
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      input.id_envio ?? "",
    )
  )
    throw new Error("Identificador de envio inválido.")
  let answers = input.respostas
  if (typeof answers === "string") {
    try {
      answers = JSON.parse(answers)
    } catch {
      throw new Error("O campo respostas não é um JSON válido.")
    }
  }
  if (!answers || typeof answers !== "object" || Array.isArray(answers))
    throw new Error("Respostas inválidas.")
  const labels = {},
    cleanAnswers = {}
  for (let n = 1; n <= 20; n++) {
    const key = `q${String(n).padStart(2, "0")}`,
      label = input[key]
    if (
      typeof label !== "string" ||
      !label.trim() ||
      label.length > 4000 ||
      !Object.hasOwn(answers, key)
    )
      throw new Error(`Resposta ${key} ausente ou inválida.`)
    labels[key] = label.trim()
    cleanAnswers[key] = answers[key]
  }
  const group = groupFromAvailability(cleanAnswers.q01)
  if (groupFromAvailability(labels.q01) !== group)
    throw new Error(
      "A resposta textual da pergunta 1 diverge do valor estruturado.",
    )
  const payload = {
    version: String(input.versao ?? "").slice(0, 100),
    name: String(input.aluno ?? "")
      .trim()
      .slice(0, 200),
    whatsapp: String(input.whatsapp ?? "").slice(0, 40),
    answers: cleanAnswers,
    labels,
  }
  if (JSON.stringify(payload).length > 30000)
    throw new Error("Resposta muito grande.")
  return { email, submissionId: input.id_envio, group, payload }
}
export function studySummary(payload) {
  return ["q01", "q02", "q10", "q11", "q20"]
    .map((key) => payload?.labels?.[key])
    .filter((value) => typeof value === "string" && value.trim())
}
