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
  TextInput,
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
import { useCollectionsStore } from "../context/collections-store-context";
import { useWishlist } from "../context/wishlist-context";
import { reportsCollectionsCsvApi, reportsItemsCsvApi, reportsSummaryCsvUnifiedApi } from "../api/vaultApi";
import { theme } from "../theme";

type TimeRange = "week" | "month" | "year";

interface ReportSections {
  portfolioCard: boolean;
  growthChart: boolean;
  categories: boolean;
  topPerformers: boolean;
}

type CsvMetric = "collections" | "items" | "likes" | "comments" | "wishlist";
type CsvSummaryRow = {
  period: TimeRange;
  date: string;
  metric: CsvMetric;
  value: number;
};

const defaultSections: ReportSections = {
  portfolioCard: true,
  growthChart: true,
  categories: true,
  topPerformers: true,
};

function formatDateLabel(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function toIsoRangeStart(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function toIsoRangeEnd(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

function atDateStart(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function sameDay(a: Date, b: Date) {
  return atDateStart(a).getTime() === atDateStart(b).getTime();
}

function isBetweenDays(target: Date, from: Date, to: Date) {
  const t = atDateStart(target).getTime();
  const f = atDateStart(from).getTime();
  const z = atDateStart(to).getTime();
  return t >= Math.min(f, z) && t <= Math.max(f, z);
}

function monthLabel(date: Date) {
  return date.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
}

function buildCalendarCells(viewMonth: Date) {
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<Date | null> = [];
  for (let i = 0; i < firstWeekday; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function withReportType(csv: string, reportType: "collections" | "items") {
  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return "";
  const [header, ...rows] = lines;
  const normalizedRows = rows.map((row) => `${reportType},${row}`);
  return [`report_type,${header}`, ...normalizedRows].join("\n");
}

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
  const { formatMoney, authToken } = useAppSettings();
  const { collectionsList } = useCollectionsStore();
  const { entries: wishlistEntries } = useWishlist();
  const [isOffline] = useState(false);
  const [timeRange] = useState<TimeRange>("week");
  const [filterOpen, setFilterOpen] = useState(false);
  const [sections, setSections] = useState<ReportSections>(defaultSections);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [csvRows, setCsvRows] = useState<CsvSummaryRow[]>([]);
  const [isExportRangeOpen, setIsExportRangeOpen] = useState(false);
  const [exportFromDate, setExportFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d;
  });
  const [exportToDate, setExportToDate] = useState(() => new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [rangeDraftFrom, setRangeDraftFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d;
  });
  const [rangeDraftTo, setRangeDraftTo] = useState(() => new Date());
  const [rangeStep, setRangeStep] = useState<"from" | "to">("from");

  const portfolioAnim = useEnterAnim(40);
  const growthAnim = useEnterAnim(80);
  const categoriesAnim = useEnterAnim(120);
  const topAnim = useEnterAnim(160);

  const donutSpin = useRef(new Animated.Value(0)).current;
  const barsProgress = useRef(new Animated.Value(0)).current;

  const rangeLabel = (r: TimeRange) => (r === "week" ? "7 дней" : r === "month" ? "30 дней" : "1 год");

  const series = useMemo(() => {
    const byDate = new Map<string, { date: string; items: number }>();
    for (const row of csvRows) {
      if (row.metric !== "items") continue;
      byDate.set(row.date, { date: row.date, items: row.value });
    }
    return [...byDate.values()]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((entry) => ({ label: entry.date, items: entry.items }));
  }, [csvRows]);

  const maxBar = useMemo(() => Math.max(1, ...series.map((d: any) => d.items)), [series]);

  const donutLegend = useMemo(() => {
    const sums = csvRows.reduce(
      (acc, row) => {
        acc[row.metric] += row.value;
        return acc;
      },
      { collections: 0, items: 0, likes: 0, comments: 0, wishlist: 0 },
    );

    const palette = [
      { label: "Коллекции", key: "collections" as const, color: theme.primary },
      { label: "Предметы", key: "items" as const, color: "rgba(212,175,55,0.95)" },
      { label: "Лайки", key: "likes" as const, color: "#C4A035" },
      { label: "Комментарии", key: "comments" as const, color: "#8A6F1C" },
      { label: "В желаниях", key: "wishlist" as const, color: "#5C4810" },
    ];

    return palette.map((p) => ({
      label: p.label,
      value: sums[p.key],
      color: p.color,
    }));
  }, [csvRows]);

  const donutData = useMemo(
    () =>
      donutLegend.map((d) => ({
        value: d.value,
        color: d.color,
      })),
    [donutLegend],
  );

  const portfolioCollections = collectionsList.length;
  const portfolioItems = collectionsList.reduce((sum, c) => sum + c.itemCount, 0);
  const portfolioTotalUsd = collectionsList.reduce((sum, c) => sum + c.totalValue, 0);
  const portfolioWishlist = wishlistEntries.length;

  const handleExport = useCallback(async () => {
    setIsExportRangeOpen(true);
  }, []);

  const runRangeExport = useCallback(async () => {
    try {
      if (authToken == null) {
        Alert.alert("Нужен вход", "Экспорт отчётов доступен после входа.");
        return;
      }
      const parsedFrom = atDateStart(exportFromDate);
      const parsedTo = atDateStart(exportToDate);
      if (parsedFrom > parsedTo) {
        Alert.alert("Неверный диапазон", "Дата 'С' не может быть позже даты 'По'.");
        return;
      }
      setExportFromDate(parsedFrom);
      setExportToDate(parsedTo);
      const fromDate = toIsoRangeStart(parsedFrom);
      const toDate = toIsoRangeEnd(parsedTo);
      const [collectionsCsv, itemsCsv] = await Promise.all([
        reportsCollectionsCsvApi({ token: authToken, fromDate, toDate }),
        reportsItemsCsvApi({ token: authToken, fromDate, toDate }),
      ]);
      const csv = [withReportType(collectionsCsv, "collections"), withReportType(itemsCsv, "items")]
        .filter(Boolean)
        .join("\n");
      if (!csv.trim()) {
        Alert.alert("Нет данных", "За выбранный период отчёт пуст.");
        return;
      }
      const fileLabel = `${formatDateLabel(parsedFrom)}_${formatDateLabel(parsedTo)}`;
      setIsExportRangeOpen(false);

      if (Platform.OS === "web") {
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `report_${fileLabel}.csv`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 800);
        return;
      }

      const FileSystem = await import("expo-file-system/legacy");
      const Sharing = await import("expo-sharing");

      const baseDir = FileSystem.documentDirectory ?? FileSystem.cacheDirectory;
      if (!baseDir) {
        await Share.share({ title: "Экспорт CSV", message: csv });
        return;
      }

      const fileUri = `${baseDir}report_${fileLabel}.csv`;
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
  }, [authToken, exportFromDate, exportToDate]);

  const openRangeCalendar = useCallback(() => {
    setRangeDraftFrom(exportFromDate);
    setRangeDraftTo(exportToDate);
    setCalendarMonth(exportFromDate);
    setRangeStep("from");
    setIsCalendarOpen(true);
  }, [exportFromDate, exportToDate]);

  const onSelectCalendarDate = useCallback((date: Date) => {
    if (rangeStep === "from") {
      setRangeDraftFrom(date);
      setRangeDraftTo(date);
      setRangeStep("to");
      return;
    }
    if (date < rangeDraftFrom) {
      setRangeDraftFrom(date);
      setRangeDraftTo(rangeDraftFrom);
    } else {
      setRangeDraftTo(date);
    }
  }, [rangeDraftFrom, rangeStep]);

  const applyCalendarRange = useCallback(() => {
    setExportFromDate(rangeDraftFrom);
    setExportToDate(rangeDraftTo);
    setIsCalendarOpen(false);
  }, [rangeDraftFrom, rangeDraftTo]);

  const applyPreset = useCallback((preset: "7d") => {
    const today = atDateStart(new Date());
    if (preset === "7d") {
      const from = new Date(today);
      from.setDate(from.getDate() - 6);
      setRangeDraftFrom(from);
      setRangeDraftTo(today);
      setCalendarMonth(from);
      setRangeStep("to");
      return;
    }
  }, []);

  const calendarCells = useMemo(() => buildCalendarCells(calendarMonth), [calendarMonth]);

  const toggleSection = useCallback((key: keyof ReportSections) => {
    setSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const allEnabled = sections.portfolioCard && sections.growthChart && sections.categories && sections.topPerformers;

  const enableAll = useCallback(() => {
    setSections(defaultSections);
  }, []);

  const refreshStatsFromApi = useCallback(async () => {
    if (authToken == null) {
      setCsvRows([]);
      setIsLoading(false);
      setError(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const csv = await reportsSummaryCsvUnifiedApi({ token: authToken, period: timeRange });
      const parsedRows = csv
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(1)
        .map((line) => line.split(",").map((cell) => cell.trim()))
        .filter((parts) => parts.length >= 4)
        .map((parts) => ({
          period: parts[0] as TimeRange,
          date: parts[1],
          metric: parts[2] as CsvMetric,
          value: Number(parts[3]) || 0,
        }))
        .filter(
          (row) =>
            (row.period === "week" || row.period === "month" || row.period === "year") &&
            (row.metric === "collections" ||
              row.metric === "items" ||
              row.metric === "likes" ||
              row.metric === "comments" ||
              row.metric === "wishlist"),
        );
      setCsvRows(parsedRows);
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
            <View style={[styles.pill, styles.pillOn]}>
              <Text style={[styles.pillText, styles.pillTextOn]}>{rangeLabel("week")}</Text>
            </View>
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
                  {formatMoney(portfolioTotalUsd)}
                </Text>
                <View style={styles.trendRow}>
                  <Text style={styles.vs}>
                    {portfolioCollections} коллекций • {portfolioItems} предметов • {portfolioWishlist} желаний
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
                    Лайки: {donutLegend.find((d) => d.label === "Лайки")?.value ?? 0}
                  </Text>
                  <Text style={styles.vs}>
                    Комментарии: {donutLegend.find((d) => d.label === "Комментарии")?.value ?? 0}
                  </Text>
                  <Text style={styles.vs}>
                    В желаниях: {donutLegend.find((d) => d.label === "В желаниях")?.value ?? 0}
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
      <Modal visible={isExportRangeOpen} animationType="fade" transparent>
        <Pressable style={styles.modalBackdrop} onPress={() => setIsExportRangeOpen(false)}>
          <Pressable style={[styles.filterSheet, { paddingBottom: Math.max(insets.bottom, 16) }]} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.filterSheetTitle}>Экспорт CSV</Text>
            <Text style={styles.filterSheetSub}>Выберите диапазон дат отчёта</Text>
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>С даты</Text>
              <Text style={styles.togglePillTextOn}>{formatDateLabel(exportFromDate)}</Text>
            </View>
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>По дату</Text>
              <Text style={styles.togglePillTextOn}>{formatDateLabel(exportToDate)}</Text>
            </View>
            <TouchableOpacity style={styles.enableAllBtn} onPress={openRangeCalendar} activeOpacity={0.88}>
              <Text style={styles.enableAllText}>Открыть календарь</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.enableAllBtn} onPress={() => void runRangeExport()} activeOpacity={0.88}>
              <Text style={styles.enableAllText}>Скачать CSV</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.filterClose} onPress={() => setIsExportRangeOpen(false)} activeOpacity={0.88}>
              <Text style={styles.filterCloseText}>Отмена</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
      <Modal visible={isCalendarOpen} animationType="fade" transparent>
        <Pressable style={styles.modalBackdrop} onPress={() => setIsCalendarOpen(false)}>
          <Pressable style={[styles.filterSheet, { paddingBottom: Math.max(insets.bottom, 16) }]} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.filterSheetTitle}>Календарь периода</Text>
            <Text style={styles.filterSheetSub}>
              {rangeStep === "from" ? "Выберите дату начала" : "Выберите дату конца"}
            </Text>
            <View style={styles.presetRow}>
              <TouchableOpacity style={styles.presetBtn} onPress={() => applyPreset("7d")} activeOpacity={0.88}>
                <Text style={styles.presetBtnText}>7 дней</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.calendarNavRow}>
              <TouchableOpacity
                style={styles.calendarNavBtn}
                onPress={() => setCalendarMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
                activeOpacity={0.85}
              >
                <Text style={styles.calendarNavBtnText}>{"<"}</Text>
              </TouchableOpacity>
              <Text style={styles.calendarMonthText}>{monthLabel(calendarMonth)}</Text>
              <TouchableOpacity
                style={styles.calendarNavBtn}
                onPress={() => setCalendarMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
                activeOpacity={0.85}
              >
                <Text style={styles.calendarNavBtnText}>{">"}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.calendarWeekHeader}>
              {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((d) => (
                <Text key={d} style={styles.calendarWeekCell}>{d}</Text>
              ))}
            </View>
            <View style={styles.calendarGrid}>
              {calendarCells.map((d, idx) => {
                if (!d) return <View key={`empty-${idx}`} style={styles.calendarDayCell} />;
                const selectedStart = sameDay(d, rangeDraftFrom);
                const selectedEnd = sameDay(d, rangeDraftTo);
                const inRange = isBetweenDays(d, rangeDraftFrom, rangeDraftTo);
                return (
                  <TouchableOpacity
                    key={d.toISOString()}
                    style={[
                      styles.calendarDayCell,
                      inRange && styles.calendarDayInRange,
                      (selectedStart || selectedEnd) && styles.calendarDaySelected,
                    ]}
                    onPress={() => onSelectCalendarDate(d)}
                    activeOpacity={0.85}
                  >
                    <Text
                      style={[
                        styles.calendarDayText,
                        (selectedStart || selectedEnd) && styles.calendarDayTextSelected,
                      ]}
                    >
                      {d.getDate()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>С</Text>
              <Text style={styles.togglePillTextOn}>{formatDateLabel(rangeDraftFrom)}</Text>
            </View>
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>По</Text>
              <Text style={styles.togglePillTextOn}>{formatDateLabel(rangeDraftTo)}</Text>
            </View>
            <TouchableOpacity style={styles.enableAllBtn} onPress={applyCalendarRange} activeOpacity={0.88}>
              <Text style={styles.enableAllText}>Применить</Text>
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
  dateInput: {
    minWidth: 132,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
    borderRadius: theme.radiusLg,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: theme.foreground,
    fontSize: 13,
    textAlign: "right",
  },
  calendarNavRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  calendarNavBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
    backgroundColor: theme.background,
  },
  calendarNavBtnText: { color: theme.foreground, fontWeight: "700" },
  calendarMonthText: { fontSize: 14, fontWeight: "700", color: theme.foreground },
  calendarWeekHeader: { flexDirection: "row", marginBottom: 6 },
  calendarWeekCell: { flex: 1, textAlign: "center", fontSize: 11, color: theme.mutedForeground },
  calendarGrid: { flexDirection: "row", flexWrap: "wrap", marginBottom: 10 },
  calendarDayCell: {
    width: "14.285%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  calendarDayInRange: { backgroundColor: "rgba(212,175,55,0.10)" },
  calendarDaySelected: { backgroundColor: theme.primary },
  calendarDayText: { fontSize: 13, color: theme.foreground },
  calendarDayTextSelected: { color: theme.primaryForeground, fontWeight: "700" },
  presetRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  presetBtn: {
    flex: 1,
    borderRadius: theme.radiusLg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
    backgroundColor: theme.background,
    paddingVertical: 8,
    alignItems: "center",
  },
  presetBtnText: { fontSize: 12, fontWeight: "600", color: theme.foreground },
  enableAllBtn: { marginTop: 12, alignItems: "center", paddingVertical: 12 },
  enableAllText: { fontSize: 14, fontWeight: "600", color: theme.primary },
  filterClose: { alignItems: "center", paddingVertical: 16 },
  filterCloseText: { fontSize: 16, fontWeight: "600", color: theme.foreground },
});