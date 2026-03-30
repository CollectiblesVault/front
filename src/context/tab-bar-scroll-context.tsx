import { createContext, useCallback, useContext, useMemo, useRef, type ReactNode } from "react";
import { Animated, Platform, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";

const TAB_BAR_OFFSET = 72;

interface TabBarScrollValue {
  translateY: Animated.Value;
  onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
}

const TabBarScrollContext = createContext<TabBarScrollValue | null>(null);

export function TabBarScrollProvider({ children }: { children: ReactNode }) {
  const translateY = useRef(new Animated.Value(0)).current;
  const lastY = useRef(0);
  const hidden = useRef(false);

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (Platform.OS !== "android") {
        return;
      }
      const y = e.nativeEvent.contentOffset.y;
      const dy = y - lastY.current;
      lastY.current = y;

      if (y < 24) {
        if (hidden.current) {
          hidden.current = false;
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            friction: 8,
          }).start();
        }
        return;
      }

      if (dy > 6 && y > 48 && !hidden.current) {
        hidden.current = true;
        Animated.spring(translateY, {
          toValue: TAB_BAR_OFFSET,
          useNativeDriver: true,
          friction: 8,
        }).start();
      } else if (dy < -6 && hidden.current) {
        hidden.current = false;
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          friction: 8,
        }).start();
      }
    },
    [translateY],
  );

  const value = useMemo(() => ({ translateY, onScroll }), [translateY, onScroll]);

  return <TabBarScrollContext.Provider value={value}>{children}</TabBarScrollContext.Provider>;
}

export function useTabBarScroll(): TabBarScrollValue {
  const ctx = useContext(TabBarScrollContext);
  if (!ctx) {
    throw new Error("useTabBarScroll must be used within TabBarScrollProvider");
  }
  return ctx;
}

/** Безопасно вне провайдера (например Welcome/Login) */
export function useOptionalTabBarScroll(): TabBarScrollValue | null {
  return useContext(TabBarScrollContext);
}
