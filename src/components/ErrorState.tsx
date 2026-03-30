import { AlertCircle } from "lucide-react-native";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { theme } from "../theme";

type Props = {
  message?: string;
  onRetry?: () => void;
};

export function ErrorState({
  message = "Что-то пошло не так. Попробуйте снова.",
  onRetry,
}: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.iconCircle}>
        <AlertCircle size={32} color={theme.destructive} />
      </View>
      <Text style={styles.title}>Ошибка</Text>
      <Text style={styles.body}>{message}</Text>
      {onRetry ? (
        <TouchableOpacity style={styles.btn} onPress={onRetry} activeOpacity={0.85}>
          <Text style={styles.btnText}>Повторить</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: theme.background,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(220,38,38,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.foreground,
    marginBottom: 8,
  },
  body: {
    fontSize: 14,
    color: theme.mutedForeground,
    textAlign: "center",
    marginBottom: 16,
  },
  btn: {
    backgroundColor: theme.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: theme.radiusLg,
  },
  btnText: {
    color: theme.primaryForeground,
    fontWeight: "600",
    fontSize: 15,
  },
});
