import React, { memo } from "react";
import "./CategoryIcon.css";

/** Mappa di migrazione: nomi Lucide vecchi → emoji equivalenti.
 *  Usata per mostrare emoji anche su categorie già salvate in Firestore
 *  con il vecchio nome componente. */
const LUCIDE_TO_EMOJI: Record<string, string> = {
  ShoppingCart:     "🛒",
  UtensilsCrossed:  "🍽️",
  Home:             "🏠",
  Car:              "🚗",
  Zap:              "⚡",
  Heart:            "❤️",
  Dumbbell:         "💪",
  Shirt:            "👕",
  Plane:            "✈️",
  BookOpen:         "📚",
  Gamepad2:         "🎮",
  PawPrint:         "🐾",
  Gift:             "🎁",
  PiggyBank:        "🐷",
  Stethoscope:      "🩺",
  Wrench:           "🔧",
  Monitor:          "🖥️",
  Banknote:         "💵",
  Laptop:           "💻",
  TrendingUp:       "📈",
  Tag:              "🏷️",
  CircleDollarSign: "💲",
  Music:            "🎵",
  Briefcase:        "💼",
  Coffee:           "☕",
  Bike:             "🚲",
  Bus:              "🚌",
  Train:            "🚂",
  Baby:             "👶",
  Flower2:          "🌸",
  ShoppingBag:      "🛍️",
  Building2:        "🏗️",
  Droplets:         "💧",
  Phone:            "📱",
  Wifi:             "📶",
  Sparkles:         "✨",
  Tv:               "📺",
  Brain:            "🧠",
  Landmark:         "🏛️",
  Package:          "📦",
  Wallet:           "👛",
  CreditCard:       "💳",
  Receipt:          "🧾",
  Pizza:            "🍕",
  Fuel:             "⛽",
  Pill:             "💊",
  GraduationCap:    "🎓",
  Camera:           "📷",
  Watch:            "⌚",
  Scissors:         "✂️",
  TreePine:         "🌲",
  Sun:              "☀️",
  Moon:             "🌙",
  Star:             "⭐",
  Trophy:           "🏆",
  Building:         "🏢",
  Factory:          "🏭",
  Store:            "🏪",
  Truck:            "🚚",
  Globe:            "🌍",
  Smartphone:       "📱",
  Headphones:       "🎧",
  Plug:             "🔌",
  Lightbulb:        "💡",
  Flame:            "🔥",
  Snowflake:        "❄️",
  Umbrella:         "☂️",
  Leaf:             "🍃",
  Apple:            "🍎",
  Wine:             "🍷",
  Beer:             "🍺",
  Cake:             "🎂",
  Fish:             "🐟",
  Carrot:           "🥕",
  Beef:             "🥩",
  ChefHat:          "👨‍🍳",
  Utensils:         "🍴",
  ShoppingBasket:   "🧺",
  WashingMachine:   "🫧",
  Tv2:              "📺",
  HandCoins:        "🤲",
  ArrowLeftRight:   "↔️",
  Clock:            "🕐",
  HeartPulse:       "💓",
  HeartHandshake:   "🤝",
  // English/generic names from older app versions
  Grocery:          "🛒",
  Food:             "🍔",
  Restaurant:       "🍽️",
  Transport:        "🚌",
  Health:           "💊",
  Sport:            "⚽",
  Entertainment:    "🎭",
  Travel:           "✈️",
  Education:        "📚",
  Shopping:         "🛍️",
  Bills:            "📄",
  Salary:           "💰",
  Investment:       "📈",
  Housing:          "🏠",
  Insurance:        "🛡️",
  Subscription:     "📱",
  Salad:            "🥗",
  Sandwich:         "🥪",
  Croissant:        "🥐",
  Milk:             "🥛",
  Egg:              "🥚",
  Cheese:           "🧀",
};

export const CategoryIcon = memo(function CategoryIcon({
  name,
  size = 20,
  color = "currentColor",
}: {
  name: string;
  size?: number;
  color?: string;
}) {
  const resolved = LUCIDE_TO_EMOJI[name] ?? name;

  const isEmoji = /\p{Emoji_Presentation}|\p{Extended_Pictographic}/u.test(resolved);
  const isRawText = !isEmoji && resolved.length > 2;

  if (isRawText) {
    const hash = resolved.split('').reduce((h, c) => h + c.charCodeAt(0), 0);
    const hue = hash % 360;
    return (
      <span
        role="img"
        aria-label={resolved}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          backgroundColor: `hsl(${hue}, 60%, 75%)`,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: size * 0.45,
          fontWeight: 900,
          color: 'rgba(0,0,0,0.6)',
          userSelect: 'none',
          flexShrink: 0,
        }}
      >
        {resolved.charAt(0).toUpperCase()}
      </span>
    );
  }

  return (
    <span
      role="img"
      aria-label={resolved}
      className="cat-icon"
      style={{
        fontSize: size * 0.9,
        lineHeight: 1,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        userSelect: "none",
        color,
      }}
    >
      {resolved || "?"}
    </span>
  );
});

export default CategoryIcon;
