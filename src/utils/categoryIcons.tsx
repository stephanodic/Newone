import React from 'react';
import { 
  ShoppingCart, Pizza, Zap, Home, Bus, Plane, Dumbbell, 
  PiggyBank, Shirt, Gift, BookOpen, Gamepad, PawPrint, 
  Stethoscope, Monitor, Tv, Pill, Wrench, Package,
  TrendingUp, Laptop, DollarSign, ShoppingBag, Wallet
} from 'lucide-react';

export const CATEGORY_ICONS: Record<string, { icon: React.ElementType, color: string, bg: string }> = {
  'Alimentari':   { icon: ShoppingCart, color: '#ef4444', bg: '#fef2f2' },
  'Ristoranti':   { icon: Pizza,        color: '#f97316', bg: '#fff7ed' },
  'Bollette':     { icon: Zap,          color: '#eab308', bg: '#fefce8' },
  'Casa':         { icon: Home,         color: '#22c55e', bg: '#f0fdf4' },
  'Trasporti':    { icon: Bus,          color: '#14b8a6', bg: '#f0fdfa' },
  'Viaggi':       { icon: Plane,        color: '#38bdf8', bg: '#f0f9ff' },
  'Sport':        { icon: Dumbbell,     color: '#818cf8', bg: '#eef2ff' },
  'Risparmi':     { icon: PiggyBank,    color: '#34d399', bg: '#ecfdf5' },
  'Abbigliamento':{ icon: Shirt,        color: '#60a5fa', bg: '#eff6ff' },
  'Regali':       { icon: Gift,         color: '#f472b6', bg: '#fdf2f8' },
  'Istruzione':   { icon: BookOpen,     color: '#a78bfa', bg: '#f5f3ff' },
  'Giochi':       { icon: Gamepad,      color: '#c084fc', bg: '#faf5ff' },
  'Animali':      { icon: PawPrint,     color: '#fb923c', bg: '#fff7ed' },
  'Medico':       { icon: Stethoscope,  color: '#fb7185', bg: '#fff1f2' },
  'Tecnologia':   { icon: Monitor,      color: '#60a5fa', bg: '#eff6ff' },
  'Svago':        { icon: Tv,           color: '#f87171', bg: '#fef2f2' },
  'Salute':       { icon: Pill,         color: '#f472b6', bg: '#fdf2f8' },
  'Manutenzione': { icon: Wrench,       color: '#94a3b8', bg: '#f8fafc' },
  'Altro':        { icon: Package,      color: '#94a3b8', bg: '#f8fafc' },
  'Stipendio':    { icon: Wallet,       color: '#22c55e', bg: '#f0fdf4' },
  'Freelance':    { icon: Laptop,       color: '#27AE60', bg: '#f0fdf4' },
  'Investimenti': { icon: TrendingUp,   color: '#16A085', bg: '#f0fdf4' },
  'Regalo':       { icon: Gift,         color: '#22c55e', bg: '#f0fdf4' },
  'Vendite':      { icon: ShoppingBag,  color: '#27AE60', bg: '#f0fdf4' },
};

export function getCategoryIcon(name: string) {
  return CATEGORY_ICONS[name] || { icon: Package, color: '#94a3b8', bg: '#f8fafc' };
}
