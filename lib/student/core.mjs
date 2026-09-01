export function calculatePercentage(completed, total) {
  if (total <= 0) return 0
  return Math.round((completed / total) * 100)
}

export function getGoalProgressStatus(completed, total) {
  if (completed === 0 || total === 0) return "pending"
  if (completed >= total) return "completed"
  return "in_progress"
}

export function collectStudiedTopicIds(items) {
  return new Set(
    items
      .filter((item) => item.completed && item.topicId)
      .map((item) => item.topicId),
  )
}

