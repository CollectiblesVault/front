import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Grid3x3, List, Plus, WifiOff } from "lucide-react-native";
import { useMemo, useState } from "react";
import {
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomNav } from "../components/BottomNav";
import { Skeleton } from "../components/Skeleton";
import { ImageWithFallback } from "../components/ImageWithFallback";
import { OfflineBanner } from "../components/OfflineBanner";
import { TabAwareScrollView } from "../components/TabAwareScrollView";
import { useAppSettings } from "../context/app-settings-context";
import { useCollectionsStore } from "../context/collections-store-context";
import type { RootStackParamList } from "../navigation/types";
import { theme } from "../theme";
import { pickImageFromDevice, uploadImageFromLocalUri } from "../utils/pickAndUploadImage";

type Nav = NativeStackNavigationProp<RootStackParamList, "Collections">;

const gap = 12;
const pad = 16;
const colW = (Dimensions.get("window").width - pad * 2 - gap) / 2;

function getMasonryAspect(seed: number) {
  const normalized = Math.abs(Math.sin(seed || 1));
  return 0.78 + normalized * 0.45;
}

export function CollectionsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { formatMoney, canInteract, authToken } = useAppSettings();
  const { collectionsList, addCollection, isLoadingCollections } = useCollectionsStore();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isOffline] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhoto, setNewPhoto] = useState("");
  const [newCollectionPhotoUploading, setNewCollectionPhotoUploading] = useState(false);

  const totalItems = collectionsList.reduce((s, c) => s + c.itemCount, 0);
  const gridColumns = useMemo(() => {
    const left: typeof collectionsList = [];
    const right: typeof collectionsList = [];
    let leftScore = 0;
    let rightScore = 0;
    collectionsList.forEach((c, index) => {
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
  }, [collectionsList]);

  const submitNewCollection = async () => {
    if (!canInteract) {
      Alert.alert("Нужен вход", "Создание коллекции доступно после входа в аккаунт.");
      return;
    }
    const photo = newPhoto.trim();
    if (
      photo.startsWith("file:") ||
      photo.startsWith("content:") ||
      photo.startsWith("ph://") ||
      photo.startsWith("assets-library:")
    ) {
      Alert.alert("Обложка не загружена", "Сначала загрузите фото на сервер или оставьте обложку пустой.");
      return;
    }
    const id = await addCollection(newName, photo);
    if (id == null) {
      Alert.alert("Ошибка", "Введите название коллекции.");
      return;
    }
    setNewName("");
    setNewPhoto("");
    setCreateOpen(false);
    navigation.navigate("CollectionDetail", { id: String(id) });
  };

  const runUploadNewCollectionPhoto = async (source: "camera" | "library") => {
    if (!authToken) {
      Alert.alert("Нужен вход", "Войдите в аккаунт, чтобы загрузить обложку.");
      return;
    }
    try {
      const picked = await pickImageFromDevice(source);
      if (!picked) return;
      setNewCollectionPhotoUploading(true);
      const url = await uploadImageFromLocalUri({
        token: authToken,
        uri: picked.uri,
        fileName: picked.fileName,
        mimeType: picked.mimeType,
      });
      setNewPhoto(url);
    } catch (e: any) {
      Alert.alert("Загрузка не удалась", e?.message ? String(e.message) : "Попробуйте ещё раз.");
    } finally {
      setNewCollectionPhotoUploading(false);
    }
  };

  const openNewCollectionPhotoMenu = () => {
    if (Platform.OS === "web") {
      Alert.alert("Web", "Вставьте ссылку на обложку в поле ниже.");
      return;
    }
    if (!authToken) {
      Alert.alert("Нужен вход", "Войдите в аккаунт, чтобы загрузить обложку.");
      return;
    }
    Alert.alert("Обложка коллекции", "Файл будет загружен на сервер", [
      { text: "Камера", onPress: () => void runUploadNewCollectionPhoto("camera") },
      { text: "Галерея", onPress: () => void runUploadNewCollectionPhoto("library") },
      { text: "Отмена", style: "cancel" },
    ]);
  };

  return (
    <View style={styles.root}>
      <OfflineBanner isOffline={isOffline} />
      <View style={[styles.stickyHeader, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.h1}>Collections</Text>
            <Text style={styles.sub}>
              {collectionsList.length} collections • {totalItems} items
            </Text>
          </View>
          <View style={styles.toggleRow}>
            <TouchableOpacity
              onPress={() => setViewMode("grid")}
              style={[styles.toggleBtn, viewMode === "grid" ? styles.toggleOn : styles.toggleOff]}
            >
              <Grid3x3
                size={18}
                color={viewMode === "grid" ? theme.primaryForeground : theme.mutedForeground}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setViewMode("list")}
              style={[styles.toggleBtn, viewMode === "list" ? styles.toggleOn : styles.toggleOff]}
            >
              <List
                size={18}
                color={viewMode === "list" ? theme.primaryForeground : theme.mutedForeground}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <TabAwareScrollView
        contentContainerStyle={{ paddingHorizontal: pad, paddingTop: 16, paddingBottom: 96 }}
        showsVerticalScrollIndicator={false}
      >
        {isLoadingCollections ? (
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
            <View style={{ gap: 12 }}>
              {[0, 1, 2, 3].map((i) => (
                <View key={i} style={styles.listCard}>
                  <Skeleton style={{ width: 80, height: 80, borderRadius: 10 }} />
                  <View style={{ flex: 1, minWidth: 0, justifyContent: "center", gap: 10 }}>
                    <Skeleton style={{ height: 14, width: "70%" }} />
                    <Skeleton style={{ height: 10, width: "55%" }} />
                    <Skeleton style={{ height: 12, width: "40%" }} />
                  </View>
                </View>
              ))}
            </View>
          )
        ) : viewMode === "grid" ? (
          <View style={styles.masonry}>
            {gridColumns.map((column, colIndex) => (
              <View key={`masonry-col-${colIndex}`} style={styles.masonryCol}>
                {column.map((c, idx) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.gridCard, { width: colW }]}
                    onPress={() => navigation.navigate("CollectionDetail", { id: String(c.id) })}
                    activeOpacity={0.9}
                  >
                    <View style={[styles.gridImageWrap, { aspectRatio: getMasonryAspect(Number(c.id) || idx + 1) }]}>
                      <ImageWithFallback uri={c.imageUrl} style={styles.gridImage} borderRadius={0} />
                    </View>
                    <View style={styles.gridMeta}>
                      <Text style={styles.cardTitle} numberOfLines={1}>
                        {c.name}
                      </Text>
                      <Text style={styles.cardSub}>{c.itemCount} items</Text>
                      <Text style={styles.cardPrice}>{formatMoney(c.totalValue)}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {collectionsList.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={styles.listCard}
                onPress={() => navigation.navigate("CollectionDetail", { id: String(c.id) })}
                activeOpacity={0.9}
              >
                <View style={styles.listThumb}>
                  <ImageWithFallback uri={c.imageUrl} style={styles.listImage} borderRadius={10} />
                </View>
                <View style={styles.listMeta}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {c.name}
                  </Text>
                  <Text style={styles.cardSub}>{c.itemCount} items</Text>
                  <Text style={styles.cardPrice}>{formatMoney(c.totalValue)}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {canInteract ? (
          <TouchableOpacity
            style={[styles.addBtn, isOffline && styles.addBtnDisabled]}
            disabled={isOffline}
            activeOpacity={0.9}
            onPress={() => setCreateOpen(true)}
          >
            {isOffline ? (
              <>
                <WifiOff size={20} color={theme.primaryForeground} style={{ marginRight: 8 }} />
                <Text style={styles.addBtnText}>Offline</Text>
              </>
            ) : (
              <>
                <Plus size={20} color={theme.primaryForeground} style={{ marginRight: 8 }} />
                <Text style={styles.addBtnText}>New Collection</Text>
              </>
            )}
          </TouchableOpacity>
        ) : null}
      </TabAwareScrollView>

      <Modal visible={createOpen} animationType="fade" transparent>
        <KeyboardAvoidingView
          style={styles.modalKb}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 20 : 0}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setCreateOpen(false)}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              contentContainerStyle={styles.modalScrollCenter}
              showsVerticalScrollIndicator={false}
            >
              <Pressable onPress={(e) => e.stopPropagation()}>
                <View style={[styles.createSheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                  <Text style={styles.createTitle}>Новая коллекция</Text>
                  <TextInput
                    value={newName}
                    onChangeText={setNewName}
                    placeholder="Название"
                    placeholderTextColor={theme.mutedForeground}
                    style={styles.createInput}
                  />
                  <Text style={styles.createFieldHint}>Обложка (необязательно)</Text>
                  {Platform.OS !== "web" ? (
                    <TouchableOpacity
                      style={[styles.photoPickBtn, newCollectionPhotoUploading && { opacity: 0.6 }]}
                      onPress={openNewCollectionPhotoMenu}
                      disabled={newCollectionPhotoUploading}
                      activeOpacity={0.88}
                    >
                      <Text style={styles.photoPickBtnText}>
                        {newCollectionPhotoUploading ? "Загрузка…" : "Камера или галерея"}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                  <Text style={styles.createFieldHintMuted}>Или ссылка https://…</Text>
                  <TextInput
                    value={newPhoto}
                    onChangeText={setNewPhoto}
                    placeholder="https://…"
                    placeholderTextColor={theme.mutedForeground}
                    style={styles.createInput}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {newPhoto.trim().length > 0 ? (
                    <View style={styles.photoPreviewWrap}>
                      <ImageWithFallback uri={newPhoto.trim()} style={styles.photoPreview} borderRadius={14} />
                      <TouchableOpacity
                        style={styles.photoClearBtn}
                        onPress={() => setNewPhoto("")}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.photoClearText}>Очистить</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                  <View style={styles.createActions}>
                    <TouchableOpacity style={styles.createCancel} onPress={() => setCreateOpen(false)} activeOpacity={0.88}>
                      <Text style={styles.createCancelText}>Отмена</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.createOk} onPress={submitNewCollection} activeOpacity={0.88}>
                      <Text style={styles.createOkText}>Создать</Text>
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
  stickyHeader: {
    backgroundColor: theme.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border,
    paddingHorizontal: 16,
    paddingBottom: 12,
    zIndex: 10,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  h1: { fontSize: 20, fontWeight: "600", color: theme.foreground },
  sub: { fontSize: 14, color: theme.mutedForeground, marginTop: 4, opacity: 0.95 },
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
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  masonry: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  masonryCol: {
    width: colW,
    gap: 12,
  },
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
  cardTitle: { fontSize: 32 / 2, fontWeight: "500", color: theme.foreground, marginBottom: 4 },
  cardSub: { fontSize: 14 / 1.2, color: theme.mutedForeground },
  cardPrice: { fontSize: 28 / 2, color: theme.primary, marginTop: 6, fontWeight: "500" },
  listCard: {
    flexDirection: "row",
    gap: 12,
    padding: 12,
    backgroundColor: theme.card,
    borderRadius: theme.radiusXl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
  },
  listThumb: { width: 80, height: 80, borderRadius: 10, overflow: "hidden" },
  listImage: { width: "100%", height: "100%" },
  listMeta: { flex: 1, minWidth: 0, justifyContent: "center" },
  addBtn: {
    marginTop: 24,
    height: 48,
    borderRadius: theme.radiusLg,
    backgroundColor: theme.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  addBtnDisabled: { opacity: 0.5 },
  addBtnText: { color: theme.primaryForeground, fontWeight: "600", fontSize: 16 },
  modalKb: { flex: 1 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 24,
  },
  modalScrollCenter: {
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: 24,
  },
  createSheet: {
    backgroundColor: theme.card,
    borderRadius: theme.radiusXl,
    padding: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
  },
  createTitle: { fontSize: 18, fontWeight: "600", color: theme.foreground, marginBottom: 12 },
  createFieldHint: { fontSize: 12, color: theme.mutedForeground, marginBottom: 8 },
  createFieldHintMuted: { fontSize: 11, color: theme.mutedForeground, marginBottom: 8, opacity: 0.9 },
  createInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
    borderRadius: theme.radiusLg,
    padding: 14,
    fontSize: 16,
    color: theme.foreground,
    marginBottom: 16,
  },
  createActions: { flexDirection: "row", justifyContent: "flex-end", gap: 12 },
  createCancel: { paddingVertical: 12, paddingHorizontal: 16 },
  createCancelText: { color: theme.mutedForeground, fontWeight: "600" },
  createOk: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: theme.primary,
    borderRadius: theme.radiusLg,
  },
  createOkText: { color: theme.primaryForeground, fontWeight: "700" },
  photoPreviewWrap: { marginBottom: 16, borderRadius: 12, overflow: "hidden", position: "relative" as const },
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
  photoPickRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  photoPickBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: theme.radiusLg,
    backgroundColor: theme.primary,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  photoPickBtnText: { color: theme.primaryForeground, fontWeight: "700", fontSize: 14 },
  photoPickBtnOutline: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: theme.radiusLg,
    backgroundColor: theme.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
    alignItems: "center",
    justifyContent: "center",
  },
  photoPickBtnOutlineText: { color: theme.foreground, fontWeight: "700", fontSize: 14 },
});
