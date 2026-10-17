"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, ChevronLeft, LockKeyhole } from "lucide-react";
import { submitFirstAccessQuestionnaire } from "@/lib/groups/student-actions";
import { createClient } from "@/lib/supabase/client";
import {
  formatWhatsapp,
  isValidWhatsapp,
  buildQuestionSteps,
  isStepAnswered,
  readOnboardingDraft,
  reviewAnswer,
  setStepAnswer,
  stepValue,
  toggleMultipleOption,
  validateOnboardingAnswers,
} from "@/lib/groups/onboarding.mjs";
import type {
  OnboardingAnswers,
  OnboardingQuestionnaire,
} from "@/lib/groups/onboarding.mjs";
import styles from "./first-access-form.module.css";

export function FirstAccessForm({
  questionnaires,
  userId,
  email,
}: {
  questionnaires: OnboardingQuestionnaire[];
  userId: string;
  email: string;
}) {
  const router = useRouter();
  const steps = useMemo(
    () => buildQuestionSteps(questionnaires),
    [questionnaires],
  );
  const signature = JSON.stringify(questionnaires);
  const storageKey = `sg-first-access:${userId}`;
  const [answers, setAnswers] = useState<OnboardingAnswers>({});
  const [whatsapp, setWhatsapp] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [screen, setScreen] = useState<
    "welcome" | "question" | "review" | "password"
  >("welcome");
  const [index, setIndex] = useState(0);
  const [editing, setEditing] = useState(false);
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const title = useRef<HTMLHeadingElement>(null);
  const step = steps[index];
  const completed = steps.filter((s) => isStepAnswered(s, answers)).length;
  useEffect(() => {
    try {
      const saved = readOnboardingDraft(
        sessionStorage.getItem(storageKey) ?? "",
        signature,
      );
      if (saved) {
        setAnswers(saved.answers);
        setWhatsapp(formatWhatsapp(saved.whatsapp));
      }
    } catch {
      /* Storage may be unavailable; the form still works. */
    }
    setLoaded(true);
  }, [storageKey, signature]);
  useEffect(() => {
    if (!loaded) return;
    try {
      sessionStorage.setItem(
        storageKey,
        JSON.stringify({ version: 1, signature, answers, whatsapp }),
      );
    } catch {
      /* Keep in memory. */
    }
  }, [answers, whatsapp, loaded, storageKey, signature]);
  useEffect(() => {
    title.current?.focus();
    setError(null);
  }, [screen, index]);
  function next() {
    if (!isStepAnswered(step, answers)) {
      setError("Selecione uma resposta para continuar.");
      return;
    }
    if (editing || index === steps.length - 1) {
      setEditing(false);
      setScreen("review");
    } else setIndex(index + 1);
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (steps.length && !isValidWhatsapp(whatsapp)) {
      setScreen("welcome");
      setError("Informe seu WhatsApp no formato (00)900000000.");
      return;
    }
    if (password.length < 8) {
      setError("Use uma senha com pelo menos 8 caracteres.");
      return;
    }
    if (password !== repeatPassword) {
      setError("As senhas não coincidem.");
      return;
    }
    setPending(true);
    try {
      validateOnboardingAnswers(questionnaires, answers);
      for (const q of questionnaires)
        await submitFirstAccessQuestionnaire(
          q.enrollmentId,
          answers[q.enrollmentId] ?? {},
          whatsapp,
        );
      const { error: updateError } = await createClient().auth.updateUser({
        password,
      });
      if (updateError)
        throw new Error(
          "Não foi possível definir sua senha. Tente novamente ou solicite um novo convite.",
        );
      try {
        sessionStorage.removeItem(storageKey);
      } catch {
        /* Optional storage. */
      }
      router.replace("/aluno");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível concluir seu acesso. Tente novamente.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <span className={styles.logo}>SG</span>
        <div>
          <strong>Sistema Guiado da Aprovação</strong>
          <small>SEU PRIMEIRO ACESSO</small>
        </div>
        <span className={styles.secure}>
          <LockKeyhole size={15} /> Acesso seguro
        </span>
      </header>
      <div
        className={styles.progress}
        aria-label={`${completed} de ${steps.length} etapas respondidas`}
      >
        <span
          style={{
            width: `${steps.length ? (completed / steps.length) * 100 : screen === "password" ? 100 : 0}%`,
          }}
        />
      </div>
      <section className={styles.card}>
        <div className={styles.stages}>
          <span data-active={screen === "welcome" || screen === "question"}>
            01 · Seu perfil
          </span>
          <span data-active={screen === "review"}>02 · Revisão</span>
          <span data-active={screen === "password"}>03 · Seu acesso</span>
        </div>
        <div className={styles.content} key={`${screen}-${index}`}>
          {screen === "welcome" && (
            <>
              <p className={styles.eyebrow}>UMA PREPARAÇÃO COM A SUA CARA</p>
              <h1 ref={title} tabIndex={-1}>
                Sua aprovação começa com um plano.
              </h1>
              <p className={styles.description}>
                {steps.length
                  ? "Conte como você estuda e como é sua rotina. Vamos usar essas informações para organizar sua preparação."
                  : "Defina sua senha para acessar sua área de estudos."}
              </p>
              <div className={styles.identity}>
                <small>SEU E-MAIL DE ACESSO</small>
                <strong>{email}</strong>
              </div>
              {steps.length > 0 && (
                <>
                  <div className={styles.features}>
                    <span>
                      <Check size={18} /> Uma pergunta por vez
                    </span>
                    <span>
                      <Check size={18} /> Revise antes de concluir
                    </span>
                    <span>
                      <Check size={18} /> No seu ritmo
                    </span>
                  </div>
                  <label className={styles.label}>
                    WhatsApp <small>(obrigatório)</small>
                    <input
                      type="tel"
                      autoComplete="tel"
                      inputMode="numeric"
                      placeholder="(00)900000000"
                      required
                      pattern={"\\([1-9][0-9]\\)9[0-9]{8}"}
                      maxLength={13}
                      value={whatsapp}
                      onChange={(e) => {
                        setWhatsapp(formatWhatsapp(e.target.value));
                        setError(null);
                      }}
                    />
                  </label>
                  <p className={styles.note}>
                    Sua disponibilidade diária define seu grupo inicial. As
                    demais respostas ajudam seu mentor a conhecer você.
                  </p>
                </>
              )}
              {error && (
                <p role="alert" className={styles.error}>
                  {error}
                </p>
              )}
              <button
                className={styles.primary}
                disabled={!loaded}
                onClick={() => {
                  if (steps.length && !isValidWhatsapp(whatsapp)) {
                    setError("Informe seu WhatsApp no formato (00)900000000.");
                    return;
                  }
                  const first = steps.findIndex(
                    (s) => !isStepAnswered(s, answers),
                  );
                  setIndex(Math.max(first, 0));
                  setScreen(
                    steps.length
                      ? first === -1
                        ? "review"
                        : "question"
                      : "password",
                  );
                }}
              >
                {completed ? "Continuar preenchimento" : "Vamos começar"}
                <ArrowRight size={18} />
              </button>
            </>
          )}
          {screen === "question" && step && (
            <>
              <p className={styles.eyebrow}>
                {step.question.section ?? "SEU PERFIL DE ESTUDOS"} · PERGUNTA{" "}
                {step.questionIndex + 1} DE {step.questionCount}
              </p>
              {questionnaires.length > 1 && (
                <p className={styles.note}>{step.courseName}</p>
              )}
              <h1 ref={title} tabIndex={-1}>
                {step.row?.label ?? step.question.title}
              </h1>
              <p className={styles.description}>
                {step.row
                  ? `${step.question.title} · Disciplina ${(step.rowIndex ?? 0) + 1} de ${step.question.rows?.length}`
                  : (step.question.description ??
                    (step.question.type === "multiple"
                      ? "Você pode selecionar mais de uma opção."
                      : "Escolha a opção que melhor representa você."))}
              </p>
              <div
                className={styles.options}
                role="group"
                aria-label={step.question.title}
              >
                {step.question.options.map((option) => {
                  const value = stepValue(step, answers);
                  const multiple = step.question.type === "multiple";
                  const selected = multiple
                    ? Array.isArray(value) && value.includes(option.value)
                    : String(value ?? "") === option.value;
                  return (
                    <label
                      key={option.value}
                      className={styles.option}
                      data-selected={selected}
                    >
                      <input
                        type={multiple ? "checkbox" : "radio"}
                        name={`answer-${index}`}
                        checked={selected}
                        onChange={() => {
                          setAnswers((prev) =>
                            setStepAnswer(
                              step,
                              prev,
                              multiple
                                ? toggleMultipleOption(
                                    step.question,
                                    option.value,
                                    stepValue(step, prev) as string[],
                                  )
                                : option.value,
                            ),
                          );
                          setError(null);
                        }}
                      />
                      <span>
                        <strong>{option.label}</strong>
                        {option.description && (
                          <small>{option.description}</small>
                        )}
                      </span>
                      {selected && <Check size={18} />}
                    </label>
                  );
                })}
              </div>
              {error && (
                <p role="alert" className={styles.error}>
                  {error}
                </p>
              )}
              <div className={styles.actions}>
                <button
                  className={styles.secondary}
                  onClick={() =>
                    editing
                      ? (setEditing(false), setScreen("review"))
                      : index
                        ? setIndex(index - 1)
                        : setScreen("welcome")
                  }
                >
                  <ChevronLeft size={18} />
                  Voltar
                </button>
                <button className={styles.primary} onClick={next}>
                  {editing ? "Salvar resposta" : "Continuar"}
                  <ArrowRight size={18} />
                </button>
              </div>
              <p className={styles.note}>
                {completed} de {steps.length} etapas respondidas. Você pode
                voltar para ajustar suas respostas.
              </p>
            </>
          )}
          {screen === "review" && (
            <>
              <p className={styles.eyebrow}>CONFIRA SEU PERFIL</p>
              <h1 ref={title} tabIndex={-1}>
                Tudo certo com suas respostas?
              </h1>
              <p className={styles.description}>
                Você pode ajustar qualquer resposta antes de definir sua senha.
              </p>
              <div className={styles.review}>
                {steps.map((s, i) => (
                  <div key={`${s.enrollmentId}-${i}`}>
                    <div>
                      <small>{s.row?.label ?? s.question.title}</small>
                      <strong>
                        {reviewAnswer(s.question, stepValue(s, answers))}
                      </strong>
                    </div>
                    <button
                      aria-label={`Editar ${s.row?.label ?? s.question.title}`}
                      onClick={() => {
                        setIndex(i);
                        setEditing(true);
                        setScreen("question");
                      }}
                    >
                      Editar
                    </button>
                  </div>
                ))}
              </div>
              <button
                className={styles.primary}
                onClick={() => {
                  const missing = steps.findIndex(
                    (s) => !isStepAnswered(s, answers),
                  );
                  if (missing >= 0) {
                    setIndex(missing);
                    setScreen("question");
                  } else setScreen("password");
                }}
              >
                Definir minha senha
                <ArrowRight size={18} />
              </button>
            </>
          )}
          {screen === "password" && (
            <>
              <p className={styles.eyebrow}>ÚLTIMO PASSO</p>
              <h1 ref={title} tabIndex={-1}>
                Seu próximo passo está aqui.
              </h1>
              <p className={styles.description}>
                Crie uma senha para entrar com {email} e acessar seu plano de
                estudos.
              </p>
              <form onSubmit={submit} className={styles.form}>
                <label className={styles.label}>
                  Nova senha
                  <input
                    autoComplete="new-password"
                    type={showPassword ? "text" : "password"}
                    minLength={8}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={pending}
                  />
                </label>
                <label className={styles.label}>
                  Repita a senha
                  <input
                    autoComplete="new-password"
                    type={showPassword ? "text" : "password"}
                    minLength={8}
                    required
                    value={repeatPassword}
                    onChange={(e) => setRepeatPassword(e.target.value)}
                    disabled={pending}
                  />
                </label>
                <label className={styles.show}>
                  <input
                    type="checkbox"
                    checked={showPassword}
                    onChange={(e) => setShowPassword(e.target.checked)}
                  />{" "}
                  Mostrar senha
                </label>
                <p className={styles.note}>
                  Use pelo menos 8 caracteres. Sua senha não é guardada no
                  rascunho.
                </p>
                {error && (
                  <p role="alert" className={styles.error}>
                    {error}
                  </p>
                )}
                <div className={styles.actions}>
                  {steps.length > 0 && (
                    <button
                      type="button"
                      disabled={pending}
                      className={styles.secondary}
                      onClick={() => setScreen("review")}
                    >
                      <ChevronLeft size={18} />
                      Revisar
                    </button>
                  )}
                  <button
                    type="submit"
                    className={styles.primary}
                    disabled={pending}
                  >
                    {pending ? "Preparando seu acesso…" : "Concluir e acessar"}
                    <ArrowRight size={18} />
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </section>
      <footer className={styles.footer}>
        Sistema Guiado da Aprovação · Cada etapa conta.
      </footer>
    </main>
  );
}
