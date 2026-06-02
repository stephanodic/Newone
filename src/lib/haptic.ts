/**
 * Centralized haptic feedback utility.
 *
 * Usage:
 *   haptic()           → light tap (8ms) — default, backward-compatible
 *   haptic.light()     → nav tap, generic UI interaction
 *   haptic.medium()    → category select, context menu
 *   haptic.success()   → save confirmed, form submitted  [pulse: 10-5-10]
 *   haptic.warning()   → delete modal opened            [pulse:  8-5-8]
 *   haptic.error()     → voice recognition failed       [pulse: 100-50-100]
 *   haptic.heavy()     → voice recognition succeeded    (200ms)
 */
export function haptic(ms = 8) {
  return navigator.vibrate?.(ms);
}

export namespace haptic {
  export const light   = () => navigator.vibrate?.(8);
  export const medium  = () => navigator.vibrate?.(12);
  // T5-D — pattern riconoscibili
  export const success = () => navigator.vibrate?.([50, 30, 50]);           // 2 brevi: salvataggio
  export const warning = () => navigator.vibrate?.([50, 30, 80, 30, 120]);  // crescente: budget
  export const error   = () => navigator.vibrate?.([30, 20, 30, 20, 30]);   // 3 rapide: errore
  export const heavy   = () => navigator.vibrate?.(150);                     // 1 lunga: elimina
}
