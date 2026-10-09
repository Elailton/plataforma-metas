import { questionnaireLabels } from "./schema.mjs";

export function buildQuestionSteps(questionnaires) {
  return questionnaires.flatMap((course) =>
    course.schema.flatMap((question, questionIndex) =>
      question.type === "matrix"
        ? question.rows.map((row, rowIndex) => ({
            enrollmentId: course.enrollmentId,
            courseName: course.courseName,
            question,
            questionIndex,
            questionCount: course.schema.length,
            row,
            rowIndex,
          }))
        : [
            {
              enrollmentId: course.enrollmentId,
              courseName: course.courseName,
              question,
              questionIndex,
              questionCount: course.schema.length,
            },
          ],
    ),
  );
}

export function stepValue(step, answers) {
  const value = answers[step.enrollmentId]?.[step.question.id];
  return step.row && value && typeof value === "object" && !Array.isArray(value)
    ? value[step.row.value]
    : step.row
      ? undefined
      : value;
}

export function isStepAnswered(step, answers) {
  const value = stepValue(step, answers),
    valid = (option) =>
      step.question.options.some((o) => o.value === String(option));
  if (step.question.type === "multiple") {
    return (
      Array.isArray(value) &&
      value.length > 0 &&
      new Set(value).size === value.length &&
      value.every(valid) &&
      !(
        value.length > 1 &&
        value.some((v) => (step.question.exclusive ?? []).includes(v))
      ) &&
      !(step.question.conflicts ?? []).some((pair) =>
        pair.every((v) => value.includes(v)),
      )
    );
  }
  return typeof value === "string" || typeof value === "number"
    ? valid(value)
    : false;
}

export function setStepAnswer(step, answers, value) {
  const previous = answers[step.enrollmentId] ?? {};
  const answer = step.row
    ? {
        ...(previous[step.question.id] &&
        typeof previous[step.question.id] === "object"
          ? previous[step.question.id]
          : {}),
        [step.row.value]: value,
      }
    : value;
  return {
    ...answers,
    [step.enrollmentId]: { ...previous, [step.question.id]: answer },
  };
}

export function toggleMultipleOption(question, value, current = []) {
  const selected = Array.isArray(current) ? current : [];
  if (selected.includes(value)) return selected.filter((v) => v !== value);
  if ((question.exclusive ?? []).includes(value)) return [value];
  const conflicting = (question.conflicts ?? []).flatMap((pair) =>
    pair.includes(value) ? pair.filter((v) => v !== value) : [],
  );
  return [
    ...selected.filter(
      (v) =>
        !(question.exclusive ?? []).includes(v) && !conflicting.includes(v),
    ),
    value,
  ];
}

export function readOnboardingDraft(text, signature) {
  try {
    const draft = JSON.parse(text);
    if (
      draft.version !== 1 ||
      draft.signature !== signature ||
      !draft.answers ||
      typeof draft.answers !== "object" ||
      Array.isArray(draft.answers)
    )
      return null;
    return {
      answers: draft.answers,
      whatsapp:
        typeof draft.whatsapp === "string" ? draft.whatsapp.slice(0, 40) : "",
    };
  } catch {
    return null;
  }
}

export function reviewAnswer(question, value) {
  const label = (v) =>
    question.options.find((o) => o.value === String(v))?.label ??
    "Não respondida";
  if (question.type === "multiple")
    return Array.isArray(value)
      ? value.map(label).join(" · ")
      : "Não respondida";
  return label(value);
}

export function validateOnboardingAnswers(questionnaires, answers) {
  for (const course of questionnaires)
    questionnaireLabels(course.schema, answers[course.enrollmentId] ?? {});
}
