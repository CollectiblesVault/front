import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Grid3x3, List, Plus, WifiOff } from "lucide-react-native";
import { useState } from "react";
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
import { ImageWithFallback } from "../components/ImageWithFallback";
import { OfflineBanner } from "../components/OfflineBanner";
import { TabAwareScrollView } from "../components/TabAwareScrollView";
import { useAppSettings } from "../context/app-settings-context";
import { useCollectionsStore } from "../context/collections-store-context";
import type { RootStackParamList } from "../navigation/types";
import { theme } from "../theme";

type Nav = NativeStackNavigationProp<RootStackParamList, "Collections">;

const gap = 12;
const pad = 16;
const colW = (Dimensions.get("window").width - pad * 2 - gap) / 2;

export function CollectionsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { formatMoney, canInteract } = useAppSettings();
  const { collectionsList, addCollection } = useCollectionsStore();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isOffline] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhoto, setNewPhoto] = useState("");

  const totalItems = collectionsList.reduce((s, c) => s + c.itemCount, 0);

  const submitNewCollection = () => {
    if (!canInteract) {
      Alert.alert("Нужен вход", "Создание коллекции доступно после входа в аккаунт.");
      return;
    }
    const id = addCollection(newName, newPhoto);
    if (id == null) {
      Alert.alert("Ошибка", "Введите название коллекции.");
      return;
    }
    setNewName("");
    setNewPhoto("");
    setCreateOpen(false);
    navigation.navigate("CollectionDetail", { id: String(id) });
  };

  const pickNewCollectionPhoto = async (source: "camera" | "library") => {
    try {
      if (Platform.OS === "web") {
        Alert.alert("Web-режим", "На web выберите фото по URL в поле ниже.");
        return;
      }

      const ImagePicker = await import("expo-image-picker");
      if (source === "camera") {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (perm.status !== "granted") {
          Alert.alert("Нет доступа к камере", "Дайте разрешение, чтобы сделать фото.");
          return;
        }
        const res = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.85,
        });
        const uri = res.assets?.[0]?.uri;
        if (!res.canceled && uri) {
          setNewPhoto(uri);
        }
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (perm.status !== "granted") {
          Alert.alert("Нет доступа к галерее", "Дайте разрешение, чтобы выбрать фото.");
          return;
        }
        const res = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.85,
        });
        const uri = res.assets?.[0]?.uri;
        if (!res.canceled && uri) {
          setNewPhoto(uri);
        }
      }
    } catch {
      Alert.alert("Ошибка", "Не удалось выбрать фото. Попробуйте ещё раз.");
    }
  };

  return (
    <View style={styles.root}>
      <OfflineBanner isOffline={isOffline} />
      <View style={[styles.stickyHeader, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.h1}>Мои коллекции</Text>
            <Text style={styles.sub}>
              {collectionsList.length} коллекций • {totalItems} предметов
            </Text>
          </View>
          <View style={styles.toggleRow}>
            <TouchableOpacity
              onPress={() => setViewMode("grid")}
              style={[styles.toggleBtn, viewMode === "grid" ? styles.toggleOn : styles.toggleOff]}
            >
              <Grid3x3
                size={20}
                color={viewMode === "grid" ? theme.primaryForeground : theme.mutedForeground}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setViewMode("list")}
              style={[styles.toggleBtn, viewMode === "list" ? styles.toggleOn : styles.toggleOff]}
            >
              <List
                size={20}
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
        {viewMode === "grid" ? (
          <View style={styles.grid}>
            {collectionsList.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[styles.gridCard, { width: colW }]}
                onPress={() => navigation.navigate("CollectionDetail", { id: String(c.id) })}
                activeOpacity={0.9}
              >
                <View style={styles.gridImageWrap}>
                  <ImageWithFallback uri={c.image} style={styles.gridImage} borderRadius={0} />
                </View>
                <View style={styles.gridMeta}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {c.name}
                  </Text>
                  <Text style={styles.cardSub}>{c.itemCount} предметов</Text>
                  <Text style={styles.cardPrice}>{formatMoney(c.totalValue)}</Text>
                </View>
              </TouchableOpacity>
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
                  <ImageWithFallback uri={c.image} style={styles.listImage} borderRadius={10} />
                </View>
                <View style={styles.listMeta}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {c.name}
                  </Text>
                  <Text style={styles.cardSub}>{c.itemCount} предметов</Text>
                  <Text style={styles.cardPrice}>{formatMoney(c.totalValue)}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.addBtn,
            (isOffline || !canInteract) && styles.addBtnDisabled,
          ]}
          disabled={isOffline}
          activeOpacity={0.9}
          onPress={() => {
            if (!canInteract) {
              Alert.alert("Нужен вход", "Создайте аккаунт или войдите, чтобы добавить коллекцию.");
              return;
            }
            setCreateOpen(true);
          }}
        >
          {isOffline ? (
            <>
              <WifiOff size={20} color={theme.primaryForeground} style={{ marginRight: 8 }} />
              <Text style={styles.addBtnText}>Офлайн — нельзя добавить</Text>
            </>
          ) : (
            <>
              <Plus size={20} color={theme.primaryForeground} style={{ marginRight: 8 }} />
              <Text style={styles.addBtnText}>
                {canInteract ? "Новая коллекция" : "Новая коллекция (вход)"}
              </Text>
            </>
          )}
        </TouchableOpacity>
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

                  {Platform.OS !== "web" ? (
                    <View style={styles.photoPickRow}>
                      <TouchableOpacity
                        style={styles.photoPickBtn}
                        onPress={() => pickNewCollectionPhoto("camera")}
                        activeOpacity={0.88}
                      >
                        <Text style={styles.photoPickBtnText}>Камера</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.photoPickBtnOutline}
                        onPress={() => pickNewCollectionPhoto("library")}
                        activeOpacity={0.88}
                      >
                        <Text style={styles.photoPickBtnOutlineText}>Галерея</Text>
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
  sub: { fontSize: 14, color: theme.mutedForeground, marginTop: 4 },
  toggleRow: { flexDirection: "row", gap: 8 },
  toggleBtn: {
    padding: 10,
    borderRadius: theme.radiusLg,
  },
  toggleOn: { backgroundColor: theme.primary },
  toggleOff: { backgroundColor: theme.card },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  gridCard: {
    backgroundColor: theme.card,
    borderRadius: theme.radiusXl,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
  },
  gridImageWrap: { aspectRatio: 1, width: "100%", overflow: "hidden" },
  gridImage: { width: "100%", height: "100%" },
  gridMeta: { padding: 12 },
  cardTitle: { fontSize: 14, fontWeight: "600", color: theme.foreground, marginBottom: 4 },
  cardSub: { fontSize: 12, color: theme.mutedForeground },
  cardPrice: { fontSize: 12, color: theme.primary, marginTop: 4, fontWeight: "600" },
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
