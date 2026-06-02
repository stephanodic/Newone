/**
 * Client-side write rate limiter — token bucket semplice.
 *
 * Max 30 scritture utente per minuto.
 * Ritorna:
 *   'ok'      → procedi normalmente
 *   'warn'    → procedi ma mostra avviso (≥ 25/30 usati)
 *   'blocked' → blocca la scrittura e mostra errore
 *
 * Non si applica a operazioni di sistema come processRecurring.
 */

const WINDOW_MS  = 60_000; // 1 minuto
const MAX_WRITES = 30;
const WARN_AT    = 25;

const log: number[] = [];

function prune(): void {
  const cutoff = Date.now() - WINDOW_MS;
  while (log.length > 0 && log[0] < cutoff) log.shift();
}

export function recordWrite(): 'ok' | 'warn' | 'blocked' {
  prune();
  if (log.length >= MAX_WRITES) return 'blocked';
  log.push(Date.now());
  return log.length >= WARN_AT ? 'warn' : 'ok';
}

export function getRemainingWrites(): number {
  prune();
  return MAX_WRITES - log.length;
}
