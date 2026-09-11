import assert from "node:assert/strict"
import test from "node:test"
import { readFileSync } from "node:fs"
import { runInNewContext } from "node:vm"
import { createRequire } from "node:module"
import ts from "typescript"

const require = createRequire(import.meta.url)

function load(relativePath, dependencies) {
  const source = readFileSync(new URL("../" + relativePath, import.meta.url), "utf8")
  const code = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText
  const exports = {}
  runInNewContext(code, {
    exports,
    require: (name) => {
      if (name in dependencies) return dependencies[name]
      throw new Error("Unexpected import " + name)
    },
  })
  return exports
}

function createSupabaseWithoutSubtopics() {
  const inserted = []

  return {
    inserted,
    from(table) {
      assert.equal(table, "syllabus_topics")
      return {
        select(_columns, options) {
          return {
            eq(_column, _value) {
              return {
                is(column) {
                  assert.equal(column, "parent_topic_id")
                  return Promise.resolve({
                    count: null,
                    error: {
                      code: "PGRST204",
                      message: "Could not find the 'parent_topic_id' column of 'syllabus_topics' in the schema cache",
                    },
                  })
                },
                then(resolve) {
                  assert.equal(options?.count, "exact")
                  return Promise.resolve(resolve({ count: 2, error: null }))
                },
              }
            },
          }
        },
        insert(rows) {
          inserted.push(...rows)
          return Promise.resolve({ error: null })
        },
      }
    },
  }
}

function createSupabaseWithMissingSubtopicColumn() {
  const inserted = []

  return {
    inserted,
    from(table) {
      assert.equal(table, "syllabus_topics")
      return {
        select(_columns) {
          return {
            eq(column, _value) {
              assert.equal(column, "id")
              return {
                single() {
                  return Promise.resolve({
                    data: null,
                    error: {
                      code: "PGRST204",
                      message: "Could not find the 'parent_topic_id' column of 'syllabus_topics' in the schema cache",
                    },
                  })
                },
              }
            },
          }
        },
        insert(rows) {
          inserted.push(...rows)
          return Promise.resolve({ error: null })
        },
      }
    },
  }
}

function loadEditalAction(supabase, refreshed = []) {
  return load("lib/admin/actions/edital.ts", {
    "next/cache": { revalidatePath: (...args) => refreshed.push(args) },
    "@/lib/admin/auth": { requireAdmin: async () => ({ supabase }) },
    "@/lib/security/safe-error": {
      logSafeServerError: () => {},
      throwSafeDatabaseError: (_context, _error, publicMessage) => {
        throw new Error(publicMessage)
      },
    },
  })
}

test("adicionar tópicos principais aceita lista numerada mesmo antes da migration de subtópicos", async () => {
  const refreshed = []
  const supabase = createSupabaseWithoutSubtopics()
  const { addSyllabusTopicsBulk } = loadEditalAction(supabase, refreshed)

  const result = await addSyllabusTopicsBulk(
    "subject-id",
    "course-id",
    "1 Compreensão e interpretação de textos\n2 Reconhecimento de tipos e gêneros textuais",
  )

  assert.deepEqual(JSON.parse(JSON.stringify(result)), { ok: true })
  assert.deepEqual(JSON.parse(JSON.stringify(supabase.inserted)), [
    { subject_id: "subject-id", title: "Compreensão e interpretação de textos", position: 2 },
    { subject_id: "subject-id", title: "Reconhecimento de tipos e gêneros textuais", position: 3 },
  ])
  assert.deepEqual(refreshed, [["/admin/cursos/course-id"]])
})

test("adicionar subtópicos retorna erro controlado quando migration ainda não existe", async () => {
  const refreshed = []
  const supabase = createSupabaseWithMissingSubtopicColumn()
  const { addSyllabusTopicsBulk } = loadEditalAction(supabase, refreshed)

  const result = await addSyllabusTopicsBulk(
    "subject-id",
    "course-id",
    "1.1 Interpretação textual",
    "topic-id",
  )

  assert.deepEqual(JSON.parse(JSON.stringify(result)), {
    ok: false,
    message: "A estrutura de subtópicos ainda não foi aplicada no banco. Aplique a migration antes de criar subtópicos.",
  })
  assert.deepEqual(supabase.inserted, [])
  assert.deepEqual(refreshed, [])
})
