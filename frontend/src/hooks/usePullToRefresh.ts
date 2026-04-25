import { useEffect, useRef, useState } from "react";

const SCROLL_CONTAINER_ID = "app-main";
const THRESHOLD_PX = 70;
const MAX_PULL_PX = 110;
const RESISTANCE = 0.55;

export interface PullToRefreshState {
  pullDistance: number;
  isRefreshing: boolean;
  isPastThreshold: boolean;
}

export function usePullToRefresh(
  onRefresh: () => void | Promise<void>,
  enabled: boolean,
): PullToRefreshState {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const tracking = useRef(false);
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    if (!enabled) {
      setPullDistance(0);
      setIsRefreshing(false);
      return;
    }
    const el = document.getElementById(SCROLL_CONTAINER_ID);
    if (!el) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (el.scrollTop > 0 || isRefreshing) {
        startY.current = null;
        tracking.current = false;
        return;
      }
      startY.current = e.touches[0].clientY;
      tracking.current = true;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!tracking.current || startY.current === null) return;
      const delta = e.touches[0].clientY - startY.current;
      if (delta <= 0) {
        if (pullDistance !== 0) setPullDistance(0);
        return;
      }
      if (el.scrollTop > 0) {
        tracking.current = false;
        setPullDistance(0);
        return;
      }
      const next = Math.min(MAX_PULL_PX, delta * RESISTANCE);
      setPullDistance(next);
    };

    const handleTouchEnd = async () => {
      if (!tracking.current) return;
      tracking.current = false;
      const past = pullDistance >= THRESHOLD_PX;
      startY.current = null;
      if (!past) {
        setPullDistance(0);
        return;
      }
      setIsRefreshing(true);
      setPullDistance(THRESHOLD_PX);
      try {
        await onRefreshRef.current();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    };

    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchmove", handleTouchMove, { passive: true });
    el.addEventListener("touchend", handleTouchEnd, { passive: true });
    el.addEventListener("touchcancel", handleTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
      el.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [enabled, pullDistance, isRefreshing]);

  return {
    pullDistance,
    isRefreshing,
    isPastThreshold: pullDistance >= THRESHOLD_PX,
  };
}

export const PULL_TO_REFRESH_THRESHOLD_PX = THRESHOLD_PX;
