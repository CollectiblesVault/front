import { useEffect, useRef } from "react";
import { Animated, Easing, Platform, StyleSheet, type ViewStyle } from "react-native";

import { theme } from "../theme";

type Props = {
  style?: ViewStyle | ViewStyle[];
  radius?: number;
};

export function Skeleton({ style, radius = theme.radiusLg }: Props) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 850, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 850, easing: Easing.inOut(Easing.ease), useNativeDriver: Platform.OS !== "web" }),
      ]),
    );
    a.start();
    return () => a.stop();
  }, [shimmer]);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0.95] });

  return (
    <Animated.View
      style={[
        styles.base,
        { borderRadius: radius, opacity },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: theme.muted,
  },
});

