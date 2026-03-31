import { useEffect, useRef } from "react";
import { ActivityIndicator, Animated, Easing, Platform, StyleSheet, Text, View } from "react-native";

import { theme } from "../theme";

export function LoadingState() {
  const pulse = useRef(new Animated.Value(0.4)).current;
  const fade = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const a = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulse, {
            toValue: 1,
            duration: 650,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: Platform.OS !== "web",
          }),
          Animated.timing(fade, {
            toValue: 1,
            duration: 650,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: Platform.OS !== "web",
          }),
        ]),
        Animated.parallel([
          Animated.timing(pulse, {
            toValue: 0.4,
            duration: 650,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: Platform.OS !== "web",
          }),
          Animated.timing(fade, {
            toValue: 0.3,
            duration: 650,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: Platform.OS !== "web",
          }),
        ]),
      ]),
    );
    a.start();
    return () => {
      a.stop();
    };
  }, [pulse, fade]);

  return (
    <View style={styles.wrap}>
      <Animated.View style={[styles.glow, { opacity: pulse }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </Animated.View>
      <Animated.Text style={[styles.caption, { opacity: fade }]}>Загрузка…</Animated.Text>
      <View style={styles.skeletonRow}>
        {[0, 1, 2].map((i) => (
          <Animated.View
            key={i}
            style={[
              styles.skeletonBar,
              {
                opacity: pulse,
                width: `${60 + i * 12}%` as `${number}%`,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: theme.background,
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    paddingHorizontal: 48,
  },
  glow: {
    padding: 24,
    borderRadius: 999,
    backgroundColor: "rgba(212,175,55,0.08)",
  },
  caption: {
    fontSize: 15,
    color: theme.mutedForeground,
    fontWeight: "500",
  },
  skeletonRow: {
    alignSelf: "stretch",
    gap: 10,
    marginTop: 8,
  },
  skeletonBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.muted,
    alignSelf: "center",
  },
});
