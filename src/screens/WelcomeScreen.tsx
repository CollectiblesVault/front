import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LogIn, UserPlus } from "lucide-react-native";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { RootStackParamList } from "../navigation/types";
import { theme } from "../theme";

type Nav = NativeStackNavigationProp<RootStackParamList, "Welcome">;

export function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();

  return (
    <View style={[styles.root, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.hero}>
        <Text style={styles.brand}>Хранилище коллекций</Text>
        <Text style={styles.tagline}>Выберите способ входа</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Аккаунт</Text>
        <Text style={styles.cardBody}>Вход или регистрация — полный доступ к коллекциям, предметам и комментариям.</Text>
        <TouchableOpacity
          style={styles.btnPrimary}
          onPress={() => navigation.navigate("Login", { mode: "login" })}
          activeOpacity={0.9}
        >
          <LogIn size={20} color={theme.primaryForeground} style={styles.btnIcon} />
          <Text style={styles.btnPrimaryText}>Войти</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.btnSecondary}
          onPress={() => navigation.navigate("Login", { mode: "register" })}
          activeOpacity={0.9}
        >
          <UserPlus size={20} color={theme.primary} style={styles.btnIcon} />
          <Text style={styles.btnSecondaryText}>Регистрация</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.hint}>
        <Text style={styles.hintText}>Войдите, чтобы управлять своими коллекциями и предметами.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.background,
    paddingHorizontal: 24,
    justifyContent: "center",
    gap: 20,
  },
  hero: { alignItems: "center", marginBottom: 8 },
  brand: { fontSize: 26, fontWeight: "700", color: theme.foreground, textAlign: "center" },
  tagline: { fontSize: 15, color: theme.mutedForeground, marginTop: 8, textAlign: "center" },
  card: {
    backgroundColor: theme.card,
    borderRadius: theme.radiusXl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
    padding: 18,
    gap: 12,
  },
  cardTitle: { fontSize: 16, fontWeight: "600", color: theme.foreground },
  cardBody: { fontSize: 14, color: theme.mutedForeground, lineHeight: 20 },
  btnPrimary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 48,
    borderRadius: theme.radiusLg,
    backgroundColor: theme.primary,
    gap: 8,
  },
  btnPrimaryText: { color: theme.primaryForeground, fontWeight: "700", fontSize: 16 },
  btnSecondary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 48,
    borderRadius: theme.radiusLg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.primary,
    gap: 8,
  },
  btnSecondaryText: { color: theme.primary, fontWeight: "700", fontSize: 16 },
  btnOutline: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 48,
    borderRadius: theme.radiusLg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
    gap: 8,
    marginTop: 4,
  },
  btnOutlineText: { color: theme.foreground, fontWeight: "600", fontSize: 16 },
  btnIcon: { marginRight: 4 },
  hint: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    paddingHorizontal: 4,
  },
  hintText: { flex: 1, fontSize: 12, color: theme.mutedForeground, lineHeight: 18 },
});
