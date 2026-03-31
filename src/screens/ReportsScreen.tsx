import { useFocusEffect } from "@react-navigation/native";
import { Calendar, Filter } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Modal,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomNav } from "../components/BottomNav";
import { TabAwareScrollView } from "../components/TabAwareScrollView";
import { OfflineBanner } from "../components/OfflineBanner";
import { DonutChart } from "../components/DonutChart";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { useAppSettings } from "../context/app-settings-context";
import { reportsActivityApi, reportsSummaryApi, reportsSummaryCsvApi } from "../api/vaultApi";
import { theme } from "../theme";

type TimeRange = "week" | "month" | "year";

interface ReportSections {
  portfolioCard: boolean;
  growthChart: boolean;
  categories: boolean;
  topPerformers: boolean;
}

const defaultSections: ReportSections = {
  portfolioCard: true,
  growthChart: true,
  categories: true,
  topPerformers: true,
};

function useEnterAnim(delayMs: number) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;
  const scale = useRef(new Animated.Value(0.985)).current;

  const play = useCallback(() => {
    opacity.setValue(0);
    translateY.setValue(10);
    scale.setValue(0.985);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 240, delay: delayMs, useNativeDriver: Platform.OS !== "web" }),
      Animated.timing(translateY, { toValue: 0, duration: 260, delay: delayMs, useNativeDriver: Platform.OS !== "web" }),
      Animated.timing(scale, { toValue: 1, duration: 280, delay: delayMs, useNativeDriver: Platform.OS !== "web" }),
    ]).start();
  }, [delayMs, opacity, scale, translateY]);

  return { opacity, translateY, scale, play };
}

