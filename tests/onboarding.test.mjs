import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildQuestionSteps,
  isStepAnswered,
  setStepAnswer,
  toggleMultipleOption,
  readOnboardingDraft,
} from "../lib/groups/onboarding.mjs";
const matrix = {
  id: "q09",
  type: "matrix",
  title: "Conhecimento",
  rows: [
    { value: "a", label: "A" },
    { value: "b", label: "B" },
  ],
  options: [{ value: "1", label: "Básico" }],
};
test("respostas por disciplina e matrícula permanecem isoladas ao voltar e editar", () => {
  const steps = buildQuestionSteps([
    { enrollmentId: "one", courseName: "A", schema: [matrix] },
    { enrollmentId: "two", courseName: "B", schema: [matrix] },
  ]);
  let answers = setStepAnswer(steps[0], {}, "1");
  assert.equal(isStepAnswered(steps[0], answers), true);
  assert.equal(isStepAnswered(steps[1], answers), false);
  assert.equal(isStepAnswered(steps[2], answers), false);
  answers = setStepAnswer(steps[1], answers, "1");
  assert.deepEqual(answers.one.q09, { a: "1", b: "1" });
});
test("seleções exclusivas e conflitantes não geram combinações inválidas", () => {
  const question = { exclusive: ["none"], conflicts: [["yes", "no"]] };
  assert.deepEqual(toggleMultipleOption(question, "none", ["yes"]), ["none"]);
  assert.deepEqual(toggleMultipleOption(question, "yes", ["none"]), ["yes"]);
  assert.deepEqual(toggleMultipleOption(question, "no", ["yes"]), ["no"]);
});
test("rascunho exige mesma configuração e nunca restaura senha", () => {
  const text = JSON.stringify({
    version: 1,
    signature: "same",
    answers: { one: { q01: "ate_1h" } },
    whatsapp: "123",
    password: "secret",
  });
  assert.equal(readOnboardingDraft(text, "other"), null);
  assert.equal(readOnboardingDraft("broken", "same"), null);
  assert.deepEqual(readOnboardingDraft(text, "same"), {
    answers: { one: { q01: "ate_1h" } },
    whatsapp: "123",
  });
});

test("WhatsApp brasileiro exige DDD e nove dígitos iniciados em 9", async () => {
  const { formatWhatsapp, isValidWhatsapp } =
    await import("../lib/groups/onboarding.mjs");
  assert.equal(formatWhatsapp("(85) 98660-3491"), "(85)986603491");
  assert.equal(isValidWhatsapp(formatWhatsapp("85986603491")), true);
  for (const value of [
    "",
    "(00)986603491",
    "(85)86603491",
    "(85)886603491",
    "(85)9866034910",
  ])
    assert.equal(isValidWhatsapp(value), false);
});
