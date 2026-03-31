import { CommonActions, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Award, FolderOpen, Heart, TrendingUp, User } from "lucide-react-native";
import { useCallback, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Modal,
  Pressable,
  StyleSheet,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomNav } from "../components/BottomNav";
import { CurrencyIcon } from "../components/CurrencyIcon";
import { TabAwareScrollView } from "../components/TabAwareScrollView";
import { OfflineBanner } from "../components/OfflineBanner";
import { useAppSettings } from "../context/app-settings-context";
import type { RootStackParamList } from "../navigation/types";
import { theme } from "../theme";
import { CURRENCY_CODES, getCurrencyLabel } from "../utils/formatMoney";
import { useCollectionsStore } from "../context/collections-store-context";
import { useWishlist } from "../context/wishlist-context";

type Nav = NativeStackNavigationProp<RootStackParamList, "Home">;

const statIcons = [FolderOpen, FolderOpen, TrendingUp, Heart] as const;
const activityIcons = [FolderOpen, Award, TrendingUp] as const;

export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const {
    currency,
    setCurrency,
    canInteract,
    hideFromSearch,
    setHideFromSearch,
    userProfile,
    setUserProfile,
    logout,
    formatMoney,
  } = useAppSettings();
  const [isOffline] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [profileNameDraft, setProfileNameDraft] = useState("");
  const [profileEmailDraft, setProfileEmailDraft] = useState("");
  const { collectionsList } = useCollectionsStore();
  const { entries: wishlistEntries } = useWishlist();

  const totalCollections = collectionsList.length;
  const totalItems = collectionsList.reduce((s, c) => s + c.itemCount, 0);
  const totalValueUsd = collectionsList.reduce((s, c) => s + c.totalValue, 0);
  const wishlistCount = wishlistEntries.length;

  const stats = [
    { label: "Коллекции", value: String(totalCollections) },
    { label: "Предметы", value: String(totalItems) },
    { label: "Общая стоимость", value: formatMoney(totalValueUsd) },
    { label: "Желания", value: String(wishlistCount) },
  ] as const;

  const navigateFromActivity = useCallback(() => {
      navigation.navigate("Reports");
  }, [navigation]);

  const handleLogout = useCallback(() => {
    logout();
    setAccountMenuOpen(false);
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: "Welcome" }],
      }),
    );
  }, [logout, navigation]);

  return (
    <View style={styles.root}>
      <OfflineBanner isOffline={isOffline} />
      <TabAwareScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 8, paddingBottom: 88 }]}
        showsVerticalScrollIndicator={false}
      >
        {!canInteract ? (
          <View style={styles.guestBanner}>
            <Text style={styles.guestBannerText}>Войдите в аккаунт, чтобы управлять коллекциями и предметами.</Text>
          </View>
        ) : null}

        <View style={styles.header}>
          <View>
            <Text style={styles.h1}>С возвращением</Text>
            <Text style={styles.sub}>{userProfile?.displayName ?? ""}</Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              if (userProfile) {
                setProfileNameDraft(userProfile.displayName);
                setProfileEmailDraft(userProfile.email);
              }
              setAccountMenuOpen(true);
            }}
            style={styles.accountBtn}
            activeOpacity={0.85}
            accessibilityLabel="Аккаунт и валюта"
          >
            <User size={20} color={theme.primary} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        <View style={styles.statsGrid}>
          {stats.map((stat, i) => {
            const Icon = statIcons[i] ?? FolderOpen;
            return (
              <View key={stat.label} style={styles.statCard}>
                <View style={styles.statRow}>
                  <Icon size={16} color={theme.primary} strokeWidth={2} />
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </View>
                <Text style={styles.statValue}>{stat.value}</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Быстрые действия</Text>
          <View style={styles.qaRow}>
            <TouchableOpacity
              style={styles.qaPrimary}
              onPress={() => navigation.navigate("Collections")}
              activeOpacity={0.9}
            >
              <FolderOpen size={24} color={theme.primaryForeground} strokeWidth={2} />
              <Text style={styles.qaPrimaryText}>Мои коллекции</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.qaSecondary}
              onPress={() => navigation.navigate("Reports")}
              activeOpacity={0.9}
            >
              <TrendingUp size={24} color={theme.foreground} strokeWidth={2} />
              <Text style={styles.qaSecondaryText}>Отчёты</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Недавняя активность</Text>
              <TouchableOpacity
                style={styles.activityCard}
            onPress={navigateFromActivity}
                activeOpacity={0.88}
              >
                <View style={styles.activityIcon}>
              <FolderOpen size={20} color={theme.primary} strokeWidth={2} />
                </View>
                <View style={styles.activityMid}>
              <Text style={styles.activityType}>Сводка</Text>
                  <Text style={styles.activityItem} numberOfLines={1}>
                Откройте отчёты, чтобы увидеть активность по периодам
                  </Text>
                </View>
            <Text style={styles.activityTime}>—</Text>
              </TouchableOpacity>
        </View>
      </TabAwareScrollView>

      <Modal visible={accountMenuOpen} animationType="fade" transparent>
        <Pressable style={styles.modalBackdrop} onPress={() => setAccountMenuOpen(false)}>
          <Pressable style={[styles.accountSheet, { paddingBottom: Math.max(insets.bottom, 16) }]} onPress={(e) => e.stopPropagation()}>
            {userProfile ? (
              <>
                <Text style={styles.sheetTitle}>Профиль</Text>
                <View style={styles.profileBlock}>
                  <TextInput
                    value={profileNameDraft}
                    onChangeText={setProfileNameDraft}
                    style={styles.profileInputName}
                    placeholder="Имя пользователя"
                    placeholderTextColor={theme.mutedForeground}
                    autoCapitalize="words"
                  />
                  <TextInput
                    value={profileEmailDraft}
                    onChangeText={setProfileEmailDraft}
                    style={styles.profileInputEmail}
                    placeholder="Email"
                    placeholderTextColor={theme.mutedForeground}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={() => {
                    const nextName = profileNameDraft.trim() || userProfile.displayName;
                    const nextEmail = profileEmailDraft.trim() || userProfile.email;
                    setUserProfile({ ...userProfile, displayName: nextName, email: nextEmail });
                    setAccountMenuOpen(false);
                  }}
                  activeOpacity={0.88}
                >
                  <Text style={styles.saveBtnText}>Сохранить</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.88}>
                  <Text style={styles.logoutBtnText}>Выйти</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.sheetTitle}>Войдите в аккаунт</Text>
                <Text style={styles.sheetSub}>Чтобы управлять коллекциями и предметами.</Text>
                <TouchableOpacity
                  style={styles.menuRow}
                  onPress={() => navigation.navigate("Login", { mode: "login" })}
                  activeOpacity={0.88}
                >
                  <Text style={styles.menuRowText}>Войти</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.menuRow}
                  onPress={() => navigation.navigate("Login", { mode: "register" })}
                  activeOpacity={0.88}
                >
                  <Text style={styles.menuRowText}>Регистрация</Text>
                </TouchableOpacity>
              </>
            )}

            <Text style={styles.currencyLabel}>Валюта</Text>
            <View style={styles.currencyRow}>
              {CURRENCY_CODES.map((code) => (
                <TouchableOpacity
                  key={code}
                  style={[styles.currencyChip, currency === code && styles.currencyChipOn]}
                  onPress={() => setCurrency(code)}
                  activeOpacity={0.85}
                  accessibilityLabel={getCurrencyLabel(code)}
                >
                  <CurrencyIcon
                    code={code}
                    size={22}
                    color={currency === code ? theme.primaryForeground : theme.mutedForeground}
                  />
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.currencyHint}>{getCurrencyLabel(currency)}</Text>

            {userProfile ? (
              <View style={styles.privacyRow}>
                <Text style={styles.privacyLabel}>Скрыть профиль из общего поиска</Text>
                <Switch
                  value={hideFromSearch}
                  onValueChange={setHideFromSearch}
                  trackColor={{ true: theme.primary }}
                />
              </View>
            ) : null}

            <TouchableOpacity style={styles.closeSheetBtn} onPress={() => setAccountMenuOpen(false)} activeOpacity={0.88}>
              <Text style={styles.closeSheetText}>Закрыть</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.background,
  },
  scroll: {
    paddingHorizontal: 16,
    gap: 24,
  },
  guestBanner: {
    padding: 12,
    borderRadius: theme.radiusLg,
    backgroundColor: "rgba(212,175,55,0.1)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(212,175,55,0.35)",
  },
  guestBannerText: { fontSize: 13, color: theme.foreground, lineHeight: 18 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border,
    marginHorizontal: -16,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  h1: {
    fontSize: 22,
    fontWeight: "600",
    color: theme.foreground,
    marginBottom: 4,
  },
  sub: {
    fontSize: 14,
    color: theme.mutedForeground,
  },
  accountBtn: {
    padding: 10,
    borderRadius: theme.radiusLg,
    backgroundColor: "rgba(212,175,55,0.12)",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCard: {
    width: "48%",
    flexGrow: 1,
    backgroundColor: theme.card,
    borderRadius: theme.radiusXl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
    padding: 16,
  },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 12,
    color: theme.mutedForeground,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "600",
    color: theme.foreground,
  },
  section: {
    gap: 12,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: theme.foreground,
  },
  qaRow: {
    flexDirection: "row",
    gap: 12,
  },
  qaPrimary: {
    flex: 1,
    backgroundColor: theme.primary,
    borderRadius: theme.radiusXl,
    padding: 16,
    gap: 8,
  },
  qaPrimaryText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.primaryForeground,
  },
  qaSecondary: {
    flex: 1,
    backgroundColor: theme.card,
    borderRadius: theme.radiusXl,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
    gap: 8,
  },
  qaSecondaryText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.foreground,
  },
  activityCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: theme.card,
    borderRadius: theme.radiusXl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
    padding: 12,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "rgba(212,175,55,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  activityMid: {
    flex: 1,
    minWidth: 0,
  },
  activityType: {
    fontSize: 14,
    color: theme.foreground,
    fontWeight: "500",
  },
  activityItem: {
    fontSize: 12,
    color: theme.mutedForeground,
    marginTop: 2,
  },
  activityTime: {
    fontSize: 12,
    color: theme.mutedForeground,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  accountSheet: {
    backgroundColor: theme.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.foreground,
    marginBottom: 6,
  },
  sheetSub: {
    fontSize: 13,
    color: theme.mutedForeground,
    marginBottom: 16,
  },
  profileBlock: {
    paddingVertical: 8,
    marginBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border,
  },
  profileName: { fontSize: 18, fontWeight: "600", color: theme.foreground },
  profileEmail: { fontSize: 14, color: theme.mutedForeground, marginTop: 4 },
  profileInputName: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.foreground,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  profileInputEmail: {
    fontSize: 14,
    color: theme.mutedForeground,
    paddingVertical: 6,
    paddingHorizontal: 4,
    marginTop: 4,
  },
  saveBtn: {
    marginBottom: 10,
    paddingVertical: 14,
    borderRadius: theme.radiusLg,
    backgroundColor: theme.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnText: { fontSize: 16, fontWeight: "600", color: theme.primaryForeground },
  logoutBtn: {
    marginBottom: 16,
    paddingVertical: 14,
    borderRadius: theme.radiusLg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.destructive,
    alignItems: "center",
  },
  logoutBtnText: { fontSize: 16, fontWeight: "600", color: theme.destructive },
  menuRow: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border,
  },
  menuRowText: {
    fontSize: 16,
    fontWeight: "500",
    color: theme.foreground,
  },
  currencyLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.foreground,
    marginTop: 16,
    marginBottom: 10,
  },
  currencyRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  currencyChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.radiusLg,
    backgroundColor: theme.background,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
  },
  currencyChipOn: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  currencyChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.mutedForeground,
  },
  currencyChipTextOn: {
    color: theme.primaryForeground,
  },
  currencyHint: {
    fontSize: 12,
    color: theme.mutedForeground,
    marginTop: 8,
  },
  privacyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.border,
  },
  privacyLabel: { flex: 1, fontSize: 14, color: theme.foreground, marginRight: 12 },
  closeSheetBtn: {
    marginTop: 20,
    alignItems: "center",
    paddingVertical: 14,
  },
  closeSheetText: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.primary,
  },
});
