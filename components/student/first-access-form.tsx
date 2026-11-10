"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { LegalLinks } from "@/components/legal/legal-links";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CalendarClock,
  Check,
  ChevronLeft,
  ClipboardCheck,
  FileText,
  Flag,
  LockKeyhole,
  Repeat,
} from "lucide-react";
import { submitFirstAccessQuestionnaire } from "@/lib/groups/student-actions";
import { createClient } from "@/lib/supabase/client";
import { SUPPORT_PHONE_LABEL, SUPPORT_WHATSAPP_URL } from "@/lib/support";
import { passwordErrorMessage } from "@/lib/auth/password-error.mjs";
import { WEAK_PASSWORD_HINT, weakPasswordReason } from "@/lib/auth/password-strength.mjs";
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
  preview = false,
}: {
  questionnaires: OnboardingQuestionnaire[];
  userId: string;
  email: string;
  /** Prévia do administrador: percorre as telas sem gravar nada. */
  preview?: boolean;
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
    "intro" | "welcome" | "question" | "review" | "password"
  >("intro");
  const [index, setIndex] = useState(0);
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
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
    if (!confirming) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setConfirming(false);
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [confirming]);
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
    if (preview) {
      setError("Prévia do administrador: nada foi gravado. O aluno seguiria para a área de estudos.");
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
      if (updateError) throw new Error(passwordErrorMessage(updateError));
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
    <main className={styles.page} data-wide={screen === "intro"}>
      <header className={styles.header}>
        <BrandLogo className={styles.logo} alt="" aria-hidden="true" />
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
      {preview && (
        <p className={styles.note} role="status">
          Prévia do administrador: é a tela que o aluno vê no primeiro acesso. Nada é gravado.
        </p>
      )}
      <section className={styles.card}>
        <div className={styles.stages}>
          <span
            data-active={
              screen === "intro" || screen === "welcome" || screen === "question"
            }
          >
            01 · Seu perfil
          </span>
          <span data-active={screen === "review"}>02 · Revisão</span>
          <span data-active={screen === "password"}>03 · Seu acesso</span>
        </div>
        <div className={styles.content} key={`${screen}-${index}`}>
          {screen === "intro" && (
            <>
              <div className={styles.hero}>
              <div>
              <p className={styles.eyebrow}>BEM-VINDO AO SGA</p>
              <h1 ref={title} tabIndex={-1}>
                O edital inteiro em 90 dias.
              </h1>
              <p className={styles.description}>
                O Sistema Guiado da Aprovação transforma o edital em metas
                diárias: você sabe o que estudar, em que ordem e por quanto
                tempo. Aulas, questões e revisão já vêm organizadas. Basta
                reservar no mínimo 2 horas por dia.
              </p>
              </div>
              <div className={styles.mockup}>
                <Image
                  src="/apresentacao/sga-mockup.webp"
                  alt="A área do aluno do SGA no computador e no celular, com a correção comentada do Diagnóstico Semanal"
                  width={1536}
                  height={1024}
                  sizes="(max-width: 900px) 100vw, 560px"
                  priority
                />
              </div>
              </div>
              <ol className={styles.timeline} aria-label="Como funciona">
                <li>
                  <strong>Metas 01 a 90</strong>
                  <span>Todo o edital, meta a meta</span>
                </li>
                <li>
                  <strong>45 dias antes da prova</strong>
                  <span>Abre a Reta final</span>
                </li>
                <li>
                  <strong>Dia da prova</strong>
                  <span>Conteúdo visto e revisado</span>
                </li>
              </ol>
              <h2 className={styles.subtitle}>O que você encontra na plataforma</h2>
              <ul className={styles.highlights}>
                <li>
                  <ClipboardCheck size={20} />
                  <div>
                    <strong>Metas diárias</strong>
                    <span>Aula, questões do assunto e lei seca em cada meta, com o tempo previsto.</span>
                  </div>
                </li>
                <li>
                  <Repeat size={20} />
                  <div>
                    <strong>Revisão espaçada e questões automáticas</strong>
                    <span>Os assuntos voltam no momento certo, com cadernos de questões prontos e caderno de erros.</span>
                  </div>
                </li>
                <li>
                  <CalendarClock size={20} />
                  <div>
                    <strong>Diagnóstico Semanal</strong>
                    <span>A cada 7 metas, com cronômetro, correção comentada e ranking.</span>
                  </div>
                </li>
                <li>
                  <FileText size={20} />
                  <div>
                    <strong>Até 6 Simulados Gerais</strong>
                    <span>No formato da prova, com todas as disciplinas.</span>
                  </div>
                </li>
                <li>
                  <Flag size={20} />
                  <div>
                    <strong>Reta final</strong>
                    <span>Metas especiais liberadas 45 dias antes da prova.</span>
                  </div>
                </li>
                <li>
                  <BarChart3 size={20} />
                  <div>
                    <strong>Relatório e progresso</strong>
                    <span>Seu desempenho por disciplina e assunto e o quanto do edital você já estudou.</span>
                  </div>
                </li>
              </ul>
              <div className={styles.actions}>
                <button
                  className={styles.primary}
                  onClick={() => setScreen("welcome")}
                >
                  Começar
                  <ArrowRight size={18} />
                </button>
              </div>
            </>
          )}
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
                  <LockedAnswersNotice title="Atenção: depois de concluído, o questionário não pode ser editado">
                    Suas respostas personalizam o seu relatório de desempenho.
                    Responda com calma e confira tudo na revisão antes de
                    concluir.
                  </LockedAnswersNotice>
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
                    Sua disponibilidade diária define o ritmo das suas metas. As
                    demais respostas personalizam o seu relatório.
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
                Ajuste o que for preciso agora: esta é a última etapa para
                mudar suas respostas.
              </p>
              <LockedAnswersNotice title="Depois de confirmar, suas respostas não poderão ser editadas">
                Elas personalizam o seu relatório e o ritmo das suas metas. Se precisar
                alterar alguma resposta, fale com o suporte no WhatsApp{" "}
                <a href={SUPPORT_WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                  {SUPPORT_PHONE_LABEL}
                </a>
                : suas metas serão reiniciadas.
              </LockedAnswersNotice>
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
                  } else setConfirming(true);
                }}
              >
                Confirmar respostas
                <ArrowRight size={18} />
              </button>
              {confirming && (
                <div
                  className={styles.overlay}
                  onClick={(event) => {
                    if (event.target === event.currentTarget) setConfirming(false);
                  }}
                >
                  <div
                    className={styles.dialog}
                    role="alertdialog"
                    aria-modal="true"
                    aria-labelledby="confirm-answers-title"
                    aria-describedby="confirm-answers-text"
                  >
                    <AlertTriangle size={22} className={styles.dialogIcon} aria-hidden="true" />
                    <h2 id="confirm-answers-title">Confirmar suas respostas?</h2>
                    <p id="confirm-answers-text">
                      Depois de confirmar, <strong>não será possível alterar
                      o questionário</strong>, porque suas respostas personalizam
                      o seu relatório e o ritmo das suas metas.
                    </p>
                    <p>
                      Se precisar alterar alguma resposta, fale com o suporte
                      no WhatsApp {SUPPORT_PHONE_LABEL}:{" "}
                      <strong>suas metas serão reiniciadas</strong> e o plano
                      recomeça do início.
                    </p>
                    <div className={styles.actions}>
                      <button
                        type="button"
                        className={styles.secondary}
                        autoFocus
                        onClick={() => setConfirming(false)}
                      >
                        <ChevronLeft size={18} />
                        Revisar
                      </button>
                      <button
                        type="button"
                        className={styles.primary}
                        onClick={() => {
                          setConfirming(false);
                          setScreen("password");
                        }}
                      >
                        Confirmar
                        <ArrowRight size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
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
                {weakPasswordReason(password) ? (
                  <p role="status" className={styles.warning}>
                    {WEAK_PASSWORD_HINT}
                  </p>
                ) : null}
                <p className={styles.note}>
                  Use pelo menos 8 caracteres. Para mais segurança, misture
                  letras, números e símbolos. Sua senha não é guardada no
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
        <LegalLinks />
      </footer>
    </main>
  );
}

function LockedAnswersNotice({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.locked} role="note">
      <LockKeyhole size={18} aria-hidden="true" />
      <div>
        <strong>{title}</strong>
        <p>{children}</p>
      </div>
    </div>
  );
}
