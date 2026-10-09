export interface QuestionnaireQuestion {
  id: string
  title: string
  type: "single" | "multiple" | "matrix"
  options: { value: string; label: string }[]
  rows?: { value: string; label: string }[]
}
export function validateQuestionnaireSchema(
  schema: unknown,
): QuestionnaireQuestion[]
export function questionnaireLabels(
  schema: unknown,
  answers: Record<string, unknown>,
): Record<string, string>
