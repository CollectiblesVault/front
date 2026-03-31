import { Plus, Timer, Gavel } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { createBidApi, createLotApi, getLotsApi } from "../api/vaultApi";
import { BottomNav } from "../components/BottomNav";
import { ErrorState } from "../components/ErrorState";
import { OfflineBanner } from "../components/OfflineBanner";
import { Skeleton } from "../components/Skeleton";
import { TabAwareScrollView } from "../components/TabAwareScrollView";
import { useAppSettings } from "../context/app-settings-context";
import { theme } from "../theme";

type LotRow = {
  id: number;
  name: string;
  description: string;
  currentPrice: number;
  step: number;
  endTime: string;
};

function toNumber(v: unknown, fallback = 0) {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number.parseFloat(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

export function AuctionScreen() {
  const insets = useSafeAreaInsets();
  const { authToken, canInteract, formatMoney } = useAppSettings();
  const [isOffline] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lots, setLots] = useState<LotRow[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftPrice, setDraftPrice] = useState("");
  const [draftStep, setDraftStep] = useState("");
  const [draftDesc, setDraftDesc] = useState("");
  const [bidMap, setBidMap] = useState<Record<number, string>>({});

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const raw = await getLotsApi();
      const next = (raw ?? []).map((l: any) => ({
        id: toNumber(l?.id ?? l?.lot_id, 0),
        name: String(l?.name ?? "Лот"),
        description: String(l?.description ?? ""),
        currentPrice: toNumber(l?.current_price ?? l?.start_price ?? l?.price, 0),
        step: toNumber(l?.step, 0),
        endTime: String(l?.end_time ?? ""),
      }));
      setLots(next.filter((x) => x.id > 0));
    } catch (e: any) {
      setError(e?.message ? String(e.message) : "Не удалось загрузить лоты.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const activeLots = useMemo(() => lots.length, [lots]);

  const createLot = async () => {
    if (!authToken || !canInteract) {
      Alert.alert("Нужен вход", "Создание лота доступно после входа.");
      return;
    }
    const name = draftName.trim();
    const start = toNumber(draftPrice, NaN);
    const step = toNumber(draftStep, NaN);
    if (!name || !Number.isFinite(start) || !Number.isFinite(step) || start <= 0 || step <= 0) {
      Alert.alert("Проверьте данные", "Укажите название, стартовую цену и шаг.");
      return;
    }
    const end = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    try {
      await createLotApi({
        token: authToken,
        name,
        start_price: start,
        step,
        end_time: end,
        description: draftDesc.trim() || null,
      });
      setCreateOpen(false);
      setDraftName("");
      setDraftPrice("");
      setDraftStep("");
      setDraftDesc("");
      await load();
    } catch (e: any) {
      Alert.alert("Ошибка", e?.message ? String(e.message) : "Не удалось создать лот.");
    }
  };

  const placeBid = async (lot: LotRow) => {
    if (!authToken || !canInteract) {
      Alert.alert("Нужен вход", "Ставки доступны после входа.");
      return;
    }
    const raw = bidMap[lot.id] ?? "";
    const amount = toNumber(raw, NaN);
    if (!Number.isFinite(amount) || amount <= 0) {
      Alert.alert("Проверьте ставку", "Введите сумму ставки.");
      return;
    }
    try {
      await createBidApi({ token: authToken, lot_id: lot.id, amount });
      setBidMap((prev) => ({ ...prev, [lot.id]: "" }));
      await load();
    } catch (e: any) {
      Alert.alert("Ставка не принята", e?.message ? String(e.message) : "Попробуйте ещё раз.");
    }
  };

  return (
    <View style={styles.root}>
      <OfflineBanner isOffline={isOffline} />
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View>
          <Text style={styles.h1}>Аукцион</Text>
          <Text style={styles.sub}>{activeLots} активных лотов</Text>
        </View>
        <TouchableOpacity style={styles.createBtn} onPress={() => setCreateOpen(true)} activeOpacity={0.9}>
          <Plus size={16} color={theme.primaryForeground} />
        </TouchableOpacity>
      </View>

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <TabAwareScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 96, gap: 12 }}>
          {isLoading ? (
            [0, 1, 2].map((i) => (
              <View key={i} style={styles.card}>
                <Skeleton style={{ height: 14, width: "55%" }} />
                <Skeleton style={{ height: 10, width: "80%", marginTop: 10 }} />
                <Skeleton style={{ height: 10, width: "40%", marginTop: 10 }} />
                <Skeleton style={{ height: 44, width: "100%", marginTop: 12 }} />
              </View>
            ))
          ) : lots.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Gavel size={28} color={theme.mutedForeground} />
              <Text style={styles.emptyText}>Лотов пока нет</Text>
            </View>
          ) : (
            lots.map((lot) => (
              <View key={lot.id} style={styles.card}>
                <Text style={styles.title}>{lot.name}</Text>
                {!!lot.description && <Text style={styles.desc}>{lot.description}</Text>}
                <View style={styles.metaRow}>
                  <Text style={styles.price}>{formatMoney(lot.currentPrice)}</Text>
                  <View style={styles.timeRow}>
                    <Timer size={14} color={theme.mutedForeground} />
                    <Text style={styles.timeText}>{lot.endTime ? new Date(lot.endTime).toLocaleString() : "—"}</Text>
                  </View>
                </View>
                <View style={styles.bidRow}>
                  <TextInput
                    value={bidMap[lot.id] ?? ""}
                    onChangeText={(v) => setBidMap((prev) => ({ ...prev, [lot.id]: v }))}
                    placeholder={`Мин. +${formatMoney(lot.step || 1)}`}
                    placeholderTextColor={theme.mutedForeground}
                    keyboardType="decimal-pad"
                    style={styles.bidInput}
                  />
                  <TouchableOpacity style={styles.bidBtn} onPress={() => void placeBid(lot)} activeOpacity={0.88}>
                    <Text style={styles.bidBtnText}>Ставка</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </TabAwareScrollView>
      )}

      <Modal visible={createOpen} transparent animationType="fade">
        <Pressable style={styles.modalBg} onPress={() => setCreateOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>Новый лот</Text>
            <TextInput value={draftName} onChangeText={setDraftName} style={styles.input} placeholder="Название" placeholderTextColor={theme.mutedForeground} />
            <TextInput value={draftPrice} onChangeText={setDraftPrice} style={styles.input} placeholder="Стартовая цена" keyboardType="decimal-pad" placeholderTextColor={theme.mutedForeground} />
            <TextInput value={draftStep} onChangeText={setDraftStep} style={styles.input} placeholder="Шаг ставки" keyboardType="decimal-pad" placeholderTextColor={theme.mutedForeground} />
            <TextInput value={draftDesc} onChangeText={setDraftDesc} style={[styles.input, { minHeight: 76 }]} placeholder="Описание (опц.)" placeholderTextColor={theme.mutedForeground} multiline />
            <TouchableOpacity style={styles.submitBtn} onPress={() => void createLot()} activeOpacity={0.9}>
              <Text style={styles.submitBtnText}>Создать лот</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.background },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  h1: { fontSize: 20, fontWeight: "600", color: theme.foreground },
  sub: { fontSize: 13, color: theme.mutedForeground, marginTop: 4 },
  createBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: theme.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    backgroundColor: theme.card,
    borderRadius: theme.radiusXl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
    padding: 14,
  },
  title: { fontSize: 15, fontWeight: "700", color: theme.foreground },
  desc: { fontSize: 12, color: theme.mutedForeground, marginTop: 6, lineHeight: 18 },
  metaRow: { marginTop: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  price: { fontSize: 15, fontWeight: "700", color: theme.primary },
  timeRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  timeText: { fontSize: 11, color: theme.mutedForeground },
  bidRow: { marginTop: 12, flexDirection: "row", gap: 10, alignItems: "center" },
  bidInput: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
    borderRadius: theme.radiusLg,
    paddingHorizontal: 10,
    paddingVertical: 10,
    color: theme.foreground,
    fontSize: 14,
    backgroundColor: theme.background,
  },
  bidBtn: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: theme.radiusLg,
    backgroundColor: theme.primary,
  },
  bidBtnText: { color: theme.primaryForeground, fontWeight: "700", fontSize: 13 },
  emptyWrap: { alignItems: "center", justifyContent: "center", paddingVertical: 40, gap: 8 },
  emptyText: { color: theme.mutedForeground, fontSize: 14 },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "center", padding: 20 },
  sheet: {
    backgroundColor: theme.card,
    borderRadius: theme.radiusXl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
    padding: 16,
  },
  sheetTitle: { fontSize: 17, fontWeight: "600", color: theme.foreground, marginBottom: 12 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
    borderRadius: theme.radiusLg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: theme.foreground,
    fontSize: 14,
    marginBottom: 10,
    backgroundColor: theme.background,
  },
  submitBtn: {
    marginTop: 6,
    backgroundColor: theme.primary,
    borderRadius: theme.radiusLg,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  submitBtnText: { color: theme.primaryForeground, fontSize: 14, fontWeight: "700" },
});

