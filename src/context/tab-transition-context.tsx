import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

type TabTransitionContextValue = {
  isTabSwitching: boolean;
  beginTabSwitch: (toRouteName: string) => void;
  endTabSwitch: () => void;
  onNavigationStateChange: () => void;
};

const TabTransitionContext = createContext<TabTransitionContextValue | null>(null);

export function TabTransitionProvider({ children }: { children: React.ReactNode }) {
  const [isTabSwitching, setIsTabSwitching] = useState(false);
  const pendingToRouteRef = useRef<string | null>(null);
  const endTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (endTimerRef.current) {
      clearTimeout(endTimerRef.current);
      endTimerRef.current = null;
    }
  }, []);

  const endTabSwitch = useCallback(() => {
    pendingToRouteRef.current = null;
    clearTimer();
    setIsTabSwitching(false);
  }, [clearTimer]);

  const beginTabSwitch = useCallback(
    (toRouteName: string) => {
      pendingToRouteRef.current = toRouteName;
      clearTimer();
      setIsTabSwitching(true);
      // Fallback: even if state change event is delayed, don't leave overlay stuck.
      endTimerRef.current = setTimeout(() => {
        setIsTabSwitching(false);
        pendingToRouteRef.current = null;
        endTimerRef.current = null;
      }, 900);
    },
    [clearTimer],
  );

  const onNavigationStateChange = useCallback(() => {
    // Any successful navigation state change after a tab press should dismiss the overlay quickly.
    if (pendingToRouteRef.current) {
      endTabSwitch();
    }
  }, [endTabSwitch]);

  const value = useMemo<TabTransitionContextValue>(
    () => ({ isTabSwitching, beginTabSwitch, endTabSwitch, onNavigationStateChange }),
    [isTabSwitching, beginTabSwitch, endTabSwitch, onNavigationStateChange],
  );

  return <TabTransitionContext.Provider value={value}>{children}</TabTransitionContext.Provider>;
}

export function useTabTransition() {
  const ctx = useContext(TabTransitionContext);
  if (!ctx) {
    throw new Error("useTabTransition must be used within TabTransitionProvider");
  }
  return ctx;
}

