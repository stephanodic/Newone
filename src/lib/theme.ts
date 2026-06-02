export type ThemeKey = 'verde' | 'blu' | 'viola' | 'arancio' | 'rosa' | 'slate';

export const THEMES: Record<ThemeKey, { name: string; primary: string; secondary: string }> = {
  verde:   { name: 'Verde',   primary: '#1D9E75', secondary: '#11cc98' },
  blu:     { name: 'Blu',     primary: '#2563EB', secondary: '#60A5FA' },
  viola:   { name: 'Viola',   primary: '#7C3AED', secondary: '#A78BFA' },
  arancio: { name: 'Arancio', primary: '#EA580C', secondary: '#FB923C' },
  rosa:    { name: 'Rosa',    primary: '#DB2777', secondary: '#F472B6' },
  slate:   { name: 'Slate',   primary: '#334155', secondary: '#64748B' },
};

const STORAGE_KEY = 'appTheme';

export function getStoredTheme(): ThemeKey {
  return (localStorage.getItem(STORAGE_KEY) as ThemeKey) ?? 'verde';
}

export function applyTheme(key: ThemeKey) {
  const t = THEMES[key];
  const root = document.documentElement;
  root.style.setProperty('--theme-primary', t.primary);
  root.style.setProperty('--theme-secondary', t.secondary);
  localStorage.setItem(STORAGE_KEY, key);
}

/** Inline style per l'header gradient — usato da tutti i tab */
export const headerGradient: React.CSSProperties = {
  background: 'linear-gradient(135deg, var(--theme-primary, #1D9E75) 0%, var(--theme-secondary, #11cc98) 100%)',
};
