import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, FolderOpen, LayoutGrid, MessageCircle, ThumbsUp, TrendingUp } from "lucide-react-native";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ErrorState } from "../components/ErrorState";
import { Skeleton } from "../components/Skeleton";
import { ImageWithFallback } from "../components/ImageWithFallback";
import { TabAwareScrollView } from "../components/TabAwareScrollView";
import { useAppSettings } from "../context/app-settings-context";
import { useCollectionsStore } from "../context/collections-store-context";
// actions (лайк/комментарий/желания) доступны в `ItemDetailScreen`
import { getPublicUserApi, getUserCollectionsApi } from "../api/vaultApi";
import type { RootStackParamList } from "../navigation/types";
import { theme } from "../theme";

type Nav = NativeStackNavigationProp<RootStackParamList, "UserProfile">;
type R = RouteProp<RootStackParamList, "UserProfile">;

export function UserProfileScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const route = useRoute<R>();
  const { formatMoney, authToken } = useAppSettings();
  useCollectionsStore();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [collections, setCollections] = useState<any[]>([]);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const userIdNum = Number(route.params.userId);
      const [u, cols] = await Promise.all([
        getPublicUserApi({ userId: userIdNum }),
        getUserCollectionsApi({ userId: userIdNum, token: authToken }),
      ]);
      setUser(u ?? null);
      setCollections(cols ?? []);
    } catch (e: any) {
      setError(e?.message ? String(e.message) : "Не удалось загрузить профиль.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.params.userId]);

  return (
    <View style={styles.root}>
      <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
          <ChevronLeft size={26} color={theme.foreground} />
        </TouchableOpacity>
      </View>

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
      <TabAwareScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
            {isLoading ? (
              <>
                <Skeleton style={{ width: 112, height: 112, borderRadius: 56, marginBottom: 12 }} radius={56} />
                <Skeleton style={{ height: 18, width: 180 }} />
                <Skeleton style={{ height: 12, width: 120, marginTop: 10 }} />
                <Skeleton style={{ height: 12, width: 240, marginTop: 12 }} />
              </>
            ) : (
              <>
                <ImageWithFallback uri={String(user?.avatar_url ?? user?.avatar ?? "")} style={styles.avatarLarge} borderRadius={999} />
                <Text style={styles.displayName}>{String(user?.display_name ?? user?.displayName ?? "Пользователь")}</Text>
                <Text style={styles.handle}>{String(user?.handle ?? "")}</Text>
                <Text style={styles.bio}>{String(user?.bio ?? "")}</Text>
              </>
            )}
        </View>

        <Text style={styles.sectionLabel}>Статистика</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <FolderOpen size={18} color={theme.primary} />
              <Text style={styles.statVal}>{String(user?.collections_count ?? user?.collectionsCount ?? 0)}</Text>
            <Text style={styles.statLab}>коллекций</Text>
          </View>
          <View style={styles.statCard}>
            <LayoutGrid size={18} color={theme.primary} />
              <Text style={styles.statVal}>{String(user?.items_count ?? user?.itemsCount ?? 0)}</Text>
            <Text style={styles.statLab}>предметов</Text>
          </View>
          <View style={styles.statCard}>
            <TrendingUp size={18} color={theme.primary} />
            <Text style={styles.statVal} numberOfLines={1}>
                {formatMoney(Number(user?.total_value_usd ?? user?.totalValueUsd ?? 0) || 0)}
            </Text>
            <Text style={styles.statLab}>оценка</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Коллекции</Text>
        <View style={styles.userCollections}>
            {isLoading ? (
              <>
                {[0, 1].map((i) => (
                  <View key={i} style={styles.collectionCard}>
                <View style={styles.collectionTop}>
                      <Skeleton style={{ width: 84, height: 84, borderRadius: 10 }} radius={10} />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Skeleton style={{ height: 14, width: "70%" }} />
                        <Skeleton style={{ height: 10, width: "55%", marginTop: 10 }} />
                      </View>
                    </View>
                  </View>
                ))}
              </>
            ) : collections.length === 0 ? (
              <Text style={styles.note}>Публичных коллекций пока нет.</Text>
            ) : (
              collections.map((c: any) => {
                const id = Number(c?.id ?? c?.collection_id);
                const name = String(c?.name ?? `Коллекция ${id}`);
                const img = String(c?.image_url ?? c?.image ?? "");
                const total = Number(c?.total_value_usd ?? c?.totalValueUsd ?? 0) || 0;
                const itemsCount = Number(c?.items_count ?? c?.itemsCount ?? 0) || 0;
                // Without an endpoint for user's public collection items here, we don't render item list previews.
                return (
                  <View key={String(id)} style={styles.collectionCard}>
                    <View style={styles.collectionTop}>
                      <View style={styles.collectionThumb}>
                        <ImageWithFallback uri={img} style={styles.collectionThumbImg} borderRadius={10} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.collectionName} numberOfLines={1}>
                          {name}
                    </Text>
                    <Text style={styles.collectionSub}>
                          {itemsCount} предм. • {formatMoney(total)}
                    </Text>
                  </View>
                </View>

                    <Text style={styles.note}>
                      Детали предметов этой коллекции доступны при наличии API для публичных предметов пользователя.
                            </Text>
              </View>
            );
              })
            )}
        </View>

        <Text style={styles.note}>
          Это публичная сводка. Собственные коллекции доступны на вкладке «Коллекции».
        </Text>
      </TabAwareScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.background },
  top: { paddingHorizontal: 12, paddingBottom: 8 },
  backBtn: { alignSelf: "flex-start", padding: 8 },
  err: { textAlign: "center", marginTop: 40, color: theme.mutedForeground },
  head: { alignItems: "center", paddingHorizontal: 24, paddingBottom: 24 },
  avatarLarge: { width: 112, height: 112, marginBottom: 12 },
  displayName: { fontSize: 22, fontWeight: "700", color: theme.foreground },
  handle: { fontSize: 15, color: theme.mutedForeground, marginTop: 4 },
  bio: { fontSize: 14, color: theme.mutedForeground, textAlign: "center", marginTop: 12, lineHeight: 20 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.foreground,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  statCard: {
    width: "30%",
    minWidth: 100,
    backgroundColor: theme.card,
    borderRadius: theme.radiusXl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
    padding: 14,
    alignItems: "center",
    gap: 6,
  },
  statVal: { fontSize: 15, fontWeight: "700", color: theme.foreground },
  statLab: { fontSize: 11, color: theme.mutedForeground },
  note: {
    fontSize: 12,
    color: theme.mutedForeground,
    paddingHorizontal: 24,
    marginTop: 24,
    lineHeight: 18,
    textAlign: "center",
  },
  userCollections: { paddingHorizontal: 16, paddingBottom: 24, gap: 12 },
  collectionCard: {
    backgroundColor: theme.card,
    borderRadius: theme.radiusXl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
    overflow: "hidden",
    padding: 12,
  },
  collectionTop: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  collectionThumb: { width: 84, height: 84, borderRadius: 10, overflow: "hidden" },
  collectionThumbImg: { width: "100%", height: "100%" },
  collectionName: { fontSize: 14, fontWeight: "700", color: theme.foreground },
  collectionSub: { fontSize: 12, color: theme.mutedForeground, marginTop: 4 },
  itemsWrap: { flexDirection: "column", gap: 10 },
  itemCard: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: theme.background,
    borderRadius: theme.radiusXl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
    padding: 10,
    overflow: "hidden",
  },
  itemImg: { width: 74, height: 74, borderRadius: 10, backgroundColor: theme.card },
  itemBody: { flex: 1, minWidth: 0, gap: 6 },
  itemDesc: { fontSize: 12, color: theme.mutedForeground, lineHeight: 16 },
  itemName: { fontSize: 13, fontWeight: "700", color: theme.foreground },
  itemPrice: { fontSize: 13, fontWeight: "800", color: theme.primary },
  itemMetaRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  metaChip: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: theme.radiusLg,
    backgroundColor: "rgba(0,0,0,0.04)",
  },
  metaChipText: { fontSize: 12, fontWeight: "700", color: theme.foreground },
  itemActionsRow: { flexDirection: "row", gap: 8, marginTop: 6, alignItems: "center" },
  itemActionBtn: {
    flex: 1,
    backgroundColor: theme.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
    borderRadius: theme.radiusLg,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  itemActionText: { fontSize: 12, fontWeight: "700", color: theme.foreground },
});
