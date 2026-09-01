import assert from "node:assert/strict"
import test from "node:test"
import {
  calculatePercentage,
  collectStudiedTopicIds,
  getGoalProgressStatus,
} from "../lib/student/core.mjs"

test("o progresso da meta usa itens concluídos sobre o total", () => {
  assert.equal(calculatePercentage(3, 4), 75)
  assert.equal(getGoalProgressStatus(0, 4), "pending")
  assert.equal(getGoalProgressStatus(1, 4), "in_progress")
  assert.equal(getGoalProgressStatus(4, 4), "completed")
})

test("um tópico repetido conta apenas uma vez no progresso do edital", () => {
  const studied = collectStudiedTopicIds([
    { topicId: "topic-one", completed: true },
    { topicId: "topic-one", completed: true },
    { topicId: "topic-two", completed: false },
    { topicId: null, completed: true },
  ])

  assert.deepEqual([...studied], ["topic-one"])
})

test("coleções vazias produzem zero e estado pendente", () => {
  assert.equal(calculatePercentage(0, 0), 0)
  assert.equal(getGoalProgressStatus(0, 0), "pending")
})

