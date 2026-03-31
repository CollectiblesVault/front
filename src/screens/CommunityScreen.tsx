import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ChevronRight, Grid3x3, List, Search } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { Dimensions, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomNav } from "../components/BottomNav";
import { ErrorState } from "../components/ErrorState";
import { Skeleton } from "../components/Skeleton";
import { ImageWithFallback } from "../components/ImageWithFallback";
import { TabAwareScrollView } from "../components/TabAwareScrollView";
import { useAppSettings } from "../context/app-settings-context";
import { getPublicCollectionItemsApi, getPublicUsersApi, getUserCollectionsApi } from "../api/vaultApi";
import type { RootStackParamList } from "../navigation/types";
import { theme } from "../theme";

type Nav = NativeStackNavigationProp<RootStackParamList, "Community">;
const gap = 12;
const pad = 16;
const colW = (Dimensions.get("window").width - pad * 2 - gap) / 2;

function getMasonryAspect(seed: number) {
  const normalized = Math.abs(Math.sin(seed || 1));
  return 0.78 + normalized * 0.45;
}

export function CommunityScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { authToken, formatMoney } = useAppSettings();
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [collections, setCollections] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const users = await getPublicUsersApi({ limit: 200, offset: 0 });
      const collectionsByUser = await Promise.all(
        (users ?? []).map(async (u: any) => {
          const userId = Number(u?.id);
          if (!Number.isFinite(userId)) return [];
          try {
            const cols = await getUserCollectionsApi({ userId, token: authToken });
            return (cols ?? []).map((c: any) => ({ c, u }));
          } catch {
            return [];
          }
        }),
      );

      const flattened = collectionsByUser.flat();
      const hydrated = await Promise.all(
        flattened.map(async ({ c, u }: any) => {
          const collectionId = Number(c?.id ?? c?.collection_id);
          let previewImage = String(c?.image_url ?? c?.image ?? "");
          let itemsCount = Number(c?.items_count ?? c?.itemsCount ?? 0) || 0;
          let totalValueUsd = Number(c?.total_value_usd ?? c?.totalValueUsd ?? 0) || 0;
          try {
            const items = await getPublicCollectionItemsApi({ collectionId });
            if (items.length > 0) {
              if (!previewImage) {
                previewImage = String(items[0]?.image_url ?? items[0]?.image ?? "");
              }
              itemsCount = itemsCount || items.length;
              totalValueUsd = totalValueUsd || items.reduce((s: number, it: any) => s + (Number(it?.price ?? 0) || 0), 0);
            }
          } catch {
            // keep basic info
          }
          return {
            id: String(collectionId),
            name: String(c?.name ?? `Коллекция ${collectionId}`),
            description: String(c?.description ?? ""),
            image: previewImage,
            itemsCount,
            totalValueUsd,
            ownerName: String(u?.display_name ?? u?.displayName ?? "Коллекционер"),
          };
        }),
      );
      setCollections(hydrated);
    } catch (e: any) {
      setError(e?.message ? String(e.message) : "Не удалось загрузить публичные коллекции.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return collections.filter((c) => {
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.ownerName.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q)
      );
    });
  }, [collections, query]);
  const gridColumns = useMemo(() => {
    const left: typeof list = [];
    const right: typeof list = [];
    let leftScore = 0;
    let rightScore = 0;
    list.forEach((c, index) => {
      const score = getMasonryAspect(Number(c.id) || index + 1);
      if (leftScore <= rightScore) {
        left.push(c);
        leftScore += score;
      } else {
        right.push(c);
        rightScore += score;
      }
    });
    return [left, right] as const;
  }, [list]);

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.h1}>Collections</Text>
            <Text style={styles.sub}>{list.length} collections</Text>
          </View>
          <View style={styles.toggleRow}>
            <TouchableOpacity
              onPress={() => setViewMode("grid")}
              style={[styles.toggleBtn, viewMode === "grid" ? styles.toggleOn : styles.toggleOff]}
              activeOpacity={0.9}
            >
              <Grid3x3 size={18} color={viewMode === "grid" ? theme.primaryForeground : theme.mutedForeground} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setViewMode("list")}
              style={[styles.toggleBtn, viewMode === "list" ? styles.toggleOn : styles.toggleOff]}
              activeOpacity={0.9}
            >
              <List size={18} color={viewMode === "list" ? theme.primaryForeground : theme.mutedForeground} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.searchRow}>
          <Search size={18} color={theme.mutedForeground} style={{ marginLeft: 12 }} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Поиск по названию, владельцу, описанию"
            placeholderTextColor={theme.mutedForeground}
            style={styles.searchInput}
          />
        </View>
      </View>

      <TabAwareScrollView
        contentContainerStyle={{ paddingHorizontal: pad, paddingTop: 12, paddingBottom: 96, gap: 10 }}
        showsVerticalScrollIndicator={false}
      >
        {error ? (
          <ErrorState message={error} onRetry={load} />
        ) : isLoading ? (
          viewMode === "grid" ? (
            <View style={styles.masonry}>
              {[0, 1].map((colIdx) => (
                <View key={colIdx} style={styles.masonryCol}>
                  {[0, 1].map((rowIdx) => {
                    const i = colIdx * 2 + rowIdx;
                    const aspect = getMasonryAspect(i + 1);
                    return (
                      <View key={i} style={[styles.gridCard, { width: colW }]}>
                        <Skeleton style={{ width: "100%", aspectRatio: aspect, borderRadius: 0 }} radius={0} />
                        <View style={styles.gridMeta}>
                          <Skeleton style={{ height: 14, width: "75%", marginBottom: 10 }} />
                          <Skeleton style={{ height: 10, width: "55%", marginBottom: 10 }} />
                          <Skeleton style={{ height: 12, width: "40%" }} />
                        </View>
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          ) : (
            <>
              {[0, 1, 2, 3].map((i) => (
                <View key={i} style={styles.userCard}>
                  <Skeleton style={{ width: 72, height: 72, borderRadius: 10 }} radius={10} />
                  <View style={styles.userMid}>
                    <Skeleton style={{ height: 14, width: "60%" }} />
                    <Skeleton style={{ height: 10, width: "35%", marginTop: 8 }} />
                    <Skeleton style={{ height: 10, width: "70%", marginTop: 8 }} />
                  </View>
                  <Skeleton style={{ width: 20, height: 20, borderRadius: 10 }} radius={10} />
                </View>
              ))}
            </>
          )
        ) : list.length === 0 ? (
          <Text style={styles.empty}>Коллекции не найдены. Измените запрос.</Text>
        ) : (
          viewMode === "grid" ? (
            <View style={styles.masonry}>
              {gridColumns.map((column, colIndex) => (
                <View key={`masonry-col-${colIndex}`} style={styles.masonryCol}>
                  {column.map((c, idx) => (
                    <TouchableOpacity
                      key={c.id}
                      style={[styles.gridCard, { width: colW }]}
                      onPress={() =>
                        navigation.navigate("CollectionDetail", {
                          id: c.id,
                          browse: true,
                          collectionPreview: { name: c.name, imageUrl: c.image, isPublic: true },
                        })
                      }
                      activeOpacity={0.9}
                    >
                      <View style={[styles.gridImageWrap, { aspectRatio: getMasonryAspect(Number(c.id) || idx + 1) }]}>
                        <ImageWithFallback uri={c.image} style={styles.gridImage} borderRadius={0} />
                      </View>
                      <View style={styles.gridMeta}>
                        <Text style={styles.name} numberOfLines={1}>{c.name}</Text>
                        <Text style={styles.handle}>{c.itemsCount} items</Text>
                        <Text style={styles.stats}>{formatMoney(c.totalValueUsd)}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </View>
          ) : (
            list.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={styles.userCard}
                onPress={() =>
                  navigation.navigate("CollectionDetail", {
                    id: c.id,
                    browse: true,
                    collectionPreview: { name: c.name, imageUrl: c.image, isPublic: true },
                  })
                }
                activeOpacity={0.9}
              >
                <ImageWithFallback uri={c.image} style={styles.avatar} borderRadius={10} />
                <View style={styles.userMid}>
                  <Text style={styles.name} numberOfLines={1}>
                    {c.name}
                  </Text>
                  <Text style={styles.handle}>Owner: {c.ownerName}</Text>
                  <Text style={styles.stats}>
                    {c.itemsCount} items · {formatMoney(c.totalValueUsd)}
                  </Text>
                </View>
                <ChevronRight size={20} color={theme.mutedForeground} />
              </TouchableOpacity>
            ))
          )
        )}
      </TabAwareScrollView>
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
    gap: 8,
  },
  headerTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  h1: { fontSize: 22, fontWeight: "600", color: theme.foreground },
  sub: { fontSize: 14, color: theme.mutedForeground },
  toggleRow: { flexDirection: "row", gap: 8 },
  toggleBtn: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  toggleOn: { backgroundColor: theme.primary, borderColor: theme.primary },
  toggleOff: { backgroundColor: theme.card, borderColor: theme.border },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.card,
    borderRadius: theme.radiusLg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
    height: 44,
    marginTop: 4,
  },
  masonry: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  masonryCol: { width: colW, gap: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  gridCard: {
    backgroundColor: theme.card,
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
  },
  gridImageWrap: { width: "100%", overflow: "hidden" },
  gridImage: { width: "100%", height: "100%" },
  gridMeta: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 14 },
  searchInput: {
    flex: 1,
    paddingHorizontal: 10,
    color: theme.foreground,
    fontSize: 15,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    backgroundColor: theme.card,
    borderRadius: theme.radiusXl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
  },
  avatar: { width: 72, height: 72 },
  userMid: { flex: 1, minWidth: 0 },
  name: { fontSize: 16, fontWeight: "500", color: theme.foreground },
  handle: { fontSize: 13, color: theme.mutedForeground, marginTop: 2 },
  stats: { fontSize: 14, color: theme.primary, marginTop: 6, fontWeight: "500" },
  empty: { fontSize: 14, color: theme.mutedForeground, textAlign: "center", marginTop: 24, lineHeight: 20 },
});
