import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ChevronRight, EyeOff, Search } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomNav } from "../components/BottomNav";
import { ErrorState } from "../components/ErrorState";
import { Skeleton } from "../components/Skeleton";
import { ImageWithFallback } from "../components/ImageWithFallback";
import { TabAwareScrollView } from "../components/TabAwareScrollView";
import { useAppSettings } from "../context/app-settings-context";
import { getPublicUsersApi } from "../api/vaultApi";
import type { RootStackParamList } from "../navigation/types";
import { theme } from "../theme";

type Nav = NativeStackNavigationProp<RootStackParamList, "Community">;

export function CommunityScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { hideFromSearch, formatMoney } = useAppSettings();
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<any[]>([]);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getPublicUsersApi({ limit: 50, offset: 0 });
      setUsers(res ?? []);
    } catch (e: any) {
      setError(e?.message ? String(e.message) : "Не удалось загрузить пользователей.");
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
    const normalized = users.map((u) => {
      const id = String(u?.id ?? "");
      return {
        id,
        displayName: String(u?.display_name ?? u?.displayName ?? "Пользователь"),
        handle: String(u?.handle ?? ""),
        bio: String(u?.bio ?? ""),
        avatar: String(u?.avatar_url ?? u?.avatar ?? ""),
        collectionsCount: Number(u?.collections_count ?? u?.collectionsCount ?? 0) || 0,
        itemsCount: Number(u?.items_count ?? u?.itemsCount ?? 0) || 0,
        totalValueUsd: Number(u?.total_value_usd ?? u?.totalValueUsd ?? 0) || 0,
        isSelf: Boolean(u?.is_self ?? u?.isSelf),
      };
    });

    return normalized.filter((u) => {
      if (u.isSelf && hideFromSearch) return false;
      if (!q) return true;
      return (
        u.displayName.toLowerCase().includes(q) ||
        u.handle.toLowerCase().includes(q) ||
        u.bio.toLowerCase().includes(q)
      );
    });
  }, [query, hideFromSearch, users]);

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.h1}>Сообщество</Text>
        <Text style={styles.sub}>Профили других коллекционеров и статистика</Text>
        {hideFromSearch ? (
          <View style={styles.hiddenBanner}>
            <EyeOff size={16} color={theme.mutedForeground} />
            <Text style={styles.hiddenText}>Ваш профиль скрыт из общего поиска</Text>
          </View>
        ) : null}
        <View style={styles.searchRow}>
          <Search size={18} color={theme.mutedForeground} style={{ marginLeft: 12 }} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Поиск по имени или @нику"
            placeholderTextColor={theme.mutedForeground}
            style={styles.searchInput}
          />
        </View>
      </View>

      <TabAwareScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 96, gap: 10 }}
        showsVerticalScrollIndicator={false}
      >
        {error ? (
          <ErrorState message={error} onRetry={load} />
        ) : isLoading ? (
          <>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <View key={i} style={styles.userCard}>
                <Skeleton style={{ width: 52, height: 52, borderRadius: 26 }} radius={26} />
                <View style={styles.userMid}>
                  <Skeleton style={{ height: 14, width: "60%" }} />
                  <Skeleton style={{ height: 10, width: "35%", marginTop: 8 }} />
                  <Skeleton style={{ height: 10, width: "70%", marginTop: 8 }} />
                </View>
                <Skeleton style={{ width: 20, height: 20, borderRadius: 10 }} radius={10} />
              </View>
            ))}
          </>
        ) : list.length === 0 ? (
          <Text style={styles.empty}>Никого не найдено. Измените запрос или отключите скрытие профиля в настройках аккаунта.</Text>
        ) : (
          list.map((u) => (
            <TouchableOpacity
              key={u.id}
              style={styles.userCard}
              onPress={() => navigation.navigate("UserProfile", { userId: u.id })}
              activeOpacity={0.9}
            >
              <ImageWithFallback uri={u.avatar} style={styles.avatar} borderRadius={999} />
              <View style={styles.userMid}>
                <Text style={styles.name} numberOfLines={1}>
                  {u.displayName}
                  {u.isSelf ? " • вы" : ""}
                </Text>
                <Text style={styles.handle}>{u.handle}</Text>
                <Text style={styles.stats}>
                  {u.collectionsCount} колл. · {u.itemsCount} предм. · {formatMoney(u.totalValueUsd)}
                </Text>
              </View>
              <ChevronRight size={20} color={theme.mutedForeground} />
            </TouchableOpacity>
          ))
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
  h1: { fontSize: 22, fontWeight: "600", color: theme.foreground },
  sub: { fontSize: 14, color: theme.mutedForeground },
  hiddenBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    backgroundColor: "rgba(212,175,55,0.08)",
    borderRadius: theme.radiusLg,
  },
  hiddenText: { fontSize: 12, color: theme.mutedForeground, flex: 1 },
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
  avatar: { width: 52, height: 52 },
  userMid: { flex: 1, minWidth: 0 },
  name: { fontSize: 15, fontWeight: "600", color: theme.foreground },
  handle: { fontSize: 13, color: theme.mutedForeground, marginTop: 2 },
  stats: { fontSize: 12, color: theme.primary, marginTop: 4, fontWeight: "500" },
  empty: { fontSize: 14, color: theme.mutedForeground, textAlign: "center", marginTop: 24, lineHeight: 20 },
});
