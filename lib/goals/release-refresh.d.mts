export const RELEASE_REFRESH_SPREAD_MS: number
export const RELEASE_REFRESH_MIN_MS: number
export function releaseRefreshDelay(releaseAt: number, now: number, jitter: number): number
