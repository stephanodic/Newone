/** Mappa centralizzata da emoji classica → Iconify ID Fluent.
 *  Quando il DB ha "🥛", il rendering lo converte in "fluent-emoji:glass-of-milk". */
export const FLUENT_MAP: Record<string, string> = {
  // ── CIBO ──────────────────────────────
  '🥛': 'fluent-emoji:glass-of-milk',
  '🍞': 'fluent-emoji:bread',
  '🧀': 'fluent-emoji:cheese-wedge',
  '🥚': 'fluent-emoji:egg',
  '🧈': 'fluent-emoji:butter',
  '🥩': 'fluent-emoji:cut-of-meat',
  '🐟': 'fluent-emoji:fish',
  '🍗': 'fluent-emoji:poultry-leg',
  '🍝': 'fluent-emoji:spaghetti',
  '🍚': 'fluent-emoji:cooked-rice',
  '🥫': 'fluent-emoji:canned-food',
  '🍅': 'fluent-emoji:tomato',
  '🫒': 'fluent-emoji:olive',
  '☕': 'fluent-emoji:hot-beverage',
  '🧂': 'fluent-emoji:salt',
  '🍯': 'fluent-emoji:honey-pot',
  '🥦': 'fluent-emoji:broccoli',
  '🥕': 'fluent-emoji:carrot',
  '🥔': 'fluent-emoji:potato',
  '🧅': 'fluent-emoji:onion',
  '🍋': 'fluent-emoji:lemon',
  '🍎': 'fluent-emoji:red-apple',
  '🍌': 'fluent-emoji:banana',
  '🍇': 'fluent-emoji:grapes',
  '🍓': 'fluent-emoji:strawberry',
  '🍕': 'fluent-emoji:pizza',
  '🍔': 'fluent-emoji:hamburger',
  '🍴': 'fluent-emoji:fork-and-knife-with-plate',
  '🍷': 'fluent-emoji:wine-glass',
  '🍺': 'fluent-emoji:beer-mug',

  // ── CASA & PULIZIA ────────────────────
  '🧴': 'fluent-emoji:lotion-bottle',
  '🧻': 'fluent-emoji:roll-of-paper',
  '🧼': 'fluent-emoji:soap',
  '🪥': 'fluent-emoji:toothbrush',
  '🧹': 'fluent-emoji:broom',
  '🏠': 'fluent-emoji:house',
  '🛒': 'fluent-emoji:shopping-cart',

  // ── TRASPORTI ─────────────────────────
  '⛽': 'fluent-emoji:fuel-pump',
  '🚚': 'fluent-emoji:articulated-lorry',
  '🚗': 'fluent-emoji:automobile',
  '🚕': 'fluent-emoji:taxi',
  '🚌': 'fluent-emoji:bus',
  '🚆': 'fluent-emoji:train',
  '✈️': 'fluent-emoji:airplane',

  // ── INTRATTENIMENTO & SVAGO ───────────
  '🍿': 'fluent-emoji:popcorn',
  '🎬': 'fluent-emoji:clapper-board',
  '🎮': 'fluent-emoji:video-game',
  '🎵': 'fluent-emoji:musical-note',
  '⚽': 'fluent-emoji:soccer-ball',

  // ── SALUTE ────────────────────────────
  '💊': 'fluent-emoji:pill',
  '🩺': 'fluent-emoji:stethoscope',
  '🏥': 'fluent-emoji:hospital',

  // ── ABBIGLIAMENTO ─────────────────────
  '👕': 'fluent-emoji:t-shirt',
  '👟': 'fluent-emoji:running-shoe',
  '👜': 'fluent-emoji:handbag',

  // ── ALTRO ─────────────────────────────
  '🐶': 'fluent-emoji:dog-face',
  '🐱': 'fluent-emoji:cat-face',
  '🎁': 'fluent-emoji:wrapped-gift',
  '💡': 'fluent-emoji:light-bulb',
  '📚': 'fluent-emoji:books',

  // ── LAVORO & FINANZA ──────────────────
  '💼': 'fluent-emoji:briefcase',
  '💸': 'fluent-emoji:money-with-wings',
  '💻': 'fluent-emoji:laptop',
  '🏦': 'fluent-emoji:bank',
  '💰': 'fluent-emoji:money-bag',
  '💳': 'fluent-emoji:credit-card',

  // ── EXTRA (per KEYWORD_MAP) ───────────
  '✏️': 'fluent-emoji:pencil',
  '📦': 'fluent-emoji:package',
};

/** Reverse map per uso UI (es. picker categoria) */
export const KEYS_BY_FLUENT = Object.fromEntries(
  Object.entries(FLUENT_MAP).map(([emoji, fluent]) => [fluent, emoji])
);
