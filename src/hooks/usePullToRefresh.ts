import { useRef, useState, useCallback } from 'react';
import type React from 'react';

const PULL_THRESHOLD = 64;
export const PULL_MAX = 90;

interface UsePullToRefreshProps {
  onRefresh: () => Promise<void>;
}

export function usePullToRefresh({ onRefresh }: UsePullToRefreshProps) {
  const [pullY, setPullY] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const pullYRef        = useRef(0);
  const isPullingRef    = useRef(false);
  const isRefreshingRef = useRef(false);
  // Set by the caller's onTouchStart so we share the same origin point
  const startYRef = useRef(0);
  const startXRef = useRef(0);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (isRefreshingRef.current) return;
    const dy = e.touches[0].clientY - startYRef.current;
    const dx = Math.abs(e.touches[0].clientX - startXRef.current);
    if (dy <= 0 || dx > dy) {
      if (isPullingRef.current) { isPullingRef.current = false; pullYRef.current = 0; setPullY(0); }
      return;
    }
    isPullingRef.current = true;
    pullYRef.current = Math.min(dy * 0.42, PULL_MAX);
    setPullY(pullYRef.current);
  }, []);

  const handlePullEnd = useCallback(async () => {
    if (!isPullingRef.current) return;
    isPullingRef.current = false;
    const py = pullYRef.current;
    pullYRef.current = 0;
    setPullY(0);
    if (py >= PULL_THRESHOLD) {
      isRefreshingRef.current = true;
      setIsRefreshing(true);
      try { await onRefresh(); } catch {}
      isRefreshingRef.current = false;
      setIsRefreshing(false);
    }
  }, [onRefresh]);

  return { pullY, isRefreshing, isPullingRef, handleTouchMove, handlePullEnd, startYRef, startXRef };
}
