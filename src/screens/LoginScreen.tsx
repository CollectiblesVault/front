import { CommonActions, useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import { Lock, Mail, User, Vault } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CurrencyIcon } from "../components/CurrencyIcon";
import { useAppSettings } from "../context/app-settings-context";
import type { RootStackParamList } from "../navigation/types";
import { theme } from "../theme";
import { CURRENCY_CODES, getCurrencyLabel } from "../utils/formatMoney";

type Nav = NativeStackNavigationProp<RootStackParamList, "Login">;
type LoginRoute = RouteProp<RootStackParamList, "Login">;

export function LoginScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const route = useRoute<LoginRoute>();
  const { currency, setCurrency, setUserProfile, setAuthToken } = useAppSettings();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    const mode = route.params?.mode;
    if (mode === "register") {
      setIsLogin(false);
    } else if (mode === "login") {
      setIsLogin(true);
    }
  }, [route.params?.mode]);

  const finishAuth = async () => {
    const un = username.trim() || "Пользователь";
    const em = (!isLogin ? email.trim() : `${un}@example.com`) || `${un}@example.com`;
    const pwd = password;

    if (!pwd || pwd.length < 6) {
      Alert.alert("Проверьте данные", "Пароль должен быть минимум 6 символов.");
      return;
    }
    if (!isLogin && confirmPassword !== pwd) {
      Alert.alert("Проверьте данные", "Пароли не совпадают.");
      return;
    }

    try {
      const { loginApi, registerApi } = await import("../api/vaultApi");
      const res = isLogin ? await loginApi({ email: em, password: pwd }) : await registerApi({ email: em, password: pwd });
      if (!res.token) {
        Alert.alert("Ошибка входа", "Не удалось получить токен авторизации от сервера.");
        return;
      }
      setAuthToken(res.token);
    } catch {
      Alert.alert("Ошибка", "Не удалось выполнить вход. Проверьте данные и попробуйте ещё раз.");
      return;
    }

    setUserProfile({ email: em, displayName: un });
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: "Home" }],
      }),
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.logoBlock}>
          <View style={styles.logoCircle}>
            <Vault size={40} color={theme.primary} strokeWidth={1.75} />
          </View>
          <Text style={styles.brand}>Хранилище коллекций</Text>
          <Text style={styles.tagline}>Управление премиальной коллекцией</Text>
        </View>

        <View style={styles.menuCard}>
          <Text style={styles.menuCardTitle}>Режим доступа</Text>
          <View style={styles.segmentRow}>
            <TouchableOpacity
              style={[styles.segmentBtn, isLogin && styles.segmentBtnOn]}
              onPress={() => setIsLogin(true)}
              activeOpacity={0.88}
            >
              <Text style={[styles.segmentText, isLogin && styles.segmentTextOn]}>Вход</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segmentBtn, !isLogin && styles.segmentBtnOn]}
              onPress={() => setIsLogin(false)}
              activeOpacity={0.88}
            >
              <Text style={[styles.segmentText, !isLogin && styles.segmentTextOn]}>Регистрация</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.form}>
          <View style={styles.field}>
            <User size={20} color={theme.mutedForeground} style={styles.fieldIcon} />
            <TextInput
              value={username}
              onChangeText={setUsername}
              placeholder="Имя пользователя"
              placeholderTextColor={theme.mutedForeground}
              autoCapitalize="none"
              style={styles.input}
            />
          </View>
          <View style={styles.field}>
            <Lock size={20} color={theme.mutedForeground} style={styles.fieldIcon} />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Пароль"
              placeholderTextColor={theme.mutedForeground}
              secureTextEntry
              autoCapitalize="none"
              style={styles.input}
            />
          </View>
          {!isLogin ? (
            <View style={styles.field}>
              <Lock size={20} color={theme.mutedForeground} style={styles.fieldIcon} />
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Подтвердите пароль"
                placeholderTextColor={theme.mutedForeground}
                secureTextEntry
                autoCapitalize="none"
                style={styles.input}
              />
            </View>
          ) : null}
          {!isLogin ? (
            <View style={styles.field}>
              <Mail size={20} color={theme.mutedForeground} style={styles.fieldIcon} />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Email"
                placeholderTextColor={theme.mutedForeground}
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.input}
              />
            </View>
          ) : null}

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={finishAuth}
            activeOpacity={0.9}
          >
            <Text style={styles.primaryBtnText}>{isLogin ? "Войти" : "Создать аккаунт"}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setIsLogin(!isLogin)}
            style={styles.switcher}
          >
            <Text style={styles.switcherText}>
              {isLogin ? "Нет аккаунта? Зарегистрироваться" : "Уже есть аккаунт? Войти"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.currencyBlock}>
          <Text style={styles.currencyTitle}>Валюта отображения цен</Text>
          <Text style={styles.currencySub}>{getCurrencyLabel(currency)}</Text>
          <View style={styles.currencyRow}>
            {CURRENCY_CODES.map((code) => (
              <TouchableOpacity
                key={code}
                style={[styles.currencyChip, currency === code && styles.currencyChipOn]}
                onPress={() => setCurrency(code)}
                activeOpacity={0.85}
                accessibilityLabel={getCurrencyLabel(code)}
              >
                <CurrencyIcon
                  code={code}
                  size={22}
                  color={currency === code ? theme.primaryForeground : theme.mutedForeground}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.background,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  logoBlock: {
    alignItems: "center",
    marginBottom: 24,
    gap: 12,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: "rgba(212,175,55,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  brand: {
    fontSize: 24,
    fontWeight: "600",
    color: theme.foreground,
    letterSpacing: -0.3,
  },
  tagline: {
    fontSize: 14,
    color: theme.mutedForeground,
    textAlign: "center",
  },
  menuCard: {
    backgroundColor: theme.card,
    borderRadius: theme.radiusXl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  menuCardTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.foreground,
  },
  segmentRow: {
    flexDirection: "row",
    gap: 8,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: theme.radiusLg,
    backgroundColor: theme.background,
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
  },
  segmentBtnOn: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.mutedForeground,
  },
  segmentTextOn: {
    color: theme.primaryForeground,
  },
  guestRow: {
    alignItems: "center",
    paddingVertical: 10,
  },
  guestRowText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.primary,
  },
  form: {
    gap: 12,
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.card,
    borderRadius: theme.radiusLg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
    paddingHorizontal: 12,
    minHeight: 48,
  },
  fieldIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: theme.foreground,
    fontSize: 16,
    paddingVertical: 12,
  },
  primaryBtn: {
    marginTop: 4,
    height: 48,
    borderRadius: theme.radiusLg,
    backgroundColor: theme.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    color: theme.primaryForeground,
    fontWeight: "600",
    fontSize: 16,
  },
  switcher: {
    alignItems: "center",
    paddingVertical: 4,
  },
  switcherText: {
    fontSize: 14,
    color: theme.mutedForeground,
  },
  currencyBlock: {
    marginTop: 28,
    paddingTop: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.border,
  },
  currencyTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.foreground,
    marginBottom: 4,
  },
  currencySub: {
    fontSize: 12,
    color: theme.mutedForeground,
    marginBottom: 12,
  },
  currencyRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  currencyChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.radiusLg,
    backgroundColor: theme.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
  },
  currencyChipOn: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  currencyChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.mutedForeground,
  },
  currencyChipTextOn: {
    color: theme.primaryForeground,
  },
});
