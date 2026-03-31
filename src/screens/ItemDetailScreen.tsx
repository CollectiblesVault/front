import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import { Bookmark, ChevronLeft, Edit, MessageCircle, ThumbsUp } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
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
import { Skeleton } from "../components/Skeleton";
import { TabAwareScrollView } from "../components/TabAwareScrollView";
import { useAppSettings } from "../context/app-settings-context";
import { useCollectionsStore } from "../context/collections-store-context";
import { useWishlist } from "../context/wishlist-context";
import { createItemCommentApi, getItemCommentsApi, likeItemApi, unlikeItemApi } from "../api/vaultApi";
import type { RootStackParamList } from "../navigation/types";
import { theme } from "../theme";
import { pluralRu } from "../utils/pluralRu";

type Nav = NativeStackNavigationProp<RootStackParamList, "ItemDetail">;
type R = RouteProp<RootStackParamList, "ItemDetail">;

type CommentRow = { id: number; user: string; text: string; time: string };

export function ItemDetailScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const route = useRoute<R>();
  const { formatMoney, canInteract, authToken } = useAppSettings();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const {
    getItem,
    updateItemInCollection,
    findCollectionIdForItem,
  } = useCollectionsStore();

  const browse = route.params.browse === true;
  const collectionIdParam = route.params.collectionId;

  const itemId = Number(route.params.id);
  const base = useMemo(() => {
    if (!Number.isFinite(itemId)) return null;
    const fromStore = getItem(itemId);
    if (fromStore) return fromStore;
    const p = route.params.itemPreview;
    if (p && Number(p.id) === itemId) {
      return {
        id: Number(p.id),
        name: String(p.name ?? "Предмет"),
        category: String(p.category ?? "—"),
        price: Number(p.price ?? 0) || 0,
        description: String(p.description ?? ""),
        imageUrl: String(p.imageUrl ?? ""),
      };
    }
    return null;
  }, [getItem, itemId, route.params.itemPreview]);
  const [isLiked, setIsLiked] = useState(false);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [commentDraft, setCommentDraft] = useState("");
  const [isLoadingComments, setIsLoadingComments] = useState(true);

  const [editOpen, setEditOpen] = useState(false);
  const [editDraft, setEditDraft] = useState({
    name: "",
    category: "",
    price: "",
    description: "",
    image: "",
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoadingComments(true);
      try {
        if (!Number.isFinite(itemId)) {
          setComments([]);
          return;
        }
        const list = await getItemCommentsApi({ itemId, token: authToken });
        if (cancelled) return;
        const mapped: CommentRow[] = (list ?? []).map((c: any, idx: number) => ({
          id: typeof c?.id === "number" ? c.id : idx + 1,
          user: typeof c?.user === "string" ? c.user : typeof c?.author === "string" ? c.author : "Пользователь",
          text: typeof c?.text === "string" ? c.text : "",
          time: typeof c?.created_at === "string" ? c.created_at : "—",
        }));
        setComments(mapped);
      } catch {
        if (!cancelled) setComments([]);
      } finally {
        if (!cancelled) setIsLoadingComments(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authToken, itemId]);

  const inWishlist = base ? isInWishlist(base.id) : false;

  const likesLabel = useMemo(() => (isLiked ? "Вы поставили лайк" : "Лайк"), [isLiked]);

  const requireAuth = useCallback(
    (action: () => void) => {
      if (!canInteract) {
        Alert.alert("Гостевой режим", "Войдите в аккаунт для этого действия.");
        return;
      }
      action();
    },
    [canInteract],
  );

  const openEdit = useCallback(() => {
    requireAuth(() => {
      if (!base) return;
      setEditDraft({
        name: base.name,
        category: base.category,
        price: String(base.price),
        description: base.description,
        image: base.imageUrl,
      });
      setEditOpen(true);
    });
  }, [base, requireAuth]);

  const saveEdit = useCallback(() => {
    if (!base) return;
    const cid = collectionIdParam ?? findCollectionIdForItem(base.id);
    if (!cid) {
      Alert.alert("Нельзя сохранить", "Не удалось определить коллекцию для этого предмета.");
      return;
    }
    const price = Number.parseFloat(editDraft.price.replace(/\s/g, "").replace(",", "."));
    if (!editDraft.name.trim() || Number.isNaN(price)) {
      Alert.alert("Проверьте данные", "Укажите название и цену.");
      return;
    }
    updateItemInCollection(cid, base.id, {
      name: editDraft.name.trim(),
      category: editDraft.category.trim() || "—",
      price,
      description: editDraft.description.trim(),
      imageUrl: editDraft.image.trim() || base.imageUrl,
    });
    setEditOpen(false);
  }, [base, collectionIdParam, editDraft, findCollectionIdForItem, updateItemInCollection]);

  const handleLike = () => {
    requireAuth(() => {
      const next = !isLiked;
      setIsLiked(next);
      if (!authToken) return;
      if (!Number.isFinite(itemId)) return;
      void (next ? likeItemApi({ token: authToken, itemId }) : unlikeItemApi({ token: authToken, itemId })).catch(() => {});
    });
  };

  const handleWishlistToggle = useCallback(() => {
    requireAuth(() => {
      if (!base) return;
      void toggleWishlist({
        id: base.id,
        name: base.name,
        category: base.category,
        estimatedPrice: base.price,
        image: base.imageUrl,
        notes: "",
      });
    });
  }, [base, requireAuth, toggleWishlist]);

  const submitComment = useCallback(() => {
    const t = commentDraft.trim();
    if (!t) {
      return;
    }
    requireAuth(() => {
      const optimistic: CommentRow = { id: Date.now(), user: "Вы", text: t, time: "только что" };
      setComments((prev) => [...prev, optimistic]);
      setCommentDraft("");
      if (!authToken) return;
      if (!Number.isFinite(itemId)) return;
      void createItemCommentApi({ token: authToken, itemId, text: t }).catch(() => {});
    });
  }, [authToken, commentDraft, itemId, requireAuth]);

  const showEdit = canInteract && !browse;
  const conditionLabel = "Excellent";

  useEffect(() => {
    if (route.params.openEdit === true && showEdit) {
      openEdit();
    }
  }, [route.params.openEdit, showEdit, openEdit]);

  return (
    <View style={styles.root}>
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={26} color={theme.foreground} strokeWidth={2} />
        </TouchableOpacity>
        <View style={styles.topRight}>
          <TouchableOpacity onPress={handleWishlistToggle} style={styles.iconBtn} accessibilityLabel="В список желаний">
            <Bookmark
              size={22}
              color={inWishlist ? theme.primary : theme.mutedForeground}
              fill={inWishlist ? theme.primary : "transparent"}
            />
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.kb}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 44 : 0}
      >
        <TabAwareScrollView
          contentContainerStyle={{ paddingBottom: 96 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {!canInteract ? (
            <View style={styles.guestBanner}>
              <Text style={styles.guestBannerText}>
                Доступ к лайкам, желаниям и комментариям доступен только после входа.
              </Text>
            </View>
          ) : null}

          {browse ? (
            <View style={styles.browseHint}>
              <Text style={styles.browseHintText}>
                Чужой лот: лайк — оценка публикации; закладка — в список желаний (не путать).
              </Text>
            </View>
          ) : null}

          {base ? (
            <View style={styles.hero}>
              <ImageWithFallback uri={base.imageUrl} style={styles.heroImg} />
            </View>
          ) : (
            <View style={styles.hero} />
          )}

          <View style={styles.body}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>{base?.name ?? "Предмет"}</Text>
              <Text style={styles.price}>{formatMoney(base?.price ?? 0)}</Text>
            </View>
            <Text style={styles.metaLine}>
              {(base?.category ?? "—")} • 1972 • {conditionLabel}
            </Text>
            <View style={styles.kpiRow}>
              <View style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>Current Value</Text>
                <Text style={styles.kpiValue}>{formatMoney(base?.price ?? 0)}</Text>
              </View>
            </View>

            <View style={styles.block}>
              <Text style={styles.blockTitle}>Описание</Text>
              <Text style={styles.desc}>{base?.description?.trim() ? base.description : "—"}</Text>
            </View>

            <View style={styles.block}>
              <View style={styles.socialRow}>
                <TouchableOpacity onPress={handleLike} style={styles.socialBtn} disabled={!canInteract} activeOpacity={0.85}>
                  <ThumbsUp
                    size={16}
                    color={isLiked ? theme.primary : theme.mutedForeground}
                    fill={isLiked ? theme.primary : "transparent"}
                  />
                  <Text style={styles.socialText}>
                    {isLiked ? "25 likes" : "24 likes"}
                  </Text>
                </TouchableOpacity>
                <View style={styles.socialBtn}>
                  <MessageCircle size={16} color={theme.mutedForeground} />
                  <Text style={styles.socialText}>
                    {isLoadingComments ? "…" : comments.length} comments
                  </Text>
                </View>
                <TouchableOpacity onPress={handleWishlistToggle} style={styles.socialBtn} disabled={!canInteract} activeOpacity={0.85}>
                  <Bookmark
                    size={16}
                    color={inWishlist ? theme.primary : theme.mutedForeground}
                    fill={inWishlist ? theme.primary : "transparent"}
                  />
                  <Text style={styles.socialText}>{inWishlist ? "Saved" : "Save"}</Text>
                </TouchableOpacity>
              </View>

              {isLoadingComments ? (
                <View style={{ gap: 10 }}>
                  {[0, 1, 2].map((i) => (
                    <View key={i} style={styles.commentCard}>
                      <View style={styles.commentTop}>
                        <Skeleton style={{ height: 12, width: "40%" }} />
                        <Skeleton style={{ height: 12, width: "25%" }} />
                      </View>
                      <Skeleton style={{ height: 10, width: "92%", marginTop: 6 }} />
                      <Skeleton style={{ height: 10, width: "78%", marginTop: 6 }} />
                    </View>
                  ))}
                </View>
              ) : (
                comments.map((c) => (
                  <View key={c.id} style={styles.commentCard}>
                    <View style={styles.commentTop}>
                      <Text style={styles.commentUser}>{c.user}</Text>
                      <Text style={styles.commentTime}>{c.time}</Text>
                    </View>
                    <Text style={styles.commentText}>{c.text}</Text>
                  </View>
                ))
              )}

              <View style={styles.composerRow}>
                <TextInput
                  value={commentDraft}
                  onChangeText={setCommentDraft}
                  placeholder={canInteract ? "Комментарий…" : "Войдите, чтобы комментировать"}
                  placeholderTextColor={theme.mutedForeground}
                  style={styles.composerInput}
                  editable={canInteract && !isLoadingComments}
                />
                <TouchableOpacity
                  style={[styles.composerSend, !canInteract && { opacity: 0.45 }]}
                  onPress={submitComment}
                  disabled={!canInteract || isLoadingComments}
                >
                  <Text style={styles.composerSendText}>Отпр.</Text>
                </TouchableOpacity>
              </View>
            </View>

            {showEdit && base ? (
              <TouchableOpacity style={styles.editBtn} activeOpacity={0.9} onPress={openEdit}>
                <Edit size={20} color={theme.primaryForeground} style={{ marginRight: 8 }} />
                <Text style={styles.editBtnText}>Редактировать предмет</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </TabAwareScrollView>
      </KeyboardAvoidingView>

      <Modal visible={editOpen} animationType="fade" transparent>
        <KeyboardAvoidingView
          style={styles.modalKb}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 20 : 0}
        >
          <Pressable style={styles.modalBackdropCenter} onPress={() => setEditOpen(false)}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              contentContainerStyle={styles.modalScrollCenter}
              showsVerticalScrollIndicator={false}
            >
              <Pressable onPress={(e) => e.stopPropagation()}>
                <View style={[styles.editCard, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                  <Text style={styles.editTitle}>Редактировать предмет</Text>
                  <TextInput
                    value={editDraft.name}
                    onChangeText={(t) => setEditDraft((d) => ({ ...d, name: t }))}
                    placeholder="Название"
                    placeholderTextColor={theme.mutedForeground}
                    style={styles.editInput}
                  />
                  <TextInput
                    value={editDraft.category}
                    onChangeText={(t) => setEditDraft((d) => ({ ...d, category: t }))}
                    placeholder="Категория"
                    placeholderTextColor={theme.mutedForeground}
                    style={styles.editInput}
                  />
                  <TextInput
                    value={editDraft.price}
                    onChangeText={(t) => setEditDraft((d) => ({ ...d, price: t }))}
                    placeholder="Оценочная цена (USD)"
                    keyboardType="decimal-pad"
                    placeholderTextColor={theme.mutedForeground}
                    style={styles.editInput}
                  />
                  <TextInput
                    value={editDraft.image}
                    onChangeText={(t) => setEditDraft((d) => ({ ...d, image: t }))}
                    placeholder="Фото (URL)"
                    placeholderTextColor={theme.mutedForeground}
                    style={styles.editInput}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TextInput
                    value={editDraft.description}
                    onChangeText={(t) => setEditDraft((d) => ({ ...d, description: t }))}
                    placeholder="Описание"
                    placeholderTextColor={theme.mutedForeground}
                    style={[styles.editInput, styles.editInputMultiline]}
                    multiline
                  />
                  {editDraft.image.trim().length > 0 ? (
                    <View style={styles.previewWrap}>
                      <ImageWithFallback uri={editDraft.image.trim()} style={styles.previewImg} borderRadius={10} />
                    </View>
                  ) : null}
                  <View style={styles.editActions}>
                    <TouchableOpacity style={styles.editCancel} onPress={() => setEditOpen(false)} activeOpacity={0.88}>
                      <Text style={styles.editCancelText}>Отмена</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.editSave} onPress={saveEdit} activeOpacity={0.88}>
                      <Text style={styles.editSaveText}>Сохранить</Text>
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
  kb: { flex: 1 },
  modalKb: { flex: 1 },
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
  editCard: {
    backgroundColor: theme.card,
    borderRadius: theme.radiusXl,
    padding: 16,
    maxWidth: 440,
    width: "100%",
    alignSelf: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
  },
  editTitle: { fontSize: 18, fontWeight: "600", color: theme.foreground, marginBottom: 12 },
  editInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
    borderRadius: theme.radiusLg,
    padding: 12,
    fontSize: 16,
    color: theme.foreground,
    marginBottom: 10,
  },
  editInputMultiline: { minHeight: 100, textAlignVertical: "top" },
  previewWrap: { marginBottom: 12, borderRadius: 10, overflow: "hidden", maxHeight: 200 },
  previewImg: { width: "100%", height: 160 },
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
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingBottom: 10,
    backgroundColor: theme.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border,
    zIndex: 10,
  },
  backBtn: { padding: 8 },
  topRight: { flexDirection: "row", gap: 4 },
  iconBtn: { padding: 8 },
  guestBanner: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 10,
    borderRadius: theme.radiusLg,
    backgroundColor: "rgba(212,175,55,0.08)",
  },
  guestBannerText: { fontSize: 12, color: theme.mutedForeground, lineHeight: 16 },
  browseHint: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 10,
    borderRadius: theme.radiusLg,
    backgroundColor: theme.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
  },
  browseHintText: { fontSize: 12, color: theme.mutedForeground, lineHeight: 16 },
  hero: { width: "100%", aspectRatio: 1, backgroundColor: theme.card },
  heroImg: { width: "100%", height: "100%" },
  body: { paddingHorizontal: 16, paddingTop: 20, gap: 20 },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  title: { flex: 1, fontSize: 20, fontWeight: "600", color: theme.foreground },
  price: { fontSize: 20, fontWeight: "700", color: theme.primary },
  metaLine: { fontSize: 14, color: theme.mutedForeground },
  kpiRow: { flexDirection: "row", gap: 10 },
  kpiCard: {
    flex: 1,
    backgroundColor: theme.card,
    borderRadius: theme.radiusLg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
    padding: 12,
  },
  kpiLabel: { fontSize: 11, color: theme.mutedForeground, marginBottom: 6 },
  kpiValue: { fontSize: 14, fontWeight: "600", color: theme.foreground },
  statsRow: { flexDirection: "row", gap: 10 },
  statBox: {
    flex: 1,
    backgroundColor: theme.card,
    borderRadius: theme.radiusLg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
    padding: 12,
  },
  statLab: { fontSize: 11, color: theme.mutedForeground, marginBottom: 4 },
  statVal: { fontSize: 14, fontWeight: "600", color: theme.foreground },
  block: { gap: 12 },
  blockTitle: { fontSize: 14, fontWeight: "600", color: theme.foreground },
  desc: { fontSize: 14, color: theme.mutedForeground, lineHeight: 22 },
  socialRow: { flexDirection: "row", flexWrap: "wrap", gap: 18, alignItems: "center" },
  socialBtn: { flexDirection: "row", alignItems: "center", gap: 8 },
  socialText: { fontSize: 13, color: theme.mutedForeground },
  commentCard: {
    backgroundColor: "rgba(255,255,255,0.02)",
    borderRadius: theme.radiusLg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
    padding: 12,
  },
  commentTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  commentUser: { fontSize: 12, fontWeight: "600", color: theme.foreground },
  commentTime: { fontSize: 12, color: theme.mutedForeground },
  commentText: { fontSize: 12, color: theme.mutedForeground, lineHeight: 18 },
  composerRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  composerInput: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
    borderRadius: theme.radiusLg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: theme.foreground,
  },
  composerSend: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: theme.primary,
    borderRadius: theme.radiusLg,
  },
  composerSendText: { color: theme.primaryForeground, fontWeight: "700", fontSize: 13 },
  editBtn: {
    height: 48,
    borderRadius: theme.radiusLg,
    backgroundColor: theme.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  editBtnText: { color: theme.primaryForeground, fontWeight: "600", fontSize: 16 },
});
