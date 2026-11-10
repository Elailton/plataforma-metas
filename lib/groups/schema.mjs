// Faixas aceitas na pergunta 1 e o grupo de cada uma (o banco usa study_group_from_q01).
const AVAILABILITY_GROUP = {
  ate_1h: 1,
  de_1_a_2h: 1,
  de_2_a_3h: 1,
  de_3_a_4h: 1,
  de_4_a_6h: 2,
  mais_6h: 2,
};
export function validateQuestionnaireSchema(schema) {
  // 20 perguntas (formato antigo), o formulário enxuto (até 8, pedido de 10/11/2026)
  // ou lista vazia para importação externa.
  if (
    !Array.isArray(schema) ||
    (schema.length !== 0 && schema.length !== 20 && schema.length > 8)
  )
    throw new Error(
      "Use um questionário de até 8 perguntas, de 20 perguntas ou uma lista vazia para importação externa.",
    );
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
      throw new Error("Configuração de perguntas inválida.");
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
      throw new Error("Opções inválidas.");
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
      throw new Error("Disciplinas inválidas.");
    if (index === 0) {
      const values = q.options.map((o) => o.value);
      const groups = values.map((v) => AVAILABILITY_GROUP[v]);
      if (
        q.type !== "single" ||
        groups.some((g) => g === undefined) ||
        !groups.includes(1) ||
        !groups.includes(2)
      )
        throw new Error(
          "A pergunta 1 precisa usar as faixas de disponibilidade (até 4h e mais de 4h).",
        );
    }
    const values = q.options.map((o) => o.value);
    if (
      (q.section !== undefined &&
        (typeof q.section !== "string" || q.section.length > 100)) ||
      (q.description !== undefined &&
        (typeof q.description !== "string" || q.description.length > 500)) ||
      q.options.some(
        (o) =>
          o.description !== undefined &&
          (typeof o.description !== "string" || o.description.length > 500),
      ) ||
      (q.unratedValue !== undefined &&
        (q.type !== "matrix" || !values.includes(q.unratedValue))) ||
      (q.exclusive !== undefined &&
        (q.type !== "multiple" ||
          !Array.isArray(q.exclusive) ||
          q.exclusive.some((v) => !values.includes(v)))) ||
      (q.conflicts !== undefined &&
        (q.type !== "multiple" ||
          !Array.isArray(q.conflicts) ||
          q.conflicts.some(
            (pair) =>
              !Array.isArray(pair) ||
              pair.length !== 2 ||
              pair[0] === pair[1] ||
              pair.some((v) => !values.includes(v)),
          )))
    )
      throw new Error("Orientações do questionário inválidas.");
    return {
      ...(q.section ? { section: q.section } : {}),
      ...(q.description ? { description: q.description } : {}),
      ...(q.unratedValue ? { unratedValue: q.unratedValue } : {}),
      ...(q.exclusive ? { exclusive: q.exclusive } : {}),
      ...(q.conflicts ? { conflicts: q.conflicts } : {}),
      id: q.id,
      title: q.title,
      type: q.type,
      options: q.options.map((o) => ({
        value: o.value,
        label: o.label,
        ...(o.description ? { description: o.description } : {}),
      })),
      ...(q.type === "matrix"
        ? { rows: q.rows.map((r) => ({ value: r.value, label: r.label })) }
        : {}),
    };
  });
}
export function questionnaireLabels(schema, answers) {
  const labels = {};
  for (const q of validateQuestionnaireSchema(schema)) {
    const value = answers[q.id],
      option = (v) => {
        const o = q.options.find((o) => o.value === String(v));
        if (!o) throw new Error(`Responda: ${q.title}`);
        return o.label;
      };
    if (q.type === "single") labels[q.id] = option(value);
    else if (q.type === "multiple") {
      if (
        !Array.isArray(value) ||
        !value.length ||
        new Set(value).size !== value.length ||
        (value.length > 1 &&
          value.some((v) => (q.exclusive ?? []).includes(v))) ||
        (q.conflicts ?? []).some((pair) => pair.every((v) => value.includes(v)))
      )
        throw new Error(`Responda: ${q.title}`);
      labels[q.id] = value.map(option).join("; ");
    } else {
      if (!value || typeof value !== "object" || Array.isArray(value))
        throw new Error(`Responda: ${q.title}`);
      labels[q.id] = q.rows
        .map((r) => `${r.label}: ${option(value[r.value])}`)
        .join("; ");
    }
  }
  return labels;
}

// Pergunta 1 padrão (pedido de 10/11/2026). O texto não cita mínimo de horas.
export const AVAILABILITY_STANDARD = {
  title: "Quantas horas líquidas de estudo por dia você tem disponíveis?",
  description:
    "Escolha o tempo que você consegue manter com constância. Ele ajusta o volume das suas metas.",
  options: [
    { value: "de_1_a_2h", label: "2 horas" },
    { value: "de_2_a_3h", label: "3 horas" },
    { value: "de_3_a_4h", label: "4 horas" },
    { value: "de_4_a_6h", label: "Mais de 4 horas" },
  ],
}
// Pergunta de redação usada no formulário enxuto de todos os cursos.
export const ESSAY_QUESTION = {
  type: "single",
  title: "Como está sua preparação para redação ou discursiva?",
  options: [
    { value: "opcao_1", label: "Ainda não comecei" },
    { value: "opcao_2", label: "Já estudei a teoria, mas não pratiquei" },
    { value: "opcao_3", label: "Pratico sem receber correção" },
    { value: "opcao_4", label: "Pratico e recebo correção" },
    { value: "opcao_5", label: "Tenho dificuldade para estruturar o texto" },
  ],
}
const ROUTINE_TITLE = "Qual condição mais limita sua regularidade nos estudos?"
const TAF_TITLE = "Qual é sua situação atual em relação ao TAF?"
const ACCESS_TITLE = "Como está seu acesso aos recursos de estudo?"
/**
 * Formulário enxuto (pedido de 10/11/2026): horas, rotina, redação, TAF (se o curso tiver) e acessos.
 * Domínio e nível saem do formulário: quem mede é o Diagnóstico Semanal.
 * Recebe o questionário de 20 perguntas do curso e devolve o enxuto, renumerado (q01...).
 * Um questionário que já é enxuto volta igual.
 */
export function compactQuestionnaire(schema) {
  const valid = validateQuestionnaireSchema(schema)
  if (valid.length !== 20) return valid
  const find = (title) => valid.find((q) => q.title.startsWith(title))
  const essay =
    valid.find((q) => q.title === ESSAY_QUESTION.title) ?? ESSAY_QUESTION
  const picked = [
    {
      ...valid[0],
      title: AVAILABILITY_STANDARD.title,
      description: AVAILABILITY_STANDARD.description,
      options: AVAILABILITY_STANDARD.options.map((o) => ({ ...o })),
    },
    find(ROUTINE_TITLE),
    essay,
    find(TAF_TITLE),
    find(ACCESS_TITLE),
  ].filter(Boolean)
  return validateQuestionnaireSchema(
    picked.map((q, i) => ({
      ...q,
      options: q.options.map((o) => ({ ...o })),
      id: `q${String(i + 1).padStart(2, "0")}`,
    })),
  )
}
