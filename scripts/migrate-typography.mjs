/**
 * migrate-typography.mjs
 * Sostituisce le classi Tailwind con dimensioni pixel raw con i token
 * del design system (text-display, text-title, text-body, text-caption, text-micro).
 *
 * Eseguire con:  node scripts/migrate-typography.mjs
 */
import { readFile, writeFile } from 'fs/promises';
import { glob } from 'glob';

const REPLACEMENTS = [
  // Font-size + font-black compositi (priorità alta — stringa più lunga prima)
  ['text-[7px] font-black',  'text-micro font-semibold'],
  ['text-[8px] font-black',  'text-micro font-semibold'],
  ['text-[9px] font-black',  'text-micro font-semibold'],
  ['text-[10px] font-black', 'text-caption font-semibold'],
  ['text-[10px] font-bold',  'text-caption font-semibold'],
  // Font-size singoli
  ['text-[10px]', 'text-caption'],
  ['text-[11px]', 'text-caption'],
  ['text-[12px]', 'text-caption'],
  ['text-[13px]', 'text-body'],
  ['text-[14px]', 'text-body'],
  ['text-[15px]', 'text-body'],
  ['text-[16px]', 'text-title'],
  ['text-[17px]', 'text-title'],
  ['text-[22px]', 'text-title'],
  ['text-[26px]', 'text-display'],
  ['text-[32px]', 'text-display'],
];

const files = await glob('src/**/*.tsx');
let totalFiles = 0;

for (const file of files) {
  let content = await readFile(file, 'utf8');
  let changed = false;

  for (const [from, to] of REPLACEMENTS) {
    if (content.includes(from)) {
      content = content.split(from).join(to);
      changed = true;
    }
  }

  if (changed) {
    await writeFile(file, content);
    console.log(`✓ ${file}`);
    totalFiles++;
  }
}

console.log(`\nDone — ${totalFiles} file aggiornati.`);
