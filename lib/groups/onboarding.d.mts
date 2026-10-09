import type { QuestionnaireQuestion } from "./schema.mjs";
export interface OnboardingQuestionnaire {
  enrollmentId: string;
  courseName: string;
  schema: QuestionnaireQuestion[];
}
export type OnboardingAnswers = Record<string, Record<string, unknown>>;
export interface QuestionStep {
  enrollmentId: string;
  courseName: string;
  question: QuestionnaireQuestion;
  questionIndex: number;
  questionCount: number;
  row?: { value: string; label: string };
  rowIndex?: number;
}
export function buildQuestionSteps(
  questionnaires: OnboardingQuestionnaire[],
): QuestionStep[];
export function stepValue(
  step: QuestionStep,
  answers: OnboardingAnswers,
): unknown;
export function isStepAnswered(
  step: QuestionStep,
  answers: OnboardingAnswers,
): boolean;
export function setStepAnswer(
  step: QuestionStep,
  answers: OnboardingAnswers,
  value: unknown,
): OnboardingAnswers;
export function toggleMultipleOption(
  question: QuestionnaireQuestion,
  value: string,
  current?: unknown,
): string[];
export function readOnboardingDraft(
  text: string | null,
  signature: string,
): { answers: OnboardingAnswers; whatsapp: string } | null;
export function reviewAnswer(
  question: QuestionnaireQuestion,
  value: unknown,
): string;
export function validateOnboardingAnswers(
  questionnaires: OnboardingQuestionnaire[],
  answers: OnboardingAnswers,
): void;
