"use client"
import type { QuestionnaireQuestion } from "@/lib/groups/schema.mjs"
export function QuestionnaireFields({
  schema,
  answers,
  onChange,
}: {
  schema: QuestionnaireQuestion[]
  answers: Record<string, unknown>
  onChange: (next: Record<string, unknown>) => void
}) {
  const update = (key: string, value: unknown) =>
    onChange({ ...answers, [key]: value })
  return (
    <div className="space-y-6">
      {schema.map((q) => (
        <fieldset key={q.id} className="min-w-0 space-y-2">
          <legend className="mb-2 text-sm font-medium">
            {q.id.slice(1)}. {q.title}
          </legend>
          {q.type === "matrix" ? (
            q.rows?.map((row) => (
              <label key={row.value} className="flex flex-col gap-1 text-sm">
                {row.label}
                <select
                  required
                  className="rounded border bg-background p-2"
                  value={String(
                    (answers[q.id] as Record<string, unknown>)?.[row.value] ??
                      "",
                  )}
                  onChange={(e) =>
                    update(q.id, {
                      ...((answers[q.id] as Record<string, unknown>) ?? {}),
                      [row.value]: e.target.value,
                    })
                  }
                >
                  <option value="">Selecione</option>
                  {q.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            ))
          ) : q.type === "single" ? (
            <select
              required
              aria-label={q.title}
              className="w-full rounded border bg-background p-2 text-sm"
              value={String(answers[q.id] ?? "")}
              onChange={(e) => update(q.id, e.target.value)}
            >
              <option value="">Selecione</option>
              {q.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          ) : (
            q.options.map((o) => {
              const selected = Array.isArray(answers[q.id])
                ? (answers[q.id] as string[])
                : []
              return (
                <label
                  key={o.value}
                  className="flex items-center gap-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(o.value)}
                    onChange={(e) =>
                      update(
                        q.id,
                        e.target.checked
                          ? [...selected, o.value]
                          : selected.filter((v) => v !== o.value),
                      )
                    }
                  />
                  {o.label}
                </label>
              )
            })
          )}
        </fieldset>
      ))}
    </div>
  )
}
