import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Heart, MessageCircle, ThumbsUp, X } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomNav } from "../components/BottomNav";
import { TabAwareScrollView } from "../components/TabAwareScrollView";
import { ImageWithFallback } from "../components/ImageWithFallback";
import { OfflineBanner } from "../components/OfflineBanner";
import { useAppSettings } from "../context/app-settings-context";
import { useCollectionsStore } from "../context/collections-store-context";
import { useWishlist } from "../context/wishlist-context";
import type { RootStackParamList } from "../navigation/types";
import { theme } from "../theme";

type Nav = NativeStackNavigationProp<RootStackParamList, "Wishlist">;

export function WishlistScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { formatMoney, canInteract } = useAppSettings();
  const { entries, removeFromWishlist } = useWishlist();
  const [isOffline] = useState(false);
  const { mergedItemDetail } = useCollectionsStore();
  const [likedMap, setLikedMap] = useState<Record<number, boolean>>({});

  const totalEstimated = useMemo(() => entries.reduce((s, i) => s + i.estimatedPrice, 0), [entries]);

  const priorityColor = (p: string) => {
    if (p === "high") return theme.primary;
    if (p === "medium") return theme.mutedForeground;
    return "rgba(138,138,138,0.5)";
  };

  const priorityLabel = (p: string) => {
    if (p === "high") return "Высокий";
    if (p === "medium") return "Средний";
    return "Низкий";
  };

  const openItem = (id: number) => {
    navigation.navigate("ItemDetail", { id: String(id), browse: true });
  };

  return (
    <View style={styles.root}>
      <OfflineBanner isOffline={isOffline} />
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.h1}>Список желаний</Text>
        <Text style={styles.sub}>
          {entries.length} предметов • оценка {formatMoney(totalEstimated)}
        </Text>
      </View>

      {entries.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Heart size={40} color={theme.mutedForeground} />
          </View>
          <Text style={styles.emptyTitle}>Список желаний пуст</Text>
          <Text style={styles.emptySub}>Добавляйте сюда предметы, которые хотите приобрести</Text>
        </View>
      ) : (
        <TabAwareScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 96, gap: 12 }}
          showsVerticalScrollIndicator={false}
        >
          {entries.map((item) => {
            const detail = mergedItemDetail(String(item.id));
            const desc = (detail.description ?? "").trim();
            const preview = desc.length > 20 ? `${desc.slice(0, 20)}…` : desc || "—";
            const liked = likedMap[item.id] === true;
            const likesCount = detail.likes + (liked ? 1 : 0);
            const commentsCount = detail.comments.length;

            return (
            <TouchableOpacity
              key={item.id}
              style={styles.card}
              activeOpacity={0.92}
              onPress={() => openItem(item.id)}
            >
              <View style={styles.cardRow}>
                <View style={styles.thumb}>
                  <ImageWithFallback uri={item.image} style={styles.thumbImg} borderRadius={10} />
                </View>
                <View style={styles.mid}>
                  <View style={styles.titleRow}>
                    <Text style={styles.name} numberOfLines={2}>
                      {item.name}
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        if (!canInteract) {
                          Alert.alert("Нужен вход", "Удаление из списка желаний доступно после входа.");
                          return;
                        }
                        void removeFromWishlist(item.id);
                      }}
                      style={!canInteract ? { opacity: 0.4 } : undefined}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <X size={18} color={theme.mutedForeground} />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.descPreview} numberOfLines={2}>
                    {preview}
                  </Text>
                  <Text style={styles.cat}>{item.category}</Text>
                  <View style={styles.bottomRow}>
                    <Text style={styles.est}>~{formatMoney(item.estimatedPrice)}</Text>
                    <Text style={[styles.pri, { color: priorityColor(item.priority) }]}>
                      {priorityLabel(item.priority).toUpperCase()}
                    </Text>
                  </View>

                  <View style={styles.socialRow}>
                    <TouchableOpacity
                      style={[styles.socialBtn, !canInteract && { opacity: 0.5 }]}
                      onPress={() => {
                        if (!canInteract) return;
                        setLikedMap((prev) => ({ ...prev, [item.id]: !liked }));
                      }}
                      activeOpacity={0.85}
                    >
                      <ThumbsUp size={16} color={liked ? theme.primary : theme.mutedForeground} fill={liked ? theme.primary : "transparent"} />
                      <Text style={styles.socialBtnText}>{likesCount}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.socialBtn}
                      onPress={() => navigation.navigate("ItemDetail", { id: String(item.id), browse: true, openEdit: false })}
                      activeOpacity={0.85}
                    >
                      <MessageCircle size={16} color={theme.mutedForeground} />
                      <Text style={styles.socialBtnText}>{commentsCount}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
              {item.notes ? (
                <View style={styles.notesWrap}>
                  <Text style={styles.notes}>{item.notes}</Text>
                </View>
              ) : null}
              <Text style={styles.tapHint}>Нажмите карточку, чтобы открыть подробности</Text>
            </TouchableOpacity>
            );
          })}
        </TabAwareScrollView>
      )}
      <BottomNav />
    </View>
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
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.card,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: theme.foreground, marginBottom: 8 },
  emptySub: { fontSize: 14, color: theme.mutedForeground, textAlign: "center" },
  card: {
    backgroundColor: theme.card,
    borderRadius: theme.radiusXl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
    overflow: "hidden",
    marginBottom: 12,
  },
  cardRow: { flexDirection: "row", gap: 12, padding: 12 },
  thumb: { width: 96, height: 96, borderRadius: 10, overflow: "hidden" },
  thumbImg: { width: "100%", height: "100%" },
  mid: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: "row", justifyContent: "space-between", gap: 8, marginBottom: 4 },
  name: { flex: 1, fontSize: 14, fontWeight: "600", color: theme.foreground },
  cat: { fontSize: 12, color: theme.mutedForeground, marginBottom: 8 },
  bottomRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  est: { fontSize: 14, fontWeight: "700", color: theme.primary },
  pri: { fontSize: 11, fontWeight: "700", letterSpacing: 1 },
  notesWrap: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  notes: {
    fontSize: 12,
    color: theme.mutedForeground,
    backgroundColor: theme.background,
    borderRadius: theme.radiusLg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
    padding: 8,
  },
  descPreview: { fontSize: 12, color: theme.mutedForeground, lineHeight: 16, marginBottom: 6 },
  socialRow: { flexDirection: "row", gap: 10, marginTop: 8, alignItems: "center" },
  socialBtn: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: theme.radiusLg,
    backgroundColor: "rgba(0,0,0,0.04)",
  },
  socialBtnText: { fontSize: 12, fontWeight: "700", color: theme.foreground },
  tapHint: {
    fontSize: 11,
    color: theme.mutedForeground,
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
});
