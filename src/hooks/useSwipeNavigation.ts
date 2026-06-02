import { useRef, useCallback, useState } from 'react';
import type React from 'react';
import { haptic } from '../lib/haptic';

const TABS = ["dashboard", "history", "categories", "charts", "shopping", "profile"] as const;
type Tab = typeof TABS[number];

interface UseSwipeNavigationProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
}

export function useSwipeNavigation({ activeTab, setActiveTab }: UseSwipeNavigationProps) {
  const [tabDirection, setTabDirection] = useState(1);
  const prevTab = useRef<Tab>("dashboard");
  const swipeStartX = useRef(0);
  const swipeStartY = useRef(0);

  const navigateToTab = useCallback((tab: string) => {
    const prevIdx = TABS.indexOf(prevTab.current);
    const nextIdx = TABS.indexOf(tab as Tab);
    setTabDirection(nextIdx >= prevIdx ? 1 : -1);
    prevTab.current = tab as Tab;
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    swipeStartX.current = e.touches[0].clientX;
    swipeStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const diff  = swipeStartX.current - e.changedTouches[0].clientX;
    const diffY = swipeStartY.current - e.changedTouches[0].clientY;
    if (Math.abs(diff) < 60 || Math.abs(diffY) > Math.abs(diff)) return;
    const idx = TABS.indexOf(activeTab as Tab);
    if (diff > 0 && idx < TABS.length - 1) {
      haptic();
      navigateToTab(TABS[idx + 1]);
      setActiveTab(TABS[idx + 1] as any);
    } else if (diff < 0 && idx > 0) {
      haptic();
      navigateToTab(TABS[idx - 1]);
      setActiveTab(TABS[idx - 1] as any);
    }
  }, [activeTab, navigateToTab, setActiveTab]);

  return { tabDirection, navigateToTab, handleTouchStart, handleTouchEnd };
}