export function ReportsScreen() {
  const insets = useSafeAreaInsets();
  const { formatMoney, userProfile, authToken } = useAppSettings();
  const [isOffline] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>("month");
  const [filterOpen, setFilterOpen] = useState(false);
  const [sections, setSections] = useState<ReportSections>(defaultSections);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<any | null>(null);
  const [activity, setActivity] = useState<any | null>(null);

  const portfolioAnim = useEnterAnim(40);
  const growthAnim = useEnterAnim(80);
  const categoriesAnim = useEnterAnim(120);
  const topAnim = useEnterAnim(160);

  const donutSpin = useRef(new Animated.Value(0)).current;
  const barsProgress = useRef(new Animated.Value(0)).current;

  const rangeLabel = (r: TimeRange) => (r === "week" ? "7 дней" : r === "month" ? "30 дней" : "1 год");

  const series = useMemo(() => {
    const raw = activity?.series ?? activity?.data ?? activity?.items ?? null;
    if (!Array.isArray(raw)) return [];
    return raw
      .map((r: any) => ({
        label: String(r?.label ?? r?.interval ?? r?.date ?? ""),
        items: Number(r?.items ?? r?.items_count ?? r?.itemsDelta ?? 0) || 0,
      }))
      .filter((r: any) => r.label);
  }, [activity]);

  const maxBar = useMemo(() => Math.max(1, ...series.map((d: any) => d.items)), [series]);

  const donutLegend = useMemo(() => {
    const sums = {
      collections: Number(summary?.collections ?? summary?.collections_count ?? 0) || 0,
      items: Number(summary?.items ?? summary?.items_count ?? 0) || 0,
      likes: Number(summary?.likes ?? summary?.likes_count ?? 0) || 0,
      comments: Number(summary?.comments ?? summary?.comments_count ?? 0) || 0,
      wishlist: Number(summary?.wishlist ?? summary?.wishlist_count ?? 0) || 0,
    };

    const palette = [
      { label: "Коллекции", key: "collections" as const, color: theme.primary },
      { label: "Предметы", key: "items" as const, color: "rgba(212,175,55,0.95)" },
      { label: "Лайки", key: "likes" as const, color: theme.foreground },
      { label: "Комментарии", key: "comments" as const, color: "rgba(138,138,138,0.95)" },
      { label: "В желаниях", key: "wishlist" as const, color: theme.primaryForeground },
    ];

    return palette.map((p) => ({
      label: p.label,
      value: sums[p.key],
      color: p.color,
    }));
  }, [summary]);

  const donutData = useMemo(
    () =>
      donutLegend.map((d) => ({
        value: d.value,
        color: d.color,
      })),
    [donutLegend],
  );

  const handleExport = useCallback(async () => {
    try {
      if (authToken == null) {
        Alert.alert("Нужен вход", "Экспорт отчётов доступен после входа.");
        return;
      }
      const csv = await Promise.all([
        reportsSummaryCsvApi({ token: authToken, period: "week" }),
        reportsSummaryCsvApi({ token: authToken, period: "month" }),
        reportsSummaryCsvApi({ token: authToken, period: "year" }),
      ]).then((parts) => parts.join("\n"));

      // Web: создаём файл через Blob и запускаем скачивание.
      if (Platform.OS === "web") {
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `report_${Date.now()}.csv`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 800);
        return;
      }

      // Мобильные платформы: сохраняем файл через expo-file-system и открываем share-sheet.
      const FileSystem = await import("expo-file-system/legacy");
      const Sharing = await import("expo-sharing");

      const baseDir = FileSystem.documentDirectory ?? FileSystem.cacheDirectory;
      if (!baseDir) {
        await Share.share({ title: "Экспорт CSV", message: csv });
        return;
      }

      const fileUri = `${baseDir}report_${Date.now()}.csv`;
      await FileSystem.writeAsStringAsync(fileUri, csv, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      } else {
        await Share.share({ title: "Экспорт CSV", message: csv });
      }
    } catch {
      Alert.alert("Не удалось поделиться", "Попробуйте ещё раз.");
    }
  }, [authToken]);

  const toggleSection = useCallback((key: keyof ReportSections) => {
    setSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const allEnabled = sections.portfolioCard && sections.growthChart && sections.categories && sections.topPerformers;

  const enableAll = useCallback(() => {
    setSections(defaultSections);
  }, []);

  const refreshStatsFromApi = useCallback(async () => {
    if (authToken == null) {
      setSummary(null);
      setActivity(null);
      setIsLoading(false);
      setError(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const [s, a] = await Promise.all([
        reportsSummaryApi({ token: authToken, period: timeRange }),
        reportsActivityApi({ token: authToken, period: timeRange }),
      ]);
      setSummary(s ?? null);
      setActivity(a ?? null);
    } catch (e: any) {
      setError(e?.message ? String(e.message) : "Не удалось загрузить отчёт.");
    } finally {
      setIsLoading(false);
    }
  }, [authToken, timeRange]);

  const playAnims = useCallback(() => {
    portfolioAnim.play();
    growthAnim.play();
    categoriesAnim.play();
    topAnim.play();

    donutSpin.setValue(0);
    Animated.timing(donutSpin, {
      toValue: 1,
      duration: 900,
      useNativeDriver: true,
    }).start();

    barsProgress.setValue(0);
    Animated.timing(barsProgress, {
      toValue: 1,
      duration: 650,
      useNativeDriver: true,
    }).start();
  }, [barsProgress, categoriesAnim, donutSpin, growthAnim, portfolioAnim, topAnim]);

  useEffect(() => {
    playAnims();
  }, [playAnims, timeRange]);

  useFocusEffect(
    useCallback(() => {
      void refreshStatsFromApi();
      return undefined;
    }, [refreshStatsFromApi]),
  );

  const donutRotation = donutSpin.interpolate({
    inputRange: [0, 1],
    outputRange: ["-22deg", "0deg"],
  });

  return (
    <View style={styles.root}>
      <OfflineBanner isOffline={isOffline} />
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.h1}>Отчёты и аналитика</Text>
        <View style={styles.filterRow}>
          <View style={styles.pillsWrap}>
            {(["week", "month", "year"] as const).map((range) => (
              <TouchableOpacity
                key={range}
                onPress={() => setTimeRange(range)}
                style={[styles.pill, timeRange === range ? styles.pillOn : styles.pillOff]}
              >
                <Text style={[styles.pillText, timeRange === range && styles.pillTextOn]}>
                  {rangeLabel(range)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.filterIcon} onPress={() => setFilterOpen(true)} accessibilityLabel="Фильтр разделов">
            <Filter size={16} color={theme.mutedForeground} />
          </TouchableOpacity>
        </View>
      </View>

      <TabAwareScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 96, gap: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {error ? <ErrorState message={error} onRetry={refreshStatsFromApi} /> : null}
        {isLoading ? <LoadingState /> : null}
        {!isLoading && !error ? (
          <>
            {sections.portfolioCard ? (
              <Animated.View
                style={[
                  styles.card,
                  {
                    opacity: portfolioAnim.opacity,
                    transform: [
                      { translateY: portfolioAnim.translateY },
                      { scale: portfolioAnim.scale },
                    ],
                  },
                ]}
              >
                <Text style={styles.cardKicker}>Общая стоимость по вашим коллекциям</Text>
                <Text style={styles.bigValue}>
                  {formatMoney(Number(summary?.total_value_usd ?? summary?.totalValueUsd ?? 0) || 0)}
                </Text>
                <View style={styles.trendRow}>
                  <Text style={styles.vs}>
                    {Number(summary?.collections ?? summary?.collections_count ?? 0) || 0} коллекций •{" "}
                    {Number(summary?.items ?? summary?.items_count ?? 0) || 0} предметов •{" "}
                    {Number(summary?.wishlist ?? summary?.wishlist_count ?? 0) || 0} желаний
                  </Text>
                </View>
              </Animated.View>
            ) : null}

            {sections.growthChart ? (
              <Animated.View
                style={[
                  styles.card,
                  {
                    opacity: growthAnim.opacity,
                    transform: [{ translateY: growthAnim.translateY }, { scale: growthAnim.scale }],
                  },
                ]}
              >
                <Text style={styles.cardTitle}>Изменения за период</Text>
                <View style={styles.chartArea}>
                  {series.map((d: any) => {
                    const h = Math.round((d.items / maxBar) * 160);
                    return (
                      <View key={d.label} style={styles.barCol}>
                        <Animated.View style={[styles.bar, { height: h, transform: [{ scaleY: barsProgress }] }]} />
                        <Text style={styles.barLabel}>{d.label}</Text>
                      </View>
                    );
                  })}
                </View>
              </Animated.View>
            ) : null}

            {sections.categories ? (
              <Animated.View
                style={[
                  styles.card,
                  {
                    opacity: categoriesAnim.opacity,
                    transform: [{ translateY: categoriesAnim.translateY }, { scale: categoriesAnim.scale }],
                  },
                ]}
              >
                <Text style={styles.cardTitle}>Распределение активности</Text>
                <View style={styles.pieRow}>
                  <View style={styles.pieWrap}>
                    <Animated.View style={{ transform: [{ rotate: donutRotation }] }}>
                      <DonutChart data={donutData} size={140} />
                    </Animated.View>
                  </View>
                  <View style={styles.legend}>
                    {donutLegend.map((s) => (
                      <View key={s.label} style={styles.legendRow}>
                        <View style={styles.legendLeft}>
                          <View style={[styles.dot, { backgroundColor: s.color }]} />
                          <Text style={styles.legendName} numberOfLines={1}>
                            {s.label}
                          </Text>
                        </View>
                        <Text style={styles.legendVal}>{s.value}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </Animated.View>
            ) : null}

            {sections.topPerformers ? (
              <Animated.View
                style={[
                  styles.card,
                  {
                    opacity: topAnim.opacity,
                    transform: [{ translateY: topAnim.translateY }, { scale: topAnim.scale }],
                  },
                ]}
              >
                <Text style={styles.cardTitle}>Итоги по действиям</Text>
                <View style={{ gap: 10 }}>
                  <Text style={styles.vs}>
                    Лайки: {Number(summary?.likes ?? summary?.likes_count ?? 0) || 0}
                  </Text>
                  <Text style={styles.vs}>
                    Комментарии: {Number(summary?.comments ?? summary?.comments_count ?? 0) || 0}
                  </Text>
                  <Text style={styles.vs}>
                    В желаниях: {Number(summary?.wishlist ?? summary?.wishlist_count ?? 0) || 0}
                  </Text>
                </View>
              </Animated.View>
            ) : null}
          </>
        ) : null}

        <TouchableOpacity
          style={[styles.exportBtn, isOffline && { opacity: 0.5 }]}
          disabled={isOffline}
          activeOpacity={0.9}
          onPress={handleExport}
        >
          <Calendar size={20} color={theme.primaryForeground} style={{ marginRight: 8 }} />
          <Text style={styles.exportText}>
              {isOffline ? "Офлайн — нельзя экспортировать" : "Экспорт CSV (поделиться)"}
          </Text>
        </TouchableOpacity>
      </TabAwareScrollView>

      <Modal visible={filterOpen} animationType="fade" transparent>
        <Pressable style={styles.modalBackdrop} onPress={() => setFilterOpen(false)}>
          <Pressable style={[styles.filterSheet, { paddingBottom: Math.max(insets.bottom, 16) }]} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.filterSheetTitle}>Разделы отчёта</Text>
            <Text style={styles.filterSheetSub}>Включите блоки для экрана и экспорта</Text>
            <FilterToggle
              label="Стоимость портфеля"
              on={sections.portfolioCard}
              onToggle={() => toggleSection("portfolioCard")}
            />
            <FilterToggle
              label="Рост портфеля (график)"
              on={sections.growthChart}
              onToggle={() => toggleSection("growthChart")}
            />
            <FilterToggle
              label="По категориям"
              on={sections.categories}
              onToggle={() => toggleSection("categories")}
            />
            <FilterToggle
              label="Лучшая динамика"
              on={sections.topPerformers}
              onToggle={() => toggleSection("topPerformers")}
            />
            {!allEnabled ? (
              <TouchableOpacity style={styles.enableAllBtn} onPress={enableAll} activeOpacity={0.88}>
                <Text style={styles.enableAllText}>Включить все разделы</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity style={styles.filterClose} onPress={() => setFilterOpen(false)} activeOpacity={0.88}>
              <Text style={styles.filterCloseText}>Готово</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <BottomNav />
    </View>
  );
}

interface FilterToggleProps {
  label: string;
  on: boolean;
  onToggle: () => void;
}

function FilterToggle({ label, on, onToggle }: FilterToggleProps) {
  return (
    <TouchableOpacity style={styles.toggleRow} onPress={onToggle} activeOpacity={0.85}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <View style={[styles.togglePill, on && styles.togglePillOn]}>
        <Text style={[styles.togglePillText, on && styles.togglePillTextOn]}>{on ? "Вкл" : "Выкл"}</Text>
      </View>
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
  h1: { fontSize: 20, fontWeight: "600", color: theme.foreground, marginBottom: 12 },
  filterRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  pillsWrap: { flex: 1, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.radiusLg,
  },
  pillOn: { backgroundColor: theme.primary },
  pillOff: {
    backgroundColor: theme.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
  },
  pillText: { fontSize: 12, fontWeight: "600", color: theme.mutedForeground },
  pillTextOn: { color: theme.primaryForeground },
  filterIcon: {
    padding: 10,
    borderRadius: theme.radiusLg,
    backgroundColor: theme.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
  },
  card: {
    backgroundColor: theme.card,
    borderRadius: theme.radiusXl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
    padding: 16,
  },
  cardKicker: { fontSize: 12, color: theme.mutedForeground, marginBottom: 4 },
  bigValue: { fontSize: 26, fontWeight: "700", color: theme.foreground, marginBottom: 8 },
  trendRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  trend: { flexDirection: "row", alignItems: "center", gap: 4 },
  trendText: { fontSize: 14, fontWeight: "600" },
  vs: { fontSize: 12, color: theme.mutedForeground },
  cardTitle: { fontSize: 14, fontWeight: "600", color: theme.foreground, marginBottom: 16 },
  chartArea: {
    height: 200,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 6,
  },
  barCol: { flex: 1, alignItems: "center" },
  bar: {
    width: "100%",
    backgroundColor: theme.primary,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    minHeight: 8,
    transformOrigin: "bottom" as any,
  },
  barLabel: { marginTop: 8, fontSize: 11, color: theme.mutedForeground },
  table: { flexDirection: "column", gap: 10 },
  tableRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    paddingVertical: 6,
  },
  tableLabel: { width: 70, fontSize: 12, fontWeight: "700", color: theme.mutedForeground },
  tableCell: { flex: 1, fontSize: 12, color: theme.foreground },
  tableTotal: { width: 60, fontSize: 12, fontWeight: "800", color: theme.primary, textAlign: "right" },
  pieRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  pieWrap: { width: "42%", alignItems: "center" },
  legend: { flex: 1, gap: 8 },
  legendRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  legendLeft: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1, minWidth: 0 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendName: { fontSize: 12, color: theme.mutedForeground, flex: 1 },
  legendVal: { fontSize: 12, fontWeight: "600", color: theme.foreground },
  perfRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  perfLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1, minWidth: 0 },
  rank: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(212,175,55,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  rankText: { fontSize: 12, fontWeight: "700", color: theme.primary },
  perfName: { fontSize: 12, fontWeight: "600", color: theme.foreground },
  perfSub: { fontSize: 12, color: theme.mutedForeground, marginTop: 2 },
  perfTrend: { flexDirection: "row", alignItems: "center", gap: 4 },
  perfPct: { fontSize: 12, fontWeight: "600", color: theme.primary },
  exportBtn: {
    minHeight: 48,
    borderRadius: theme.radiusLg,
    backgroundColor: theme.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  exportText: { color: theme.primaryForeground, fontWeight: "600", fontSize: 15, textAlign: "center", flex: 1 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  filterSheet: {
    backgroundColor: theme.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  filterSheetTitle: { fontSize: 18, fontWeight: "600", color: theme.foreground },
  filterSheetSub: { fontSize: 13, color: theme.mutedForeground, marginBottom: 16, marginTop: 4 },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border,
  },
  toggleLabel: { fontSize: 15, color: theme.foreground, flex: 1 },
  togglePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radiusLg,
    backgroundColor: theme.muted,
  },
  togglePillOn: { backgroundColor: theme.primary },
  togglePillText: { fontSize: 12, fontWeight: "600", color: theme.mutedForeground },
  togglePillTextOn: { color: theme.primaryForeground },
  enableAllBtn: { marginTop: 12, alignItems: "center", paddingVertical: 12 },
  enableAllText: { fontSize: 14, fontWeight: "600", color: theme.primary },
  filterClose: { alignItems: "center", paddingVertical: 16 },
  filterCloseText: { fontSize: 16, fontWeight: "600", color: theme.foreground },
});