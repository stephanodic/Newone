import React from "react";
import { cn } from "../lib/utils";
import { haptic } from "../lib/haptic";
import { useUI } from "../context/UIContext";
import { LayoutDashboard, History, FolderKanban, BarChart3, ShoppingBag, User } from "lucide-react";
import { motion } from "motion/react";

const TABS = ["dashboard", "history", "categories", "charts", "shopping", "profile"] as const;
type Tab = typeof TABS[number];

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "history", label: "Cronologia", icon: History },
  { id: "categories", label: "Categorie", icon: FolderKanban },
  { id: "charts", label: "Grafici", icon: BarChart3 },
  { id: "shopping", label: "Spesa", icon: ShoppingBag },
  { id: "profile", label: "Profilo", icon: User },
] as const;

interface BottomNavProps {
  activeTab?: string;
  activeSheet?: boolean;
  onTabClick?: (tab: string) => void;
  onAddClick?: () => void;
}

export default function BottomNav({ onTabClick }: BottomNavProps) {
  const { activeTab, setActiveTab } = useUI();

  const handleTab = (id: string) => {
    haptic("light");
    if (onTabClick) {
      onTabClick(id);
    } else {
      setActiveTab(id as Tab);
    }
  };

  return (
    <motion.nav
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="relative z-[1000] w-full shrink-0 px-2 py-1.5 flex justify-between items-center shadow-[0_-4px_24px_rgba(0,0,0,0.15)] pb-[max(env(safe-area-inset-bottom),10px)]"
      style={{ background: 'linear-gradient(90deg, var(--theme-primary, #1D9E75) 0%, var(--theme-secondary, #11cc98) 100%)' }}
    >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => handleTab(item.id)}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
              className="flex flex-col items-center justify-center flex-1 py-1 relative min-w-0 group"
            >
              <div
                className={cn(
                  "p-1.5 rounded-xl transition-all duration-300 relative z-10",
                  isActive
                    ? "text-white scale-110"
                    : "text-white/60 group-active:scale-95"
                )}
              >
                <Icon size={19} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span
                className={cn(
                  "text-[10px] tracking-tight mt-0.5 transition-all duration-300 relative z-10",
                  isActive ? "text-white font-black" : "text-white/60 font-medium"
                )}
              >
                {item.label}
              </span>
              {isActive && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute inset-0 bg-black/15 rounded-2xl mx-1"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </button>
          );
        })}
    </motion.nav>
  );
}
