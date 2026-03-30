import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import { useMemo } from "react";
import { ChevronLeft, FolderOpen, LayoutGrid, MessageCircle, ThumbsUp, TrendingUp } from "lucide-react-native";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ImageWithFallback } from "../components/ImageWithFallback";
import { TabAwareScrollView } from "../components/TabAwareScrollView";
import { useAppSettings } from "../context/app-settings-context";
import { useCollectionsStore } from "../context/collections-store-context";
// actions (лайк/комментарий/желания) доступны в `ItemDetailScreen`
import { collections as seedCollections, communityUsers } from "../data/mocks";
import type { RootStackParamList } from "../navigation/types";
import { theme } from "../theme";

type Nav = NativeStackNavigationProp<RootStackParamList, "UserProfile">;
type R = RouteProp<RootStackParamList, "UserProfile">;

export function UserProfileScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const route = useRoute<R>();
  const { formatMoney } = useAppSettings();

  const user = communityUsers.find((u) => u.id === route.params.userId);
  const { itemsForCollection, mergedItemDetail } = useCollectionsStore();

  if (!user) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={26} color={theme.foreground} />
        </TouchableOpacity>
        <Text style={styles.err}>Профиль не найден</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
          <ChevronLeft size={26} color={theme.foreground} />
        </TouchableOpacity>
      </View>

      <TabAwareScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <ImageWithFallback uri={user.avatar} style={styles.avatarLarge} borderRadius={999} />
          <Text style={styles.displayName}>{user.displayName}</Text>
          <Text style={styles.handle}>{user.handle}</Text>
          <Text style={styles.bio}>{user.bio}</Text>
        </View>

        <Text style={styles.sectionLabel}>Статистика</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <FolderOpen size={18} color={theme.primary} />
            <Text style={styles.statVal}>{user.collectionsCount}</Text>
            <Text style={styles.statLab}>коллекций</Text>
          </View>
          <View style={styles.statCard}>
            <LayoutGrid size={18} color={theme.primary} />
            <Text style={styles.statVal}>{user.itemsCount}</Text>
            <Text style={styles.statLab}>предметов</Text>
          </View>
          <View style={styles.statCard}>
            <TrendingUp size={18} color={theme.primary} />
            <Text style={styles.statVal} numberOfLines={1}>
              {formatMoney(user.totalValueUsd)}
            </Text>
            <Text style={styles.statLab}>оценка</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Коллекции</Text>
        <View style={styles.userCollections}>
          {seedCollections.map((c) => {
            const list = itemsForCollection(String(c.id));
            const total = list.reduce((s, i) => s + i.price, 0);
            return (
              <View key={c.id} style={styles.collectionCard}>
                <View style={styles.collectionTop}>
                  <View style={styles.collectionThumb}>
                    <ImageWithFallback uri={c.image} style={styles.collectionThumbImg} borderRadius={10} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.collectionName} numberOfLines={1}>
                      {c.name}
                    </Text>
                    <Text style={styles.collectionSub}>
                      {list.length} предм. • {formatMoney(total)}
                    </Text>
                  </View>
                </View>

                <View style={styles.itemsWrap}>
                  {list.map((it) => {
                    const detail = mergedItemDetail(String(it.id));
                    const desc = (detail.description ?? "").trim();
                    const preview = desc.length > 20 ? `${desc.slice(0, 20)}…` : desc || "—";
                    return (
                      <TouchableOpacity
                        key={it.id}
                        activeOpacity={0.92}
                        onPress={() =>
                          navigation.navigate("ItemDetail", {
                            id: String(it.id),
                            browse: true,
                            collectionId: String(c.id),
                          })
                        }
                      >
                        <View style={styles.itemCard}>
                          <ImageWithFallback uri={it.image} style={styles.itemImg} borderRadius={10} />
                          <View style={styles.itemBody}>
                            <Text style={styles.itemDesc} numberOfLines={2}>
                              {preview}
                            </Text>
                            <Text style={styles.itemName} numberOfLines={1}>
                              {it.name}
                            </Text>
                            <Text style={styles.itemPrice}>{formatMoney(it.price)}</Text>
                            <View style={styles.itemMetaRow}>
                              <View style={styles.metaChip}>
                                <ThumbsUp size={14} color={theme.primary} fill="transparent" />
                                <Text style={styles.metaChipText}>{detail.likes}</Text>
                              </View>
                              <View style={styles.metaChip}>
                                <MessageCircle size={14} color={theme.mutedForeground} />
                                <Text style={styles.metaChipText}>{detail.comments.length}</Text>
                              </View>
                            </View>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </View>

        <Text style={styles.note}>
          Это публичная сводка. Собственные коллекции доступны на вкладке «Коллекции».
        </Text>
      </TabAwareScrollView>
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
