import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AlertCircle, RefreshCw, Wifi, WifiOff } from "lucide-react-native";
import type { ReactNode } from "react";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomNav } from "../components/BottomNav";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { OfflineBanner } from "../components/OfflineBanner";
import type { RootStackParamList } from "../navigation/types";
import { theme } from "../theme";

type Nav = NativeStackNavigationProp<RootStackParamList, "OfflineDemo">;
type Mode = "normal" | "offline" | "loading" | "error";
type MainMode = "normal" | "offline";

export function OfflineDemoScreen() {
  const [mode, setMode] = useState<Mode>("offline");

  if (mode === "loading") {
    return <LoadingState />;
  }

  if (mode === "error") {
    return <ErrorState onRetry={() => setMode("normal")} />;
  }

  return <OfflineDemoMain mode={mode} setMode={setMode} />;
}

function OfflineDemoMain({
  mode,
  setMode,
}: {
  mode: MainMode;
  setMode: (m: Mode) => void;
}) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();

  return (
    <View style={styles.root}>
      <OfflineBanner isOffline={mode === "offline"} />
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.h1}>Демо состояний интерфейса</Text>
        <Text style={styles.sub}>Переключение режимов отображения</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 96, gap: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Текущий режим</Text>
          <View style={styles.grid}>
            <ModeTile
              active={mode === "normal"}
              label="Онлайн"
              icon={<Wifi size={22} color={mode === "normal" ? theme.primaryForeground : theme.mutedForeground} />}
              onPress={() => setMode("normal")}
            />
            <ModeTile
              active={mode === "offline"}
              label="Офлайн"
              icon={<WifiOff size={22} color={mode === "offline" ? theme.primaryForeground : theme.mutedForeground} />}
              onPress={() => setMode("offline")}
            />
            <ModeTile
              active={false}
              label="Загрузка"
              icon={<RefreshCw size={22} color={theme.mutedForeground} />}
              onPress={() => setMode("loading")}
            />
            <ModeTile
              active={false}
              label="Ошибка"
              icon={<AlertCircle size={22} color={theme.mutedForeground} />}
              onPress={() => setMode("error")}
            />
          </View>
        </View>

        {mode === "offline" ? (
          <View style={{ gap: 12 }}>
            <Text style={styles.sectionTitle}>Офлайн-режим</Text>
            <View style={styles.card}>
              <Text style={styles.hint}>
                Без сети часть действий отключена, чтобы не потерять данные:
              </Text>
              <TouchableOpacity style={styles.fakeBtn} disabled>
                <WifiOff size={16} color={theme.primaryForeground} style={{ marginRight: 8 }} />
                <Text style={styles.fakeBtnText}>Новая коллекция (недоступно)</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.fakeBtn} disabled>
                <WifiOff size={16} color={theme.primaryForeground} style={{ marginRight: 8 }} />
                <Text style={styles.fakeBtnText}>Комментарии и лайки (недоступно)</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.fakeBtn} disabled>
                <WifiOff size={16} color={theme.primaryForeground} style={{ marginRight: 8 }} />
                <Text style={styles.fakeBtnText}>Экспорт отчёта (недоступно)</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.listCard}>
              <Text style={styles.listText}>
                ✓ Просмотр коллекций (только чтение){"\n"}✓ Просмотр предметов{"\n"}✓ Просмотр отчётов
                {"\n"}✗ Добавление и редактирование{"\n"}✗ Синхронизация данных
              </Text>
            </View>
          </View>
        ) : null}

        {mode === "normal" ? (
          <View style={styles.card}>
            <View style={styles.onlineRow}>
              <View style={styles.onlineIcon}>
                <Wifi size={22} color={theme.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.onlineTitle}>Онлайн-режим</Text>
                <Text style={styles.onlineSub}>Доступны все функции</Text>
              </View>
            </View>
            <Text style={styles.hint}>
              Доступны добавление предметов, лайки/комментарии, синхронизация и другие действия.
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TouchableOpacity style={styles.halfPrimary}>
                <Text style={styles.halfPrimaryText}>Добавить предмет</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.halfPrimary}>
                <Text style={styles.halfPrimaryText}>Синхронизировать</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        <TouchableOpacity style={styles.outlineBtn} onPress={() => navigation.navigate("Home")}>
          <Text style={styles.outlineBtnText}>На главную</Text>
        </TouchableOpacity>
      </ScrollView>
      <BottomNav />
    </View>
  );
}


function ModeTile({
  active,
  label,
  icon,
  onPress,
}: {
  active: boolean;
  label: string;
  icon: ReactNode;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.tile, active ? styles.tileOn : styles.tileOff]}
      activeOpacity={0.88}
    >
      <View style={{ marginBottom: 6 }}>{icon}</View>
      <Text style={[styles.tileLabel, active && styles.tileLabelOn]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.background },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border,
    backgroundColor: theme.background,
    zIndex: 10,
  },
  h1: { fontSize: 20, fontWeight: "600", color: theme.foreground, marginBottom: 4 },
  sub: { fontSize: 14, color: theme.mutedForeground },
  card: {
    backgroundColor: theme.card,
    borderRadius: theme.radiusXl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
    padding: 16,
    gap: 10,
  },
  cardTitle: { fontSize: 14, fontWeight: "600", color: theme.foreground, marginBottom: 4 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tile: {
    width: "48%",
    flexGrow: 1,
    paddingVertical: 14,
    borderRadius: theme.radiusLg,
    alignItems: "center",
  },
  tileOn: { backgroundColor: theme.primary },
  tileOff: {
    backgroundColor: theme.background,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
  },
  tileLabel: { fontSize: 13, fontWeight: "600", color: theme.mutedForeground },
  tileLabelOn: { color: theme.primaryForeground },
  sectionTitle: { fontSize: 14, fontWeight: "600", color: theme.foreground },
  hint: { fontSize: 12, color: theme.mutedForeground, lineHeight: 18 },
  fakeBtn: {
    height: 44,
    borderRadius: theme.radiusLg,
    backgroundColor: theme.primary,
    opacity: 0.45,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  fakeBtnText: { color: theme.primaryForeground, fontWeight: "700", fontSize: 14 },
  listCard: {
    backgroundColor: "rgba(42,42,42,0.5)",
    borderRadius: theme.radiusXl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
    padding: 16,
  },
  listText: { fontSize: 12, color: theme.mutedForeground, lineHeight: 20 },
  onlineRow: { flexDirection: "row", gap: 12, alignItems: "center", marginBottom: 8 },
  onlineIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "rgba(212,175,55,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  onlineTitle: { fontSize: 14, fontWeight: "600", color: theme.foreground },
  onlineSub: { fontSize: 12, color: theme.mutedForeground, marginTop: 2 },
  halfPrimary: {
    flex: 1,
    height: 40,
    borderRadius: theme.radiusLg,
    backgroundColor: theme.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  halfPrimaryText: { color: theme.primaryForeground, fontWeight: "700" },
  outlineBtn: {
    height: 48,
    borderRadius: theme.radiusLg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
    alignItems: "center",
    justifyContent: "center",
  },
  outlineBtnText: { color: theme.foreground, fontWeight: "600" },
});
