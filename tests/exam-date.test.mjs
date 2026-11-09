import { test } from "node:test"
import assert from "node:assert/strict"
import { daysUntilExam, examCountdown, isIsoDate } from "../lib/courses/exam-date.mjs"

const NOW = new Date("2026-11-09T15:00:00Z") // 12h em Brasília

test("dias até a prova usam a data de Brasília", () => {
  assert.equal(daysUntilExam("2027-02-21", NOW), 104)
  assert.equal(daysUntilExam("2026-11-09", NOW), 0)
  assert.equal(daysUntilExam("2026-11-08", NOW), -1)
  // 02h UTC de 10/11 ainda é 09/11 em Brasília
  assert.equal(daysUntilExam("2026-11-10", new Date("2026-11-10T02:00:00Z")), 1)
  assert.equal(daysUntilExam(null, NOW), null)
  assert.equal(daysUntilExam("21/02/2027", NOW), null)
})

test("contador some depois da prova e mostra se a data é prevista", () => {
  assert.deepEqual(examCountdown("2027-02-21", false, NOW), {
    days: 104,
    label: "Faltam 104 dias para a prova",
    date: "21/02/2027",
    status: "prevista",
  })
  assert.equal(examCountdown("2026-11-10", true, NOW).label, "Falta 1 dia para a prova")
  assert.equal(examCountdown("2026-11-09", true, NOW).label, "A prova é hoje")
  assert.equal(examCountdown("2026-11-01", true, NOW), null)
  assert.equal(isIsoDate("2027-02-30x"), false)
})
