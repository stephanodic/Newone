/**
 * migrate-fontblack.mjs
 * Sostituisce font-black con il peso semantico corretto:
 *   - display/numeri grandi → font-bold
 *   - label, badge, pulsanti, titoli sezione → font-semibold
 *
 * Eseguire con:  node scripts/migrate-fontblack.mjs
 */
import { readFile, writeFile } from 'fs/promises';
import { glob } from 'glob';

// Step 1: font-black accoppiato a testo display-size → font-bold
const BOLD_PATTERNS = [
  // Dimensioni "display" — balance, logo, grandi numeri
  ['text-display font-black', 'text-display font-bold'],
  ['font-black text-display', 'font-bold text-display'],
  ['text-6xl font-black',     'text-6xl font-bold'],
  ['text-5xl font-black',     'text-5xl font-bold'],
  ['text-4xl font-black',     'text-4xl font-bold'],
  ['text-3xl font-black',     'text-3xl font-bold'],
  ['text-2xl font-black',     'text-2xl font-bold'],
  ['text-[28px] font-black',  'text-[28px] font-bold'],
  ['text-[18px] font-black',  'text-[18px] font-bold'],
  // Titoli pagina (xl/lg che NON sono button label)
  ['text-xl font-black',      'text-xl font-semibold'],
  ['text-lg font-black',      'text-lg font-semibold'],
];

// Step 2: tutto il resto font-black → font-semibold
const FALLBACK = ['font-black', 'font-semibold'];

const files = await glob('src/**/*.tsx');
let totalFiles = 0;

for (const file of files) {
  let content = await readFile(file, 'utf8');
  let changed = false;

  // Apply specific bold patterns first
  for (const [from, to] of BOLD_PATTERNS) {
    if (content.includes(from)) {
      content = content.split(from).join(to);
      changed = true;
    }
  }

  // Then replace all remaining font-black → font-semibold
  if (content.includes(FALLBACK[0])) {
    content = content.split(FALLBACK[0]).join(FALLBACK[1]);
    changed = true;
  }

  if (changed) {
    await writeFile(file, content);
    console.log(`✓ ${file}`);
    totalFiles++;
  }
}

console.log(`\nDone — ${totalFiles} file aggiornati.`);
