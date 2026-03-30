import { WifiOff } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

import { theme } from "../theme";

type Props = { isOffline: boolean };

export function OfflineBanner({ isOffline }: Props) {
  if (!isOffline) return null;

  return (
    <View style={styles.wrap}>
      <WifiOff size={16} color={theme.mutedForeground} />
      <Text style={styles.text}>Офлайн — часть функций недоступна</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: theme.muted,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  text: {
    flex: 1,
    fontSize: 12,
    color: theme.mutedForeground,
  },
});
