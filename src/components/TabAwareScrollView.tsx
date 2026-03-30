import type { ComponentProps } from "react";
import { Platform, ScrollView } from "react-native";

import { useOptionalTabBarScroll } from "../context/tab-bar-scroll-context";

type Props = ComponentProps<typeof ScrollView>;

export function TabAwareScrollView({ onScroll, scrollEventThrottle, ...rest }: Props) {
  const tab = useOptionalTabBarScroll();

  const mergedOnScroll =
    Platform.OS === "android" && tab
      ? (e: Parameters<NonNullable<Props["onScroll"]>>[0]) => {
          tab.onScroll(e);
          onScroll?.(e);
        }
      : onScroll;

  return (
    <ScrollView
      {...rest}
      onScroll={mergedOnScroll}
      scrollEventThrottle={scrollEventThrottle ?? 16}
    />
  );
}
