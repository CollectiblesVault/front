import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import {
  Bookmark,
  ChevronLeft,
  Filter,
  Pencil,
  Plus,
  Search,
  Sparkles,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomNav } from "../components/BottomNav";
import { ImageWithFallback } from "../components/ImageWithFallback";
import { TabAwareScrollView } from "../components/TabAwareScrollView";
import { getPublicCollectionItemsApi } from "../api/vaultApi";
import { useAppSettings } from "../context/app-settings-context";
import { pickImageFromDevice, uploadImageFromLocalUri } from "../utils/pickAndUploadImage";
import { useCollectionsStore } from "../context/collections-store-context";
import { useWishlist } from "../context/wishlist-context";
import type { RootStackParamList } from "../navigation/types";
import { theme } from "../theme";

type Nav = NativeStackNavigationProp<RootStackParamList, "CollectionDetail">;
type R = RouteProp<RootStackParamList, "CollectionDetail">;

const colW = (Dimensions.get("window").width - 32 - 12) / 2;

export function CollectionDetailScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const route = useRoute<R>();
  const searchInputRef = useRef<TextInput>(null);
  const { formatMoney, canInteract, authToken } = useAppSettings();
  const {
    itemsForCollection,
    collectionTitle,
    collectionImage,
    updateCollection,
    collectionIsPublic,
    setCollectionVisibility,
    addItemToCollection,
  } = useCollectionsStore();
  const { isInWishlist, toggleWishlist } = useWishlist();

  const browse = route.params.browse === true;
  const previewItems = route.params.itemsPreview ?? [];
  const [browseLoadedItems, setBrowseLoadedItems] = useState<
    Array<{
      id: number;
      name: string;
      category: string;
      price: number;
      description: string;
      imageUrl: string;
      isWishlisted: boolean;
    }>
  >([]);
  const collectionItems = useMemo(() => {
    if (browse && previewItems.length > 0) {
      return previewItems.map((item) => ({
        id: Number(item.id),
        name: String(item.name),
        category: String(item.category ?? "—"),
        price: Number(item.price ?? 0) || 0,
        description: String(item.description ?? ""),
        imageUrl: String(item.imageUrl ?? ""),
        isWishlisted: false,
      }));
    }
    if (browse && browseLoadedItems.length > 0) {
      return browseLoadedItems;
    }
    return itemsForCollection(route.params.id);
  }, [browse, browseLoadedItems, itemsForCollection, previewItems, route.params.id]);

  useEffect(() => {
    let cancelled = false;
    if (!browse || previewItems.length > 0) return;
    const collectionId = Number(route.params.id);
    if (!Number.isFinite(collectionId)) return;
    (async () => {
      try {
        const items = await getPublicCollectionItemsApi({ collectionId });
        if (cancelled) return;
        const normalized = (items ?? [])
          .map((item: any) => {
            const id = Number(item?.id ?? item?.item_id);
            if (!Number.isFinite(id)) return null;
            return {
              id,
              name: String(item?.name ?? `Предмет ${id}`),
              category: String(item?.category_name ?? item?.category ?? "—"),
              price: Number(item?.price ?? 0) || 0,
              description: String(item?.description ?? ""),
              imageUrl: String(item?.image_url ?? item?.image ?? ""),
              isWishlisted: false,
            };
          })
          .filter(Boolean) as typeof browseLoadedItems;
        setBrowseLoadedItems(normalized);
      } catch {
        if (!cancelled) setBrowseLoadedItems([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [browse, previewItems.length, route.params.id]);

  const [searchQuery, setSearchQuery] = useState("");
  const [collectionEditOpen, setCollectionEditOpen] = useState(false);
  const [newItemOpen, setNewItemOpen] = useState(false);
  const [wishlistFilterOnly, setWishlistFilterOnly] = useState(false);
  const [displayName, setDisplayName] = useState(() => collectionTitle(route.params.id));
  const [collectionNameDraft, setCollectionNameDraft] = useState("");
  const [collectionImageDraft, setCollectionImageDraft] = useState("");
  const [collectionPublicDraft, setCollectionPublicDraft] = useState(false);
  const [newItemDraft, setNewItemDraft] = useState({
    name: "",
    category: "",
    price: "",
    image: "",
    description: "",
  });
  const [newItemPhotoUploading, setNewItemPhotoUploading] = useState(false);
  const [collectionCoverUploading, setCollectionCoverUploading] = useState(false);

  useEffect(() => {
    const fromRoute = route.params.collectionPreview?.name;
    setDisplayName(fromRoute?.trim() ? fromRoute : collectionTitle(route.params.id));
  }, [route.params.collectionPreview?.name, route.params.id, collectionTitle]);

  const collectionName = displayName;

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return collectionItems.filter((item) => {
      const matchSearch = !q || item.name.toLowerCase().includes(q);
      const inWl = isInWishlist(item.id);
      const matchWl = !wishlistFilterOnly || inWl;
      return matchSearch && matchWl;
    });
  }, [searchQuery, wishlistFilterOnly, collectionItems, isInWishlist]);

  const requireAuth = useCallback(
    (onAllowed: () => void) => {
      if (!canInteract) {
        Alert.alert("Гостевой режим", "Войдите в аккаунт, чтобы выполнить это действие.");
        return;
      }
      onAllowed();
    },
    [canInteract],
  );

  const openCollectionEdit = useCallback(() => {
    if (browse) return;
    requireAuth(() => {
      setCollectionNameDraft(displayName);
      setCollectionImageDraft(collectionImage(route.params.id));
      setCollectionPublicDraft(collectionIsPublic(route.params.id));
      setCollectionEditOpen(true);
    });
  }, [displayName, collectionImage, collectionIsPublic, route.params.id, requireAuth]);

  const saveCollectionEdit = useCallback(async () => {
    if (browse) return;
    const t = collectionNameDraft.trim();
    const img = collectionImageDraft.trim();
    if (t.length > 0) {
      await updateCollection(route.params.id, { name: t, ...(img.length > 0 ? { image: img } : {}) });
      setDisplayName(t);
    } else if (img.length > 0) {
      await updateCollection(route.params.id, { image: img });
    }
    await setCollectionVisibility(route.params.id, collectionPublicDraft);
    setCollectionEditOpen(false);
  }, [
    collectionNameDraft,
    collectionImageDraft,
    updateCollection,
    setCollectionVisibility,
    collectionPublicDraft,
    route.params.id,
  ]);

  const openNewItem = useCallback(() => {
    if (browse) return;
    requireAuth(() => {
      setNewItemDraft({
        name: "",
        category: "",
        price: "",
        image: "",
        description: "",
      });
      setNewItemOpen(true);
    });
  }, [browse, requireAuth]);

  const runUploadNewItemPhoto = useCallback(
    async (source: "camera" | "library") => {
      if (!authToken) {
        Alert.alert("Нужен вход", "Войдите в аккаунт, чтобы загрузить фото на сервер.");
        return;
      }
      try {
        const picked = await pickImageFromDevice(source);
        if (!picked) return;
        setNewItemPhotoUploading(true);
        const url = await uploadImageFromLocalUri({
          token: authToken,
          uri: picked.uri,
          fileName: picked.fileName,
          mimeType: picked.mimeType,
        });
        setNewItemDraft((d) => ({ ...d, image: url }));
      } catch (e: any) {
        Alert.alert("Загрузка не удалась", e?.message ? String(e.message) : "Попробуйте ещё раз.");
      } finally {
        setNewItemPhotoUploading(false);
      }
    },
    [authToken],
  );

  const openNewItemPhotoMenu = useCallback(() => {
    if (!authToken) {
      Alert.alert("Нужен вход", "Войдите в аккаунт, чтобы загрузить фото.");
      return;
    }
    if (Platform.OS === "web") {
      void runUploadNewItemPhoto("library");
      return;
    }
    Alert.alert("Фото предмета", "Файл будет загружен на сервер", [
      { text: "Камера", onPress: () => void runUploadNewItemPhoto("camera") },
      { text: "Галерея", onPress: () => void runUploadNewItemPhoto("library") },
      { text: "Отмена", style: "cancel" },
    ]);
  }, [authToken, runUploadNewItemPhoto]);

  const runUploadCollectionCover = useCallback(
    async (source: "camera" | "library") => {
      if (!authToken) {
        Alert.alert("Нужен вход", "Войдите в аккаунт, чтобы загрузить обложку.");
        return;
      }
      try {
        const picked = await pickImageFromDevice(source);
        if (!picked) return;
        setCollectionCoverUploading(true);
        const url = await uploadImageFromLocalUri({
          token: authToken,
          uri: picked.uri,
          fileName: picked.fileName,
          mimeType: picked.mimeType,
        });
        setCollectionImageDraft(url);
      } catch (e: any) {
        Alert.alert("Загрузка не удалась", e?.message ? String(e.message) : "Попробуйте ещё раз.");
      } finally {
        setCollectionCoverUploading(false);
      }
    },
    [authToken],
  );

  const openCollectionCoverMenu = useCallback(() => {
    if (!authToken) {
      Alert.alert("Нужен вход", "Войдите в аккаунт, чтобы загрузить обложку.");
      return;
    }
    if (Platform.OS === "web") {
      void runUploadCollectionCover("library");
      return;
    }
    Alert.alert("Обложка коллекции", "Файл будет загружен на сервер", [
      { text: "Камера", onPress: () => void runUploadCollectionCover("camera") },
      { text: "Галерея", onPress: () => void runUploadCollectionCover("library") },
      { text: "Отмена", style: "cancel" },
    ]);
  }, [authToken, runUploadCollectionCover]);

  const submitNewItem = useCallback(() => {
    const price = Number.parseFloat(newItemDraft.price.replace(/\s/g, "").replace(",", "."));
    if (!newItemDraft.name.trim() || Number.isNaN(price)) {
      Alert.alert("Проверьте данные", "Укажите название и цену.");
      return;
    }
    const img = newItemDraft.image.trim();
    if (img.startsWith("file:") || img.startsWith("content:") || img.startsWith("ph://") || img.startsWith("assets-library:")) {
      Alert.alert("Фото не загружено", "Сначала загрузите снимок на сервер.");
      return;
    }
    addItemToCollection(route.params.id, {
      name: newItemDraft.name.trim(),
      category: newItemDraft.category.trim() || "Разное",
      price,
      imageUrl: img || collectionImage(route.params.id),
      description: newItemDraft.description.trim(),
    });
    setNewItemOpen(false);
  }, [newItemDraft, addItemToCollection, route.params.id, collectionImage]);

  const onBookmarkItem = useCallback(
    (item: (typeof collectionItems)[number]) => {
      requireAuth(() => {
        void toggleWishlist({
          id: item.id,
          name: item.name,
          category: item.category,
          estimatedPrice: item.price,
          image: item.imageUrl,
          notes: "",
        });
      });
    },
    [requireAuth, toggleWishlist],
  );

  const showOwnChrome = canInteract && !browse;

  return (
    <View style={styles.root}>
      <View style={[styles.stickyHeader, { paddingTop: insets.top + 8 }]}>
        {!canInteract ? (
          <View style={styles.guestBanner}>
            <Text style={styles.guestBannerText}>Доступ к редактированию доступен только после входа.</Text>
          </View>
        ) : null}
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            hitSlop={8}
          >
            <ChevronLeft size={26} color={theme.foreground} strokeWidth={2} />
          </TouchableOpacity>
          <View style={styles.headerTitle}>
            <View style={styles.titleLine}>
              <View style={styles.titleWithPencil}>
                <Text style={styles.h1} numberOfLines={1}>
                  {collectionName}
                </Text>
                {showOwnChrome ? (
                  <TouchableOpacity onPress={openCollectionEdit} hitSlop={8} style={styles.titleEditBtn}>
                    <Pencil size={18} color={theme.primary} />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
            <Text style={styles.sub}>{collectionItems.length} предметов</Text>
          </View>
          {/* В MVP: без кнопок «поделиться/комментарии/избранное» на уровне коллекции */}
        </View>
        <View style={styles.searchRow}>
          <Search size={16} color={theme.mutedForeground} style={{ marginLeft: 12 }} />
          <TextInput
            ref={searchInputRef}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Поиск по предметам..."
            placeholderTextColor={theme.mutedForeground}
            style={styles.searchInput}
          />
          <TouchableOpacity
            style={[styles.filterBtn, wishlistFilterOnly && styles.filterBtnOn]}
            onPress={() => requireAuth(() => setWishlistFilterOnly((v) => !v))}
            accessibilityLabel="Только список желаний"
          >
            <Filter size={16} color={wishlistFilterOnly ? theme.primary : theme.mutedForeground} />
          </TouchableOpacity>
        </View>
        {wishlistFilterOnly ? (
          <Text style={styles.filterHint}>Только предметы из списка желаний</Text>
        ) : null}
        {showOwnChrome ? (
          <TouchableOpacity style={styles.addItemBtn} onPress={openNewItem} activeOpacity={0.9}>
            <Plus size={18} color={theme.primaryForeground} style={{ marginRight: 8 }} />
            <Text style={styles.addItemBtnText}>Добавить предмет</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <TabAwareScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 96 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.grid}>
          {filteredItems.map((item) => {
            const desc = (item.description ?? "").trim();
            const preview = desc.length > 20 ? `${desc.slice(0, 20)}…` : desc || "—";
            return (
              <View key={item.id} style={[styles.card, { width: colW }]}>
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate("ItemDetail", {
                    id: String(item.id),
                    browse,
                    collectionId: route.params.id,
                    itemPreview: {
                      id: item.id,
                      name: item.name,
                      category: item.category,
                      price: item.price,
                      description: item.description,
                      imageUrl: item.imageUrl,
                    },
                  })
                }
                activeOpacity={0.92}
              >
                <View style={styles.imageWrap}>
                  <ImageWithFallback uri={item.imageUrl} style={styles.image} />
                  {item.price >= 40000 ? (
                    <View style={styles.topBadge}>
                      <Sparkles size={12} color={theme.primary} />
                      <Text style={styles.topBadgeText}>Топ-лот</Text>
                    </View>
                  ) : null}
                  <TouchableOpacity
                    style={styles.bookmarkFab}
                    activeOpacity={0.85}
                    onPress={() => onBookmarkItem(item)}
                  >
                    <Bookmark
                      size={16}
                      color={isInWishlist(item.id) ? theme.primary : "#fff"}
                      fill={isInWishlist(item.id) ? theme.primary : "transparent"}
                    />
                  </TouchableOpacity>
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.itemDescPreview} numberOfLines={2}>
                    {preview}
                  </Text>
                  <Text style={styles.itemName} numberOfLines={1}>
                    {item.name}
                  </Text>

                  <View style={styles.itemRow}>
                    <Text style={styles.price}>{formatMoney(item.price)}</Text>
                  </View>

                </View>
              </TouchableOpacity>
              </View>
            );
          })}
        </View>
        {filteredItems.length === 0 ? (
          <Text style={styles.empty}>Нет предметов по текущим фильтрам</Text>
        ) : null}
      </TabAwareScrollView>

      <Modal visible={collectionEditOpen} animationType="fade" transparent>
        <KeyboardAvoidingView
          style={styles.modalKb}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 20 : 0}
        >
          <Pressable style={styles.modalBackdropCenter} onPress={() => setCollectionEditOpen(false)}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              contentContainerStyle={styles.modalScrollCenter}
              showsVerticalScrollIndicator={false}
            >
              <Pressable onPress={(e) => e.stopPropagation()}>
                <View style={[styles.editSheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                  <Text style={styles.menuTitle}>Коллекция</Text>
                  <Text style={styles.fieldHint}>Название</Text>
                  <TextInput
                    value={collectionNameDraft}
                    onChangeText={setCollectionNameDraft}
                    placeholder="Название"
                    placeholderTextColor={theme.mutedForeground}
                    style={styles.editInput}
                  />
                  <View style={styles.publicRow}>
                    <Text style={styles.publicLabel}>Публичная коллекция</Text>
                    <Switch
                      value={collectionPublicDraft}
                      onValueChange={setCollectionPublicDraft}
                      trackColor={{ false: theme.border, true: theme.primary }}
                      thumbColor={collectionPublicDraft ? theme.primaryForeground : theme.mutedForeground}
                    />
                  </View>
                  <Text style={styles.fieldHint}>Обложка</Text>
                  <TouchableOpacity
                    style={[styles.photoPickBtn, collectionCoverUploading && { opacity: 0.6 }]}
                    onPress={openCollectionCoverMenu}
                    disabled={collectionCoverUploading}
                    activeOpacity={0.88}
                  >
                    <Text style={styles.photoPickBtnText}>
                      {collectionCoverUploading
                        ? "Загрузка…"
                        : Platform.OS === "web"
                          ? "Выбрать изображение"
                          : "Камера или галерея"}
                    </Text>
                  </TouchableOpacity>
                  {collectionImageDraft.trim().length > 0 ? (
                    <View style={styles.previewWrap}>
                      <ImageWithFallback uri={collectionImageDraft.trim()} style={styles.previewImg} borderRadius={12} />
                    </View>
                  ) : null}
                  <View style={styles.editActions}>
                    <TouchableOpacity style={styles.editCancel} onPress={() => setCollectionEditOpen(false)} activeOpacity={0.88}>
                      <Text style={styles.editCancelText}>Отмена</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.editSave} onPress={() => void saveCollectionEdit()} activeOpacity={0.88}>
                      <Text style={styles.editSaveText}>Сохранить</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Pressable>
            </ScrollView>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={newItemOpen} animationType="fade" transparent>
        <KeyboardAvoidingView
          style={styles.modalKb}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 20 : 0}
        >
          <Pressable style={styles.modalBackdropCenter} onPress={() => setNewItemOpen(false)}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              contentContainerStyle={styles.modalScrollCenter}
              showsVerticalScrollIndicator={false}
            >
              <Pressable onPress={(e) => e.stopPropagation()}>
                <View style={[styles.editSheet, styles.editSheetTall, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                  <Text style={styles.menuTitle}>Новый предмет</Text>
                  <TextInput
                    value={newItemDraft.name}
                    onChangeText={(t) => setNewItemDraft((d) => ({ ...d, name: t }))}
                    placeholder="Название"
                    placeholderTextColor={theme.mutedForeground}
                    style={styles.editInput}
                  />
                  <TextInput
                    value={newItemDraft.category}
                    onChangeText={(t) => setNewItemDraft((d) => ({ ...d, category: t }))}
                    placeholder="Категория"
                    placeholderTextColor={theme.mutedForeground}
                    style={styles.editInput}
                  />
                  <TextInput
                    value={newItemDraft.price}
                    onChangeText={(t) => setNewItemDraft((d) => ({ ...d, price: t }))}
                    placeholder="Цена (USD)"
                    keyboardType="decimal-pad"
                    placeholderTextColor={theme.mutedForeground}
                    style={styles.editInput}
                  />
                  <Text style={styles.fieldHint}>Фото</Text>
                  <TouchableOpacity
                    style={[styles.photoPickBtn, newItemPhotoUploading && { opacity: 0.6 }]}
                    onPress={openNewItemPhotoMenu}
                    disabled={newItemPhotoUploading}
                    activeOpacity={0.88}
                  >
                    <Text style={styles.photoPickBtnText}>
                      {newItemPhotoUploading
                        ? "Загрузка…"
                        : Platform.OS === "web"
                          ? "Выбрать изображение"
                          : "Камера или галерея"}
                    </Text>
                  </TouchableOpacity>

                  {newItemDraft.image.trim().length > 0 ? (
                    <View style={styles.photoPreviewWrap}>
                      <ImageWithFallback
                        uri={newItemDraft.image.trim()}
                        style={styles.photoPreview}
                        borderRadius={14}
                      />
                      <TouchableOpacity
                        style={styles.photoClearBtn}
                        onPress={() => setNewItemDraft((d) => ({ ...d, image: "" }))}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.photoClearText}>Очистить</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}

                  <TextInput
                    value={newItemDraft.description}
                    onChangeText={(t) => setNewItemDraft((d) => ({ ...d, description: t }))}
                    placeholder="Описание"
                    placeholderTextColor={theme.mutedForeground}
                    style={[styles.editInput, styles.editInputMultiline]}
                    multiline
                  />
                  <View style={styles.editActions}>
                    <TouchableOpacity style={styles.editCancel} onPress={() => setNewItemOpen(false)} activeOpacity={0.88}>
                      <Text style={styles.editCancelText}>Отмена</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.editSave} onPress={submitNewItem} activeOpacity={0.88}>
                      <Text style={styles.editSaveText}>Добавить</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Pressable>
            </ScrollView>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.background },
  modalKb: { flex: 1 },
  guestBanner: {
    marginBottom: 10,
    padding: 10,
    borderRadius: theme.radiusLg,
    backgroundColor: "rgba(212,175,55,0.08)",
  },
  guestBannerText: { fontSize: 12, color: theme.mutedForeground, lineHeight: 16 },
  stickyHeader: {
    backgroundColor: theme.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border,
    paddingHorizontal: 16,
    paddingBottom: 12,
    zIndex: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginBottom: 12,
  },
  backBtn: { marginLeft: -8, padding: 8 },
  headerTitle: { flex: 1, minWidth: 0 },
  titleLine: { width: "100%" },
  titleWithPencil: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    minWidth: 0,
    justifyContent: "space-between",
  },
  titleEditBtn: { padding: 4, flexShrink: 0 },
  h1: { fontSize: 17, fontWeight: "600", color: theme.foreground, flexShrink: 1 },
  sub: { fontSize: 12, color: theme.mutedForeground, marginTop: 2 },
  iconBtn: { padding: 8 },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.card,
    borderRadius: theme.radiusLg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
    height: 44,
    paddingRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 10,
    color: theme.foreground,
    fontSize: 15,
  },
  filterBtn: { padding: 8 },
  filterBtnOn: { backgroundColor: "rgba(212,175,55,0.12)", borderRadius: 8 },
  filterHint: { fontSize: 12, color: theme.mutedForeground, marginTop: 8 },
  addItemBtn: {
    marginTop: 12,
    height: 44,
    borderRadius: theme.radiusLg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.primary,
    backgroundColor: theme.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  addItemBtnText: { color: theme.primaryForeground, fontWeight: "700", fontSize: 15 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  card: {
    backgroundColor: theme.card,
    borderRadius: theme.radiusXl,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
  },
  imageWrap: { aspectRatio: 1, width: "100%" },
  image: { width: "100%", height: "100%" },
  topBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  topBadgeText: { fontSize: 10, fontWeight: "700", color: theme.primary },
  bookmarkFab: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: { padding: 12 },
  itemName: {
    fontSize: 12,
    color: theme.foreground,
    fontWeight: "500",
    minHeight: 36,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  price: { fontSize: 12, fontWeight: "700", color: theme.primary },
  itemDescPreview: { fontSize: 12, color: theme.mutedForeground, lineHeight: 16, minHeight: 32 },
  likesCommentsRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  likeChip: { flexDirection: "row", gap: 6, alignItems: "center" },
  likeChipText: { fontSize: 12, fontWeight: "600", color: theme.mutedForeground },
  itemEditBtn: {
    marginTop: 10,
    height: 38,
    borderRadius: theme.radiusLg,
    backgroundColor: theme.primary,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  itemEditBtnText: { color: theme.primaryForeground, fontWeight: "700", fontSize: 13 },
  year: { fontSize: 12, color: theme.mutedForeground },
  empty: { textAlign: "center", color: theme.mutedForeground, marginTop: 24, fontSize: 14 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalBackdropCenter: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
  },
  modalScrollCenter: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  menuTitle: { fontSize: 17, fontWeight: "600", color: theme.foreground, marginBottom: 12 },
  commentsSheet: {
    maxHeight: "92%",
    width: "100%",
    backgroundColor: theme.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  commentsList: { flexGrow: 0, flexShrink: 1, maxHeight: 360 },
  commentCard: {
    padding: 12,
    marginBottom: 8,
    backgroundColor: theme.background,
    borderRadius: theme.radiusLg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
  },
  commentUser: { fontSize: 13, fontWeight: "600", color: theme.foreground },
  commentText: { fontSize: 14, color: theme.foreground, marginTop: 4 },
  commentTime: { fontSize: 11, color: theme.mutedForeground, marginTop: 6 },
  composerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  composerInput: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
    borderRadius: theme.radiusLg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: theme.foreground,
    fontSize: 14,
  },
  composerSend: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: theme.primary,
    borderRadius: theme.radiusLg,
  },
  composerSendText: { color: theme.primaryForeground, fontWeight: "700", fontSize: 13 },
  menuClose: { alignItems: "center", paddingVertical: 12 },
  menuCloseText: { fontSize: 16, fontWeight: "600", color: theme.primary },
  editSheet: {
    backgroundColor: theme.card,
    borderRadius: theme.radiusXl,
    padding: 16,
    alignSelf: "center",
    width: "100%",
    maxWidth: 400,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
  },
  editSheetTall: { maxWidth: 440 },
  fieldHint: { fontSize: 12, color: theme.mutedForeground, marginBottom: 6 },
  publicRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    gap: 12,
  },
  publicLabel: { fontSize: 13, fontWeight: "600", color: theme.foreground },
  previewWrap: { marginBottom: 12, borderRadius: 12, overflow: "hidden", maxHeight: 160 },
  previewImg: { width: "100%", height: 140 },
  photoPreviewWrap: { marginBottom: 12, borderRadius: 12, overflow: "hidden", maxHeight: 160, position: "relative" as const },
  photoPreview: { width: "100%", height: 140 },
  photoClearBtn: {
    position: "absolute",
    right: 10,
    bottom: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: theme.radiusLg,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.35)",
  },
  photoClearText: { color: theme.primaryForeground, fontWeight: "700", fontSize: 13 },
  photoPickRow: { flexDirection: "row", gap: 10, marginBottom: 2 },
  photoPickBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: theme.radiusLg,
    backgroundColor: theme.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.primary,
  },
  photoPickBtnText: { color: theme.primaryForeground, fontWeight: "700", fontSize: 14 },
  photoPickBtnOutline: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: theme.radiusLg,
    backgroundColor: theme.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
  },
  photoPickBtnOutlineText: { color: theme.foreground, fontWeight: "700", fontSize: 14 },
  editInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
    borderRadius: theme.radiusLg,
    padding: 12,
    fontSize: 16,
    color: theme.foreground,
    marginBottom: 10,
  },
  editInputMultiline: { minHeight: 88, textAlignVertical: "top" },
  editActions: { flexDirection: "row", justifyContent: "flex-end", gap: 12, marginTop: 8 },
  editCancel: { paddingVertical: 10, paddingHorizontal: 16 },
  editCancelText: { color: theme.mutedForeground, fontWeight: "600" },
  editSave: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: theme.primary,
    borderRadius: theme.radiusLg,
  },
  editSaveText: { color: theme.primaryForeground, fontWeight: "600" },
});
