// Janela máxima para espalhar as recargas depois da liberação de uma meta.
export const RELEASE_REFRESH_SPREAD_MS = 90_000
// Folga mínima depois do instante de liberação (relógio do aparelho pode adiantar).
export const RELEASE_REFRESH_MIN_MS = 1_000

/**
 * Quanto esperar (ms) até recarregar a tela de uma meta pendente.
 * `jitter` é um número fixo por aba em [0, 1): cada aluno cai num momento
 * diferente da janela, em vez de todos no mesmo segundo.
 * Se a liberação já passou há mais tempo que a janela, recarrega logo.
 */
export function releaseRefreshDelay(releaseAt, now, jitter) {
  const safeJitter = Number.isFinite(jitter) ? Math.min(Math.max(jitter, 0), 0.999999) : 0
  const target = releaseAt + RELEASE_REFRESH_MIN_MS + Math.floor(safeJitter * RELEASE_REFRESH_SPREAD_MS)
  return Math.max(target - now, 0)
}
