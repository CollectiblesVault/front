import { useCallback, useRef } from "react";
import { Animated, Platform } from "react-native";

export function useEnterAnim(delayMs: number) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;
  const scale = useRef(new Animated.Value(0.985)).current;

  const play = useCallback(() => {
    opacity.setValue(0);
    translateY.setValue(10);
    scale.setValue(0.985);

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 240,
        delay: delayMs,
        useNativeDriver: Platform.OS !== "web",
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 260,
        delay: delayMs,
        useNativeDriver: Platform.OS !== "web",
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 280,
        delay: delayMs,
        useNativeDriver: Platform.OS !== "web",
      }),
    ]).start();
  }, [delayMs]);

  return { opacity, translateY, scale, play };
}