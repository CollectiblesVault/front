import { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, Platform, StyleSheet, View } from "react-native";

import { useTabTransition } from "../context/tab-transition-context";
import { theme } from "../theme";
import { LoadingState } from "./LoadingState";

export function TabTransitionOverlay() {
  const { isTabSwitching } = useTabTransition();
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.98)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: isTabSwitching ? 1 : 0,
        duration: isTabSwitching ? 110 : 140,
        easing: Easing.out(Easing.quad),
        useNativeDriver: Platform.OS !== "web",
      }),
      Animated.timing(scale, {
        toValue: isTabSwitching ? 1 : 0.985,
        duration: isTabSwitching ? 140 : 160,
        easing: Easing.out(Easing.quad),
        useNativeDriver: Platform.OS !== "web",
      }),
    ]).start();
  }, [isTabSwitching, opacity, scale]);

  const pointerEvents = useMemo(() => (isTabSwitching ? ("auto" as const) : ("none" as const)), [isTabSwitching]);

  return (
    <Animated.View
      pointerEvents={pointerEvents}
      style={[
        StyleSheet.absoluteFill,
        styles.overlay,
        {
          opacity,
          transform: [{ scale }],
        },
      ]}
    >
      <View style={styles.backdrop} />
      <LoadingState />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    zIndex: 9999,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.background,
  },
});

