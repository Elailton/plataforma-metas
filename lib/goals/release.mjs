export const APPLICATION_TIME_ZONE = "America/Fortaleza"

export function currentDateInApplicationTimeZone(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APPLICATION_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now)
}

export function isGoalReleased(releaseDate, now = new Date()) {
  return !releaseDate || releaseDate <= currentDateInApplicationTimeZone(now)
}

export function releaseInstant(releaseDate) {
  return new Date(`${releaseDate}T00:00:00-03:00`)
}
