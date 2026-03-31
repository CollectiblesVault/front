import { Clock3, Gavel, Plus } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Polyline } from "react-native-svg";

import { closeLotApi, createBidApi, createLotApi, getLotBidsApi, getLotsApi, settleExpiredLotsApi } from "../api/vaultApi";
import { BottomNav } from "../components/BottomNav";
import { ErrorState } from "../components/ErrorState";
import { ImageWithFallback } from "../components/ImageWithFallback";
import { OfflineBanner } from "../components/OfflineBanner";
import { Skeleton } from "../components/Skeleton";
import { TabAwareScrollView } from "../components/TabAwareScrollView";
import { useAppSettings } from "../context/app-settings-context";
import { useCollectionsStore } from "../context/collections-store-context";
import { theme } from "../theme";

type LotRow = {
  id: number;
  name: string;
  description: string;
  category: string;
  imageUrl: string;
  currentPrice: number;
  step: number;
  endTime: string;
  bidsCount: number;
  myBid: number;
  isCompleted: boolean;
  bidHistory: AuctionBidPoint[];
  transferredTo?: string | null;
  collectionId?: number | null;
};

type AuctionBidPoint = {
  price: number;
  time: string;
  bidderName: string;
  bidderAvatar?: string;
  bidderId?: number | null;
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
  const { authToken, canInteract, formatMoney, userProfile, walletBalance, setWalletBalance } = useAppSettings();
  const { collectionsList, itemsForCollection } = useCollectionsStore();
  const [isOffline] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lots, setLots] = useState<LotRow[]>([]);
  const [tab, setTab] = useState<"active" | "completed">("active");
  const [createOpen, setCreateOpen] = useState(false);
  const [chartLot, setChartLot] = useState<LotRow | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftPrice, setDraftPrice] = useState("");
  const [draftStep, setDraftStep] = useState("");
  const [draftDesc, setDraftDesc] = useState("");
  const [draftDurationDays, setDraftDurationDays] = useState("2");
  const [draftCollectionId, setDraftCollectionId] = useState<number | null>(null);
  const [draftItemId, setDraftItemId] = useState<number | null>(null);
  const [collectionPickerOpen, setCollectionPickerOpen] = useState(false);
  const [itemPickerOpen, setItemPickerOpen] = useState(false);
  const [durationPickerOpen, setDurationPickerOpen] = useState(false);
  const [durationDraft, setDurationDraft] = useState("2");
  const [bidMap, setBidMap] = useState<Record<number, string>>({});

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (authToken) {
        void settleExpiredLotsApi({ token: authToken }).catch(() => {});
      }
      const raw = await getLotsApi();
      const next = await Promise.all((raw ?? []).map(async (l: any) => {
        const lotId = toNumber(l?.id ?? l?.lot_id, 0);
        let bidHistory: AuctionBidPoint[] = [];
        if (Array.isArray(l?.bid_history)) {
          bidHistory = l.bid_history
            .map((b: any) => ({
              price: toNumber(b?.price ?? b?.amount, 0),
              time: String(b?.time ?? b?.created_at ?? ""),
              bidderName: String(b?.bidder_name ?? b?.user_name ?? "Bidder"),
              bidderAvatar: typeof b?.bidder_avatar === "string" ? b.bidder_avatar : undefined,
              bidderId: Number.isFinite(toNumber(b?.bidder_id, NaN)) ? toNumber(b?.bidder_id, NaN) : null,
            }))
            .filter((b: AuctionBidPoint) => b.price > 0);
        } else if (lotId > 0) {
          try {
            const bids = await getLotBidsApi({ lotId, token: authToken });
            bidHistory = (bids ?? [])
              .map((b: any) => ({
                price: toNumber(b?.price ?? b?.amount, 0),
                time: String(b?.time ?? b?.created_at ?? ""),
                bidderName: String(b?.bidder_name ?? b?.user_name ?? "Bidder"),
                bidderAvatar: typeof b?.bidder_avatar === "string" ? b.bidder_avatar : undefined,
                bidderId: Number.isFinite(toNumber(b?.bidder_id, NaN)) ? toNumber(b?.bidder_id, NaN) : null,
              }))
              .filter((b: AuctionBidPoint) => b.price > 0);
          } catch {
            bidHistory = [];
          }
        }
        if (bidHistory.length === 0) {
          bidHistory = [
            {
              price: toNumber(l?.start_price ?? l?.price ?? 0, 0),
              time: String(l?.created_at ?? new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()),
              bidderName: "Start",
            },
            ...(toNumber(l?.current_price ?? l?.start_price ?? 0, 0) > 0
              ? [
                  {
                    price: toNumber(l?.current_price ?? l?.start_price ?? 0, 0),
                    time: String(l?.updated_at ?? new Date().toISOString()),
                    bidderName: typeof l?.top_bidder_name === "string" ? l.top_bidder_name : "Bidder",
                  },
                ]
              : []),
          ];
        }
        return {
        id: toNumber(l?.id ?? l?.lot_id, 0),
        name: String(l?.name ?? "Лот"),
        description: String(l?.description ?? ""),
        category: String(l?.category ?? "Collectibles"),
        imageUrl: String(l?.image_url ?? l?.image ?? ""),
        currentPrice: toNumber(l?.current_price ?? l?.start_price ?? l?.price, 0),
        step: toNumber(l?.step, 0),
        endTime: String(l?.end_time ?? ""),
        bidsCount: toNumber(l?.bids_count ?? l?.bids ?? 0),
        myBid: toNumber(l?.my_bid ?? 0),
        isCompleted: Boolean(l?.is_completed ?? l?.completed ?? false),
        collectionId: Number.isFinite(toNumber(l?.collection_id, NaN)) ? toNumber(l?.collection_id, NaN) : null,
        transferredTo: typeof l?.transferred_to === "string" ? l.transferred_to : null,
        bidHistory,
      };
      }));
      setLots(next.filter((x) => x.id > 0));
    } catch (e: any) {
      setError(e?.message ? String(e.message) : "Не удалось загрузить лоты.");
    } finally {
      setIsLoading(false);
    }
  }, [authToken]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const timer = setInterval(() => {
      const expired = lots.filter((lot) => !lot.isCompleted && lot.endTime && new Date(lot.endTime).getTime() <= Date.now());
      if (expired.length === 0) return;
      if (!authToken) {
        void load();
        return;
      }
      void Promise.all(expired.map((lot) => closeLotApi({ lotId: lot.id, token: authToken }).catch(() => null))).then(() => {
        void load();
      });
    }, 30000);
    return () => clearInterval(timer);
  }, [authToken, load, lots]);

  const activeLots = useMemo(() => lots.filter((x) => !x.isCompleted), [lots]);
  const completedLots = useMemo(() => lots.filter((x) => x.isCompleted), [lots]);
  const shownLots = tab === "active" ? activeLots : completedLots;

  const leftTime = useCallback((iso: string) => {
    if (!iso) return "—";
    const diff = new Date(iso).getTime() - Date.now();
    if (diff <= 0) return "Ended";
    const mins = Math.floor(diff / (1000 * 60));
    const days = Math.floor(mins / (60 * 24));
    const hours = Math.floor((mins % (60 * 24)) / 60);
    const minutes = mins % 60;
    if (days > 0) return `${days}d ${hours}h left`;
    return `${hours}h ${minutes}m left`;
  }, []);

  const lotStatus = useCallback((lot: LotRow) => {
    if (lot.isCompleted) return { label: "Outbid", tone: "danger" as const };
    if (lot.myBid > 0 && lot.myBid >= lot.currentPrice) return { label: "Winning", tone: "warn" as const };
    return { label: "Watching", tone: "neutral" as const };
  }, []);

  const draftCollectionItems = useMemo(
    () => (draftCollectionId ? itemsForCollection(String(draftCollectionId)) : []),
    [draftCollectionId, itemsForCollection],
  );
  const selectedCollection = useMemo(
    () => collectionsList.find((c) => c.id === draftCollectionId) ?? null,
    [collectionsList, draftCollectionId],
  );
  const selectedItem = useMemo(
    () => draftCollectionItems.find((item) => item.id === draftItemId) ?? null,
    [draftCollectionItems, draftItemId],
  );

  const createLot = async () => {
    if (!authToken || !canInteract) {
      Alert.alert("Нужен вход", "Создание лота доступно после входа.");
      return;
    }
    const name = draftName.trim();
    const start = toNumber(draftPrice, NaN);
    const step = toNumber(draftStep, NaN);
    const durationDays = toNumber(draftDurationDays, NaN);
    const collectionId = toNumber(draftCollectionId, NaN);
    if (!Number.isFinite(collectionId) || collectionId <= 0) {
      Alert.alert("Проверьте данные", "Выберите коллекцию для продажи.");
      return;
    }
    if (
      !name ||
      !Number.isFinite(start) ||
      !Number.isFinite(step) ||
      !Number.isFinite(durationDays) ||
      start <= 0 ||
      step <= 0 ||
      durationDays <= 0
    ) {
      Alert.alert("Проверьте данные", "Укажите название, стартовую цену, шаг и длительность (в днях).");
      return;
    }
    const end = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();
    try {
      await createLotApi({
        token: authToken,
        name,
        collection_id: collectionId,
        ...(draftItemId ? { item_id: draftItemId } : {}),
        start_price: start,
        step,
        end_time: end,
        description: draftDesc.trim() || null,
      });
      setCreateOpen(false);
      setDraftName("");
      setDraftPrice("");
      setDraftStep("");
      setDraftDurationDays("2");
      setDurationDraft("2");
      setDraftDesc("");
      setDraftCollectionId(null);
      setDraftItemId(null);
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
    if (amount > walletBalance) {
      Alert.alert("Недостаточно средств", "Пополните кошелёк или уменьшите ставку.");
      return;
    }
    try {
      await createBidApi({ token: authToken, lot_id: lot.id, amount });
      const nowIso = new Date().toISOString();
      const bidderName = userProfile?.displayName?.trim() || "You";
      const bidderAvatar = userProfile?.avatarUrl;
      setLots((prev) =>
        prev.map((x) =>
          x.id !== lot.id
            ? x
            : {
                ...x,
                currentPrice: Math.max(x.currentPrice, amount),
                myBid: amount,
                bidsCount: x.bidsCount + 1,
                bidHistory: [...x.bidHistory, { price: amount, time: nowIso, bidderName, bidderAvatar }],
              },
        ),
      );
      setBidMap((prev) => ({ ...prev, [lot.id]: "" }));
      setWalletBalance(walletBalance - amount);
    } catch (e: any) {
      Alert.alert("Ставка не принята", e?.message ? String(e.message) : "Попробуйте ещё раз.");
    }
  };

  return (
    <View style={styles.root}>
      <OfflineBanner isOffline={isOffline} />
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View>
          <Text style={styles.h1}>Auctions</Text>
          <Text style={styles.sub}>{activeLots.length} active lots</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.walletBox}>
            <Text style={styles.walletLabel}>Wallet</Text>
            <Text style={styles.walletValue}>{formatMoney(walletBalance)}</Text>
          </View>
          <TouchableOpacity style={styles.createBtn} onPress={() => setCreateOpen(true)} activeOpacity={0.9}>
            <Plus size={16} color={theme.primaryForeground} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === "active" && styles.tabBtnOn]}
          onPress={() => setTab("active")}
          activeOpacity={0.9}
        >
          <Text style={[styles.tabBtnText, tab === "active" && styles.tabBtnTextOn]}>{`Active (${activeLots.length})`}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === "completed" && styles.tabBtnOn]}
          onPress={() => setTab("completed")}
          activeOpacity={0.9}
        >
          <Text style={[styles.tabBtnText, tab === "completed" && styles.tabBtnTextOn]}>{`Completed (${completedLots.length})`}</Text>
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
          ) : shownLots.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Gavel size={28} color={theme.mutedForeground} />
              <Text style={styles.emptyText}>No lots in this tab</Text>
            </View>
          ) : (
            shownLots.map((lot) => {
              const status = lotStatus(lot);
              return (
              <View key={lot.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <ImageWithFallback uri={lot.imageUrl} style={styles.lotThumb} borderRadius={12} />
                  <View style={styles.cardMain}>
                    <View style={styles.titleLine}>
                      <Text style={styles.title} numberOfLines={1}>{lot.name}</Text>
                      <View
                        style={[
                          styles.statusPill,
                          status.tone === "danger" && styles.statusPillDanger,
                          status.tone === "warn" && styles.statusPillWarn,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusPillText,
                            status.tone === "danger" && styles.statusPillTextDanger,
                            status.tone === "warn" && styles.statusPillTextWarn,
                          ]}
                        >
                          {status.label}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.categoryText}>{lot.category}</Text>
                    <View style={styles.timeRow}>
                      <Clock3 size={13} color={theme.mutedForeground} />
                      <Text style={styles.timeText}>{leftTime(lot.endTime)}</Text>
                      <Text style={styles.dotSep}>•</Text>
                      <Text style={styles.timeText}>{lot.bidsCount} bids</Text>
                    </View>
                    <View style={styles.bidsRow}>
                      <View>
                        <Text style={styles.metaLabel}>Current Bid</Text>
                        <Text style={styles.price}>{formatMoney(lot.currentPrice)}</Text>
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={styles.metaLabel}>Your Bid</Text>
                        <Text style={styles.myPrice}>{formatMoney(lot.myBid || 0)}</Text>
                      </View>
                    </View>
                  </View>
                </View>
                <TouchableOpacity style={styles.chartBtn} onPress={() => setChartLot(lot)} activeOpacity={0.88}>
                  <Text style={styles.chartBtnText}>График ставок</Text>
                </TouchableOpacity>
                {lot.isCompleted && lot.transferredTo ? (
                  <Text style={styles.transferText}>Transferred to: {lot.transferredTo}</Text>
                ) : null}
                {!lot.isCompleted ? (
                  <View style={styles.bidRow}>
                    <TextInput
                      value={bidMap[lot.id] ?? ""}
                      onChangeText={(v) => setBidMap((prev) => ({ ...prev, [lot.id]: v }))}
                      placeholder={`Min +${formatMoney(lot.step || 1)}`}
                      placeholderTextColor={theme.mutedForeground}
                      keyboardType="decimal-pad"
                      style={styles.bidInput}
                    />
                    <TouchableOpacity style={styles.bidBtn} onPress={() => void placeBid(lot)} activeOpacity={0.88}>
                      <Text style={styles.bidBtnText}>Bid</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            );
            })
          )}
        </TabAwareScrollView>
      )}

      <Modal visible={createOpen} transparent animationType="fade">
        <Pressable style={styles.modalBg} onPress={() => setCreateOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>Новый лот</Text>
            <Text style={styles.fieldLabel}>Коллекция (обязательно)</Text>
            <TouchableOpacity
              style={styles.selectInput}
              onPress={() => setCollectionPickerOpen(true)}
              activeOpacity={0.88}
            >
              <Text style={[styles.selectInputText, !selectedCollection && styles.selectInputPlaceholder]} numberOfLines={1}>
                {selectedCollection ? selectedCollection.name : "Выбрать коллекцию"}
              </Text>
            </TouchableOpacity>
            {draftCollectionId ? (
              <>
                <Text style={styles.fieldLabel}>Предмет (опционально)</Text>
                <TouchableOpacity
                  style={styles.selectInput}
                  onPress={() => setItemPickerOpen(true)}
                  activeOpacity={0.88}
                >
                  <Text style={[styles.selectInputText, !selectedItem && styles.selectInputPlaceholder]} numberOfLines={1}>
                    {selectedItem ? selectedItem.name : "Вся коллекция"}
                  </Text>
                </TouchableOpacity>
              </>
            ) : null}
            <Text style={styles.fieldLabel}>Длительность аукциона</Text>
            <TouchableOpacity
              style={styles.selectInput}
              onPress={() => {
                setDurationDraft(draftDurationDays || "2");
                setDurationPickerOpen(true);
              }}
              activeOpacity={0.88}
            >
              <Text style={styles.selectInputText}>{`${draftDurationDays || "2"} дн.`}</Text>
            </TouchableOpacity>
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

      <Modal visible={Boolean(chartLot)} transparent animationType="fade">
        <Pressable style={styles.modalBg} onPress={() => setChartLot(null)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>{chartLot?.name ? `График: ${chartLot.name}` : "График ставок"}</Text>
            {chartLot ? <AuctionBidChart bidHistory={chartLot.bidHistory} formatMoney={formatMoney} /> : null}
            <TouchableOpacity style={styles.submitBtn} onPress={() => setChartLot(null)} activeOpacity={0.9}>
              <Text style={styles.submitBtnText}>Закрыть</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={collectionPickerOpen} transparent animationType="fade">
        <Pressable style={styles.modalBg} onPress={() => setCollectionPickerOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>Выберите коллекцию</Text>
            <ScrollView style={{ maxHeight: 320 }} contentContainerStyle={{ gap: 8 }}>
              {collectionsList.map((c) => {
                const selected = draftCollectionId === c.id;
                return (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.pickerRow, selected && styles.pickerRowOn]}
                    onPress={() => {
                      setDraftCollectionId(c.id);
                      setDraftItemId(null);
                      setCollectionPickerOpen(false);
                    }}
                    activeOpacity={0.88}
                  >
                    <Text style={[styles.pickerRowText, selected && styles.pickerRowTextOn]}>{c.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={itemPickerOpen} transparent animationType="fade">
        <Pressable style={styles.modalBg} onPress={() => setItemPickerOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>Выберите предмет</Text>
            <ScrollView style={{ maxHeight: 320 }} contentContainerStyle={{ gap: 8 }}>
              <TouchableOpacity
                style={[styles.pickerRow, draftItemId == null && styles.pickerRowOn]}
                onPress={() => {
                  setDraftItemId(null);
                  setItemPickerOpen(false);
                }}
                activeOpacity={0.88}
              >
                <Text style={[styles.pickerRowText, draftItemId == null && styles.pickerRowTextOn]}>Вся коллекция</Text>
              </TouchableOpacity>
              {draftCollectionItems.map((item) => {
                const selected = draftItemId === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.pickerRow, selected && styles.pickerRowOn]}
                    onPress={() => {
                      setDraftItemId(item.id);
                      setItemPickerOpen(false);
                    }}
                    activeOpacity={0.88}
                  >
                    <Text style={[styles.pickerRowText, selected && styles.pickerRowTextOn]}>{item.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={durationPickerOpen} transparent animationType="fade">
        <Pressable style={styles.modalBg} onPress={() => setDurationPickerOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>Выберите длительность</Text>
            <View style={styles.presetRow}>
              {[1, 3, 7, 14, 30].map((d) => {
                const selected = Number(durationDraft) === d;
                return (
                  <TouchableOpacity
                    key={d}
                    style={[styles.presetChip, selected && styles.presetChipOn]}
                    onPress={() => setDurationDraft(String(d))}
                    activeOpacity={0.88}
                  >
                    <Text style={[styles.presetChipText, selected && styles.presetChipTextOn]}>{`${d} д`}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TextInput
              value={durationDraft}
              onChangeText={setDurationDraft}
              style={styles.input}
              placeholder="Своя длительность (дней)"
              keyboardType="decimal-pad"
              placeholderTextColor={theme.mutedForeground}
            />
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={() => {
                const parsed = toNumber(durationDraft, NaN);
                if (!Number.isFinite(parsed) || parsed <= 0) {
                  Alert.alert("Проверьте данные", "Введите длительность больше 0 дней.");
                  return;
                }
                setDraftDurationDays(String(parsed));
                setDurationPickerOpen(false);
              }}
              activeOpacity={0.9}
            >
              <Text style={styles.submitBtnText}>Применить</Text>
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
  headerRight: { flexDirection: "row", alignItems: "center", gap: 12 },
  walletBox: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: theme.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
  },
  walletLabel: { fontSize: 11, color: theme.mutedForeground },
  walletValue: { fontSize: 13, fontWeight: "600", color: theme.foreground },
  tabsRow: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border,
    flexDirection: "row",
    gap: 8,
  },
  tabBtn: {
    flex: 1,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
    backgroundColor: theme.card,
    paddingVertical: 10,
    alignItems: "center",
  },
  tabBtnOn: { backgroundColor: theme.primary, borderColor: theme.primary },
  tabBtnText: { color: theme.mutedForeground, fontSize: 13 },
  tabBtnTextOn: { color: theme.primaryForeground, fontWeight: "700" },
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
  cardTop: { flexDirection: "row", gap: 12 },
  lotThumb: { width: 92, height: 92, backgroundColor: theme.background },
  cardMain: { flex: 1, minWidth: 0 },
  titleLine: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  title: { fontSize: 15, fontWeight: "700", color: theme.foreground },
  categoryText: { fontSize: 12, color: theme.mutedForeground, marginTop: 6 },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  statusPillDanger: { backgroundColor: "rgba(225, 29, 72, 0.16)", borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(225, 29, 72, 0.38)" },
  statusPillWarn: { backgroundColor: "rgba(212,175,55,0.16)", borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(212,175,55,0.4)" },
  statusPillText: { fontSize: 12, color: theme.mutedForeground },
  statusPillTextDanger: { color: "#fb7185" },
  statusPillTextWarn: { color: theme.primary },
  desc: { fontSize: 12, color: theme.mutedForeground, marginTop: 6, lineHeight: 18 },
  metaRow: { marginTop: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  price: { fontSize: 15, fontWeight: "700", color: theme.primary },
  myPrice: { fontSize: 15, fontWeight: "700", color: theme.foreground },
  timeRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
  timeText: { fontSize: 11, color: theme.mutedForeground },
  dotSep: { fontSize: 11, color: theme.mutedForeground },
  bidsRow: { marginTop: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  metaLabel: { fontSize: 11, color: theme.mutedForeground, marginBottom: 2 },
  transferText: { marginTop: 10, fontSize: 12, color: theme.primary, fontWeight: "600" },
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
  chartBtn: {
    marginTop: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.primary,
    borderRadius: theme.radiusLg,
    backgroundColor: theme.primary,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  chartBtnText: { color: theme.primaryForeground, fontWeight: "700", fontSize: 13 },
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
  fieldLabel: { fontSize: 12, color: theme.mutedForeground, marginBottom: 8, marginTop: 2 },
  selectInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
    borderRadius: theme.radiusLg,
    backgroundColor: theme.background,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  selectInputText: { color: theme.foreground, fontSize: 14 },
  selectInputPlaceholder: { color: theme.mutedForeground },
  pickerRow: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
    borderRadius: theme.radiusLg,
    backgroundColor: theme.background,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  pickerRowOn: { borderColor: theme.primary, backgroundColor: "rgba(212,175,55,0.14)" },
  pickerRowText: { color: theme.foreground, fontSize: 14 },
  pickerRowTextOn: { color: theme.primary, fontWeight: "700" },
  presetRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  presetChip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
    borderRadius: theme.radiusLg,
    backgroundColor: theme.background,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  presetChipOn: { borderColor: theme.primary, backgroundColor: "rgba(212,175,55,0.14)" },
  presetChipText: { color: theme.foreground, fontSize: 13 },
  presetChipTextOn: { color: theme.primary, fontWeight: "700" },
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

function AuctionBidChart({
  bidHistory,
  formatMoney,
}: {
  bidHistory: AuctionBidPoint[];
  formatMoney: (usd: number) => string;
}) {
  const history = bidHistory.length > 0 ? bidHistory : [{ price: 0, time: new Date().toISOString(), bidderName: "Start" }];
  const prices = history.map((h) => h.price);
  const max = Math.max(...prices, 1);
  const min = Math.min(...prices, 0);
  const range = Math.max(max - min, 1);
  const width = 220;
  const height = 110;
  const pad = 10;
  const points = history
    .map((p, i) => {
      const x = pad + (i * (width - pad * 2)) / Math.max(history.length - 1, 1);
      const y = height - pad - ((p.price - min) / range) * (height - pad * 2);
      return { x, y, ...p };
    });
  const polyline = points.map((p) => `${p.x},${p.y}`).join(" ");
  const leftMid = min + range / 2;

  return (
    <View style={chartStyles.wrap}>
      <View style={chartStyles.axisLeft}>
        <Text style={chartStyles.axisText}>{formatMoney(max)}</Text>
        <Text style={chartStyles.axisText}>{formatMoney(leftMid)}</Text>
        <Text style={chartStyles.axisText}>{formatMoney(min)}</Text>
      </View>
      <View style={chartStyles.graphArea}>
        <Svg width={width} height={height}>
          <Polyline points={polyline} fill="none" stroke={theme.primary} strokeWidth={2.5} />
          {points.map((p) => (
            <Circle key={`${p.x}-${p.time}`} cx={p.x} cy={p.y} r={3.5} fill={theme.primary} />
          ))}
        </Svg>
        <View style={chartStyles.timelineRow}>
          {points.map((p) => (
            <View key={`${p.time}-${p.bidderName}`} style={chartStyles.timeCell}>
              <Text style={chartStyles.timeLabel}>
                {new Date(p.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </Text>
              {p.bidderAvatar ? (
                <Image source={{ uri: p.bidderAvatar }} style={chartStyles.avatar} />
              ) : (
                <View style={chartStyles.avatarFallback}>
                  <Text style={chartStyles.avatarFallbackText}>{p.bidderName.slice(0, 1).toUpperCase()}</Text>
                </View>
              )}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const chartStyles = StyleSheet.create({
  wrap: { marginTop: 12, flexDirection: "row", gap: 8, alignItems: "flex-start" },
  axisLeft: { width: 74, height: 110, justifyContent: "space-between", paddingTop: 4, paddingBottom: 4 },
  axisText: { fontSize: 10, color: theme.foreground },
  graphArea: { flex: 1, minWidth: 0 },
  timelineRow: { marginTop: 4, flexDirection: "row", justifyContent: "space-between" },
  timeCell: { alignItems: "center", width: 38 },
  timeLabel: { fontSize: 9, color: theme.foreground, marginBottom: 4 },
  avatar: { width: 18, height: 18, borderRadius: 9, backgroundColor: theme.card },
  avatarFallback: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarFallbackText: { fontSize: 9, color: theme.foreground, fontWeight: "700" },
});

