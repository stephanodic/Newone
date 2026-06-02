import { Category } from "../types";

export const EMOJIS = [
  // Cibo & Drink
  "🛒","🍽️","🍕","🍔","🌮","🍜","🍣","☕","🍷","🍺","🧃","🥐","🍰","🍫",
  // Casa & Utilità
  "🏠","🔧","🔌","💡","🌊","💧","🔥","❄️","🛋️","🛁","🪴",
  // Trasporti
  "🚗","🚌","🚂","✈️","🚲","🛵","⛽","🅿️",
  // Shopping & Stile
  "🛍️","👕","👟","👜","💍","✂️","✨","💄",
  // Salute & Sport
  "💪","🏋️","🧘","🏃","⚽","🎾","💊","🏥","🧠","❤️","🩺",
  // Intrattenimento
  "🎮","📺","🎬","🎵","🎧","📚","🎨","🎭","🏆","⭐",
  // Famiglia & Animali
  "👶","🐾","🐶","🐱","🌸","🎁","🎂",
  // Lavoro & Finance
  "💼","💻","📱","💵","💳","📈","🏦","🏛️","🏷️","📦","🧾",
  // Altro
  "🌍","📡","🔐","🎓","🏗️","📶","🌙","☀️","🎪",
];

export const PASTEL_PALETTE = [
  { name: 'Mint', bg: '#E1F5EE', text: '#0F6E56', border: '#1D9E75' },
  { name: 'Pink', bg: '#FCEBEB', text: '#A32D2D', border: '#E24B4A' },
  { name: 'Lavender', bg: '#EEEDFE', text: '#5B50D6', border: '#7C72FF' },
  { name: 'Amber', bg: '#FAEEDA', text: '#855B14', border: '#B8860B' },
  { name: 'Sky', bg: '#E6F1FB', text: '#2D5A81', border: '#0EA5E9' },
  { name: 'Sage', bg: '#EAF3DE', text: '#4A6B22', border: '#65A30D' },
  { name: 'Coral', bg: '#FFF1F0', text: '#991B1B', border: '#EF4444' },
  { name: 'Purple', bg: '#F5F3FF', text: '#5B21B6', border: '#8B5CF6' },
];


export const COLORS = {
  primary: "#059669",
  income: "#2ECC71",
  expense: "#E74C3C",
  background: "#f8fafc",
  card: "#ffffff",
  textPrimary: "#1e293b",
  textSecondary: "#94a3b8",
  border: "#e2e8f0",
  danger: "#f43f5e",
};

/** Numero massimo di categorie per tipo. Non modificabile dall'utente. */
export const MAX_CATEGORIES_EXPENSE = 30;
export const MAX_CATEGORIES_INCOME  = 20;

export const DEFAULT_CATEGORIES_EXPENSE: Omit<Category, "id" | "userId">[] = [
  { name: "Mangiar fuori",  emoji: "Utensils",       color: "#FF6B35", type: "EXPENSE", monthlyLimit: null, tag: null },
  { name: "Cibo",           emoji: "ShoppingBasket", color: "#FF9F1C", type: "EXPENSE", monthlyLimit: null, tag: null },
  { name: "Casa",           emoji: "Home",           color: "#2EC4B6", type: "EXPENSE", monthlyLimit: null, tag: null },
  { name: "Shopping",       emoji: "ShoppingBag",    color: "#E71D36", type: "EXPENSE", monthlyLimit: null, tag: null },
  { name: "Casalinghi",     emoji: "WashingMachine", color: "#F4A261", type: "EXPENSE", monthlyLimit: null, tag: null },
  { name: "Condominio",     emoji: "Building2",      color: "#8B5CF6", type: "EXPENSE", monthlyLimit: null, tag: null },
  { name: "Sorgenia",       emoji: "Zap",            color: "#F59E0B", type: "EXPENSE", monthlyLimit: null, tag: null },
  { name: "ACEA acqua",     emoji: "Droplets",       color: "#38BDF8", type: "EXPENSE", monthlyLimit: null, tag: null },
  { name: "Telefono",       emoji: "Smartphone",     color: "#6366F1", type: "EXPENSE", monthlyLimit: null, tag: null },
  { name: "Vodafone casa",  emoji: "Wifi",           color: "#EC4899", type: "EXPENSE", monthlyLimit: null, tag: null },
  { name: "Bellezza",       emoji: "Sparkles",       color: "#F472B6", type: "EXPENSE", monthlyLimit: null, tag: null },
  { name: "Disneyplus",     emoji: "Tv2",            color: "#1D4ED8", type: "EXPENSE", monthlyLimit: null, tag: null },
  { name: "Psico",          emoji: "Brain",          color: "#A78BFA", type: "EXPENSE", monthlyLimit: null, tag: null },
  { name: "Sport",          emoji: "Dumbbell",       color: "#10B981", type: "EXPENSE", monthlyLimit: null, tag: null },
  { name: "Mutuo",          emoji: "Landmark",       color: "#78716C", type: "EXPENSE", monthlyLimit: null, tag: null },
  { name: "Auto",           emoji: "Car",            color: "#64748B", type: "EXPENSE", monthlyLimit: null, tag: null },
  { name: "Viaggi",         emoji: "Plane",          color: "#0EA5E9", type: "EXPENSE", monthlyLimit: null, tag: null },
  { name: "Salute",         emoji: "HeartPulse",     color: "#EF4444", type: "EXPENSE", monthlyLimit: null, tag: null },
  { name: "Regali",         emoji: "Gift",           color: "#F97316", type: "EXPENSE", monthlyLimit: null, tag: null },
  { name: "Bambini",        emoji: "Baby",           color: "#FBBF24", type: "EXPENSE", monthlyLimit: null, tag: null },
  { name: "Istruzione",     emoji: "GraduationCap",  color: "#14B8A6", type: "EXPENSE", monthlyLimit: null, tag: null },
]; // categorie default spesa (aggiungibili fino a MAX_CATEGORIES_EXPENSE)

export const DEFAULT_CATEGORIES_INCOME: Omit<Category, "id" | "userId">[] = [
  { name: "Stipendio",     emoji: "Banknote",        color: "#22C55E", type: "INCOME", monthlyLimit: null, tag: null },
  { name: "NASPI",         emoji: "HandCoins",       color: "#3B82F6", type: "INCOME", monthlyLimit: null, tag: null },
  { name: "Assegno Unico", emoji: "HeartHandshake",   color: "#F59E0B", type: "INCOME", monthlyLimit: null, tag: null },
  { name: "Rimborsi",      emoji: "ArrowLeftRight",  color: "#10B981", type: "INCOME", monthlyLimit: null, tag: null },
  { name: "Paypal",        emoji: "Wallet",          color: "#2563EB", type: "INCOME", monthlyLimit: null, tag: null },
  { name: "Investimenti",  emoji: "TrendingUp",      color: "#8B5CF6", type: "INCOME", monthlyLimit: null, tag: null },
  { name: "Premi",         emoji: "Trophy",          color: "#F59E0B", type: "INCOME", monthlyLimit: null, tag: null },
  { name: "Part-time",     emoji: "Clock",           color: "#06B6D4", type: "INCOME", monthlyLimit: null, tag: null },
  { name: "Altri",         emoji: "CircleDollarSign",color: "#6B7280", type: "INCOME", monthlyLimit: null, tag: null },
]; // categorie default entrata (aggiungibili fino a MAX_CATEGORIES_INCOME)

export const KEYWORD_MAPPING: Record<string, string> = {};
