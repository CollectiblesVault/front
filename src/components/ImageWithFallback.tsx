import { Image, ImageProps } from "expo-image";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { theme } from "../theme";

type Props = Omit<ImageProps, "source"> & {
  uri: string;
  borderRadius?: number;
};

export function ImageWithFallback({ uri, style, borderRadius = 0, ...rest }: Props) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <View style={[styles.fallback, { borderRadius }, style as object]}>
        <View style={styles.fallbackInner} />
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={[{ borderRadius }, style]}
      onError={() => setFailed(true)}
      contentFit="cover"
      transition={200}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: theme.muted,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  fallbackInner: {
    width: "40%",
    height: "40%",
    borderRadius: 4,
    backgroundColor: theme.mutedForeground,
    opacity: 0.35,
  },
});
