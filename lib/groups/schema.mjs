export function validateQuestionnaireSchema(schema) {
  if (!Array.isArray(schema) || (schema.length !== 0 && schema.length !== 20))
    throw new Error(
      "Use um questionário com 20 perguntas ou uma lista vazia para importação externa.",
    )
  return schema.map((q, index) => {
    if (
      !q ||
      q.id !== `q${String(index + 1).padStart(2, "0")}` ||
      typeof q.title !== "string" ||
      !q.title.trim() ||
      q.title.length > 500 ||
      !["single", "multiple", "matrix"].includes(q.type) ||
      !Array.isArray(q.options) ||
      !q.options.length
    )
      throw new Error("Configuração de perguntas inválida.")
    if (
      q.options.some(
        (o) =>
          !o ||
          typeof o.value !== "string" ||
          typeof o.label !== "string" ||
          !o.value ||
          !o.label ||
          o.label.length > 200,
      ) ||
      new Set(q.options.map((o) => o.value)).size !== q.options.length
    )
      throw new Error("Opções inválidas.")
    if (
      q.type === "matrix" &&
      (!Array.isArray(q.rows) ||
        !q.rows.length ||
        q.rows.some(
          (r) =>
            !r || typeof r.value !== "string" || typeof r.label !== "string",
        ) ||
        new Set(q.rows.map((r) => r.value)).size !== q.rows.length)
    )
      throw new Error("Disciplinas inválidas.")
    if (
      index === 0 &&
      (q.type !== "single" ||
        q.options
          .map((o) => o.value)
          .sort()
          .join(",") !==
          [
            "ate_1h",
            "de_1_a_2h",
            "de_2_a_3h",
            "de_3_a_4h",
            "de_4_a_6h",
            "mais_6h",
          ]
            .sort()
            .join(","))
    )
      throw new Error(
        "A pergunta 1 precisa conter as seis faixas de disponibilidade.",
      )
    return {
      id: q.id,
      title: q.title,
      type: q.type,
      options: q.options.map((o) => ({ value: o.value, label: o.label })),
      ...(q.type === "matrix"
        ? { rows: q.rows.map((r) => ({ value: r.value, label: r.label })) }
        : {}),
    }
  })
}
export function questionnaireLabels(schema, answers) {
  const labels = {}
  for (const q of validateQuestionnaireSchema(schema)) {
    const value = answers[q.id],
      option = (v) => {
        const o = q.options.find((o) => o.value === String(v))
        if (!o) throw new Error(`Responda: ${q.title}`)
        return o.label
      }
    if (q.type === "single") labels[q.id] = option(value)
    else if (q.type === "multiple") {
      if (
        !Array.isArray(value) ||
        !value.length ||
        new Set(value).size !== value.length
      )
        throw new Error(`Responda: ${q.title}`)
      labels[q.id] = value.map(option).join("; ")
    } else {
      if (!value || typeof value !== "object" || Array.isArray(value))
        throw new Error(`Responda: ${q.title}`)
      labels[q.id] = q.rows
        .map((r) => `${r.label}: ${option(value[r.value])}`)
        .join("; ")
    }
  }
  return labels
}
