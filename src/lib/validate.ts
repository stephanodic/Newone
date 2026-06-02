/** Limiti condivisi con le Firestore Security Rules (firestore.rules). */
export const LIMITS = {
  AMOUNT_MAX:          999_999,
  NOTE_MAX:            500,
  CATEGORY_NAME_MAX:   50,
  MONTHLY_LIMIT_MAX:   999_999,
} as const;

export function validateAmount(amountStr: string): string | null {
  const val = parseFloat(amountStr.replace(',', '.'));
  if (!val || isNaN(val) || val <= 0) return 'Inserisci un importo valido';
  if (val > LIMITS.AMOUNT_MAX)
    return `Importo massimo: ${LIMITS.AMOUNT_MAX.toLocaleString('it-IT')} €`;
  return null;
}

export function validateNote(note: string): string | null {
  if (note.length > LIMITS.NOTE_MAX)
    return `Troppo lunga (max ${LIMITS.NOTE_MAX} caratteri)`;
  return null;
}

export function validateCategoryName(name: string): string | null {
  if (!name.trim()) return 'Il nome è obbligatorio';
  if (name.trim().length > LIMITS.CATEGORY_NAME_MAX)
    return `Troppo lungo (max ${LIMITS.CATEGORY_NAME_MAX} caratteri)`;
  return null;
}

export function validateMonthlyLimit(limitStr: string): string | null {
  if (!limitStr.trim()) return null; // campo opzionale
  const val = parseFloat(limitStr.replace(',', '.'));
  if (isNaN(val) || val <= 0) return 'Deve essere un numero positivo';
  if (val > LIMITS.MONTHLY_LIMIT_MAX)
    return `Massimo: ${LIMITS.MONTHLY_LIMIT_MAX.toLocaleString('it-IT')} €`;
  return null;
}
