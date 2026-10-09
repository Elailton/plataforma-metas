export interface QuestionnaireQuestion {
  id: string;
  title: string;
  type: "single" | "multiple" | "matrix";
  section?: string;
  description?: string;
  unratedValue?: string;
  exclusive?: string[];
  conflicts?: [string, string][];
  options: { value: string; label: string; description?: string }[];
  rows?: { value: string; label: string }[];
}
export function validateQuestionnaireSchema(
  schema: unknown,
): QuestionnaireQuestion[];
export function questionnaireLabels(
  schema: unknown,
  answers: Record<string, unknown>,
): Record<string, string>;
