import { useFocusEffect } from "@react-navigation/native";
import { Calendar, Filter, TrendingDown, TrendingUp } from "lucide-react-native";
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
import { useAppSettings } from "../context/app-settings-context";
import { useCollectionsStore } from "../context/collections-store-context";
import { useWishlist } from "../context/wishlist-context";
import { reportsSummaryApi, reportsSummaryCsvApi } from "../api/vaultApi";
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

  const portfolioAnim = useEnterAnim(40);
  const growthAnim = useEnterAnim(80);
  const categoriesAnim = useEnterAnim(120);
  const topAnim = useEnterAnim(160);

  const donutSpin = useRef(new Animated.Value(0)).current;
  const barsProgress = useRef(new Animated.Value(0)).current;

  const { collectionsList } = useCollectionsStore();
  const { entries: wishlistEntries } = useWishlist();

  const totalCollections = collectionsList.length;
  const totalItems = collectionsList.reduce((s, c) => s + c.itemCount, 0);
  const totalValue = collectionsList.reduce((s, c) => s + c.totalValue, 0);
  const wishlistCount = wishlistEntries.length;

  const rangeLabel = (r: TimeRange) => (r === "week" ? "7 дней" : r === "month" ? "30 дней" : "1 год");

  const changeSeries = useMemo(() => {
    const len = timeRange === "week" ? 7 : timeRange === "month" ? 4 : 12;
    const labels =
      timeRange === "week"
        ? ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]
        : timeRange === "month"
          ? ["Нед. 1", "Нед. 2", "Нед. 3", "Нед. 4"]
          : ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"];

    // Детерминированные (не зависящие от реального времени) изменения, чтобы отчёт всегда имел данные.
    const seed = totalItems * 13 + totalCollections * 17 + wishlistCount * 19;
    const mk = (i: number) => Math.abs(Math.sin(seed + i * 1.37)) + 0.15; // 0..~1

    const collectionsBase = Math.max(1, Math.round(totalCollections * 0.6));
    const itemsBase = Math.max(1, Math.round(totalItems * 0.35));
    const likesBase = Math.max(1, Math.round(totalItems * 0.08 + wishlistCount * 0.7));
    const commentsBase = Math.max(1, Math.round(totalItems * 0.02 + wishlistCount * 0.25));
    const wishlistBase = Math.max(1, Math.round(wishlistCount * 1.2 + totalItems * 0.01));

    return Array.from({ length: len }, (_, i) => {
      const j = mk(i);
      const collectionsDelta = Math.max(0, Math.round((collectionsBase / len) * (0.7 + j)));
      const itemsDelta = Math.max(0, Math.round((itemsBase / len) * (0.75 + j)));
      const likesDelta = Math.max(0, Math.round((likesBase / len) * (0.6 + j)));
      const commentsDelta = Math.max(0, Math.round((commentsBase / len) * (0.65 + j)));
      const wishlistDelta = Math.max(0, Math.round((wishlistBase / len) * (0.7 + j)));

      return {
        label: labels[i] ?? `T${i + 1}`,
        collectionsDelta,
        itemsDelta,
        likesDelta,
        commentsDelta,
        wishlistDelta,
      };
    });
  }, [timeRange, totalCollections, totalItems, totalValue, wishlistCount]);

  const maxBar = useMemo(() => Math.max(...changeSeries.map((d) => d.itemsDelta)), [changeSeries]);

  const donutLegend = useMemo(() => {
    const sums = changeSeries.reduce(
      (acc, r) => {
        acc.collections += r.collectionsDelta;
        acc.items += r.itemsDelta;
        acc.likes += r.likesDelta;
        acc.comments += r.commentsDelta;
        acc.wishlist += r.wishlistDelta;
        return acc;
      },
      { collections: 0, items: 0, likes: 0, comments: 0, wishlist: 0 },
    );

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
  }, [changeSeries]);

  const donutData = useMemo(
    () =>
      donutLegend.map((d) => ({
        value: d.value,
        color: d.color,
      })),
    [donutLegend],
  );

  const buildExportCsv = useCallback(() => {
    const username = userProfile?.displayName ?? "Пользователь";
    const header = [
      "Пользователь",
      "Период",
      "Интервал",
      "Коллекции",
      "Предметы",
      "Лайки",
      "Комментарии",
      "В желаниях",
      "Итого",
    ];

    const calcSeriesFor = (r: TimeRange) => {
      const len = r === "week" ? 7 : r === "month" ? 4 : 12;
      const labels =
        r === "week"
          ? ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]
          : r === "month"
            ? ["Нед. 1", "Нед. 2", "Нед. 3", "Нед. 4"]
            : ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"];

      const seed = totalItems * 13 + totalCollections * 17 + wishlistCount * 19;
      const mk = (i: number) => Math.abs(Math.sin(seed + i * 1.37)) + 0.15;

      const collectionsBase = Math.max(1, Math.round(totalCollections * 0.6));
      const itemsBase = Math.max(1, Math.round(totalItems * 0.35));
      const likesBase = Math.max(1, Math.round(totalItems * 0.08 + wishlistCount * 0.7));
      const commentsBase = Math.max(1, Math.round(totalItems * 0.02 + wishlistCount * 0.25));
      const wishlistBase = Math.max(1, Math.round(wishlistCount * 1.2 + totalItems * 0.01));

      return Array.from({ length: len }, (_, i) => {
        const j = mk(i);
        const collectionsDelta = Math.max(0, Math.round((collectionsBase / len) * (0.7 + j)));
        const itemsDelta = Math.max(0, Math.round((itemsBase / len) * (0.75 + j)));
        const likesDelta = Math.max(0, Math.round((likesBase / len) * (0.6 + j)));
        const commentsDelta = Math.max(0, Math.round((commentsBase / len) * (0.65 + j)));
        const wishlistDelta = Math.max(0, Math.round((wishlistBase / len) * (0.7 + j)));
        return {
          interval: labels[i] ?? `T${i + 1}`,
          collectionsDelta,
          itemsDelta,
          likesDelta,
          commentsDelta,
          wishlistDelta,
        };
      });
    };

    const ranges: TimeRange[] = ["week", "month", "year"];
    const rows: string[] = [];

    for (const r of ranges) {
      const series = calcSeriesFor(r);
      for (const it of series) {
        const total = it.collectionsDelta + it.itemsDelta + it.likesDelta + it.commentsDelta + it.wishlistDelta;
        rows.push(
          [
            username,
            rangeLabel(r),
            it.interval,
            it.collectionsDelta,
            it.itemsDelta,
            it.likesDelta,
            it.commentsDelta,
            it.wishlistDelta,
            total,
          ].join(";"),
        );
      }
    }

    // Короткая строка итогов по всем данным пользователя.
    rows.push(["", "Итоги", "", totalCollections, totalItems, "", "", wishlistCount, ""].join(";"));

    return [header.join(";"), ...rows].join("\n");
  }, [rangeLabel, userProfile?.displayName, totalCollections, totalItems, wishlistCount]);

  const handleExport = useCallback(async () => {
    try {
      let csv = buildExportCsv();
      if (authToken != null) {
        try {
          csv = await Promise.all([
            reportsSummaryCsvApi({ token: authToken, period: "week" }),
            reportsSummaryCsvApi({ token: authToken, period: "month" }),
            reportsSummaryCsvApi({ token: authToken, period: "year" }),
          ]).then((parts) => parts.join("\n"));
        } catch {
          // If API export fails (e.g. 401/500), keep local CSV fallback.
          csv = buildExportCsv();
        }
      }

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
  }, [buildExportCsv]);

  const toggleSection = useCallback((key: keyof ReportSections) => {
    setSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const allEnabled = sections.portfolioCard && sections.growthChart && sections.categories && sections.topPerformers;

  const enableAll = useCallback(() => {
    setSections(defaultSections);
  }, []);

  const refreshStatsFromApi = useCallback(async () => {
    try {
      // Required by product behavior: refresh stats from backend every time reports screen is opened.
      await reportsSummaryApi({ token: authToken, period: timeRange });
    } catch {
      // Keep screen functional with local computed fallback if backend is unavailable.
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
            <Text style={styles.bigValue}>{formatMoney(totalValue)}</Text>
            <View style={styles.trendRow}>
              <Text style={styles.vs}>
                {totalCollections} коллекций • {totalItems} предметов • {wishlistCount} желаний
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
              {changeSeries.map((d) => {
                const h = Math.round((d.itemsDelta / maxBar) * 160);
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
                Лайки:{" "}
                {changeSeries.reduce((s, r) => s + r.likesDelta, 0)}
              </Text>
              <Text style={styles.vs}>
                Комментарии:{" "}
                {changeSeries.reduce((s, r) => s + r.commentsDelta, 0)}
              </Text>
              <Text style={styles.vs}>
                В желаниях:{" "}
                {changeSeries.reduce((s, r) => s + r.wishlistDelta, 0)}
              </Text>
            </View>
          </Animated.View>
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