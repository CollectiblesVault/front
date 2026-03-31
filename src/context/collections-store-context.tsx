import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import {
  createCategoryApi,
  createCollectionApi,
  createItemApi,
  deleteCollectionApi,
  deleteItemApi,
  getCategoriesApi,
  getCollectionsApi,
  getItemsApi,
  updateCollectionApi,
  updateItemApi,
  setCollectionVisibilityApi,
} from "../api/vaultApi";
import { useAppSettings } from "./app-settings-context";

const COLLECTIONS_CACHE_FILE = "collections-cache.v1.json";

export interface CollectionRow {
  id: number;
  name: string;
  itemCount: number;
  totalValue: number;
  imageUrl: string;
  isPublic: boolean;
}

export interface CollectionItemRow {
  id: number;
  name: string;
  category: string;
  categoryId?: number | null;
  price: number;
  description: string;
  imageUrl: string;
  isWishlisted: boolean;
}

const DEFAULT_COLLECTION_IMAGE = "";
const DEFAULT_ITEM_IMAGE = "";

const EMPTY_ITEMS: CollectionItemRow[] = [];

function safeString(v: any, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function safeNumber(v: any, fallback = 0): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number.parseFloat(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function normalizeCollection(raw: any): { id: number; name: string; description?: string | null; isPublic: boolean } | null {
  const id = safeNumber(raw?.id ?? raw?.collection_id, NaN);
  if (!Number.isFinite(id)) return null;
  const name = safeString(raw?.name, "").trim() || `Коллекция ${id}`;
  const description = raw?.description != null ? safeString(raw.description, "") : undefined;
  const isPublic = Boolean(raw?.is_public ?? raw?.isPublic ?? false);
  return { id, name, description, isPublic };
}

function normalizeItem(raw: any): {
  id: number;
  collectionId: number | null;
  categoryId: number | null;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
} | null {
  const id = safeNumber(raw?.id ?? raw?.item_id, NaN);
  if (!Number.isFinite(id)) return null;
  const collectionId = Number.isFinite(safeNumber(raw?.collection_id, NaN)) ? safeNumber(raw?.collection_id, NaN) : null;
  const categoryId = Number.isFinite(safeNumber(raw?.category_id, NaN)) ? safeNumber(raw?.category_id, NaN) : null;
  const name = safeString(raw?.name, "").trim() || `Предмет ${id}`;
  const description = safeString(raw?.description, "");
  const price = safeNumber(raw?.price, 0);
  const imageUrl = safeString(raw?.image_url ?? raw?.image, "").trim() || DEFAULT_ITEM_IMAGE;
  return { id, collectionId, categoryId, name, description, price, imageUrl };
}

type MergedDetail = {
  id: number;
  name: string;
  category: string;
  price: number;
  description: string;
  imageUrl: string;
};

interface CollectionsStoreValue {
  collectionsList: CollectionRow[];
  itemsForCollection: (collectionId: string) => CollectionItemRow[];
  collectionTitle: (collectionId: string | undefined) => string;
  collectionImage: (collectionId: string | undefined) => string;
  collectionIsPublic: (collectionId: string | undefined) => boolean;
  isLoadingCollections: boolean;
  collectionsError: string | null;
  isLoadingItemsForCollection: (collectionId: string) => boolean;
  refreshCollections: () => Promise<void>;
  addCollection: (name: string, _image?: string) => Promise<number | null>;
  updateCollection: (collectionId: string, patch: { name?: string; image?: string }) => Promise<void>;
  deleteCollection: (collectionId: string) => Promise<void>;
  setCollectionVisibility: (collectionId: string, isPublic: boolean) => Promise<void>;
  renameCollection: (collectionId: string, name: string) => void;
  addItemToCollection: (
    collectionId: string,
    row: Omit<CollectionItemRow, "id" | "isWishlisted"> & { description?: string },
  ) => Promise<number>;
  updateItemInCollection: (
    collectionId: string,
    itemId: number,
    patch: Partial<CollectionItemRow>,
  ) => Promise<void>;
  deleteItemFromCollection: (collectionId: string, itemId: number) => Promise<void>;
  getItem: (itemId: number) => MergedDetail | null;
  findCollectionIdForItem: (itemId: number) => string | undefined;
}

const CollectionsStoreContext = createContext<CollectionsStoreValue | null>(null);

export function CollectionsStoreProvider({ children }: { children: ReactNode }) {
  const { authToken } = useAppSettings();

  const [collections, setCollections] = useState<{ id: number; name: string; description?: string | null; isPublic: boolean }[]>([]);
  const [itemsMap, setItemsMap] = useState<Record<string, CollectionItemRow[]>>({});
  const [categoriesById, setCategoriesById] = useState<Record<number, { id: number; name: string }>>({});

  const [isLoadingCollections, setIsLoadingCollections] = useState(false);
  const [collectionsError, setCollectionsError] = useState<string | null>(null);
  const [itemsLoadingMap, setItemsLoadingMap] = useState<Record<string, boolean>>({});

  const lastAuthRef = useRef<string | null>(null);

  const readCache = useCallback(async () => {
    if (!authToken) return false;
    try {
      const FileSystem = await import("expo-file-system/legacy");
      const baseDir = FileSystem.documentDirectory ?? FileSystem.cacheDirectory;
      if (!baseDir) return false;
      const path = `${baseDir}${COLLECTIONS_CACHE_FILE}`;
      const info = await FileSystem.getInfoAsync(path);
      if (!info.exists) return false;
      const raw = await FileSystem.readAsStringAsync(path);
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return false;
      if (!Array.isArray(parsed.collections) || typeof parsed.itemsMap !== "object" || typeof parsed.categoriesById !== "object") {
        return false;
      }
      setCollections(parsed.collections);
      setItemsMap(parsed.itemsMap);
      setCategoriesById(parsed.categoriesById);
      setCollectionsError(null);
      return true;
    } catch {
      return false;
    }
  }, [authToken]);

  const writeCache = useCallback(
    async (payload: { collections: any[]; itemsMap: Record<string, CollectionItemRow[]>; categoriesById: Record<number, { id: number; name: string }> }) => {
      if (!authToken) return;
      try {
        const FileSystem = await import("expo-file-system/legacy");
        const baseDir = FileSystem.documentDirectory ?? FileSystem.cacheDirectory;
        if (!baseDir) return;
        const path = `${baseDir}${COLLECTIONS_CACHE_FILE}`;
        await FileSystem.writeAsStringAsync(
          path,
          JSON.stringify(
            {
              savedAt: new Date().toISOString(),
              collections: payload.collections,
              itemsMap: payload.itemsMap,
              categoriesById: payload.categoriesById,
            },
            null,
            0,
          ),
          { encoding: FileSystem.EncodingType.UTF8 },
        );
      } catch {
        // ignore cache write errors
      }
    },
    [authToken],
  );

  const refreshCollections = useCallback(async () => {
    if (!authToken) {
      setCollections([]);
      setItemsMap({});
      setCollectionsError(null);
      setIsLoadingCollections(false);
      return;
    }
    setIsLoadingCollections(true);
    setCollectionsError(null);
    try {
      const [rawCollections, rawItems, rawCategories] = await Promise.all([
        getCollectionsApi({ token: authToken }),
        getItemsApi({ token: authToken }),
        getCategoriesApi({ token: authToken }),
      ]);

      const nextCollections = (rawCollections ?? [])
        .map(normalizeCollection)
        .filter(Boolean) as { id: number; name: string; description?: string | null; isPublic: boolean }[];

      const nextCategoriesById: Record<number, { id: number; name: string }> = {};
      for (const c of rawCategories ?? []) {
        const id = safeNumber(c?.id ?? c?.category_id, NaN);
        if (!Number.isFinite(id)) continue;
        const name = safeString(c?.name, "").trim() || `Категория ${id}`;
        nextCategoriesById[id] = { id, name };
      }
      setCategoriesById(nextCategoriesById);

      const byCollection: Record<string, CollectionItemRow[]> = {};
      for (const itRaw of rawItems ?? []) {
        const it = normalizeItem(itRaw);
        if (!it) continue;
        const cid = it.collectionId;
        if (cid == null) continue;
        const key = String(cid);
        const catName =
          (it.categoryId != null ? nextCategoriesById[it.categoryId]?.name : undefined) ?? "—";
        const row: CollectionItemRow = {
          id: it.id,
          name: it.name,
          category: catName,
          categoryId: it.categoryId,
          price: it.price,
          description: it.description,
          imageUrl: it.imageUrl,
          isWishlisted: false,
        };
        byCollection[key] = [...(byCollection[key] ?? []), row];
      }
      setItemsMap(byCollection);
      setCollections(nextCollections);
      void writeCache({ collections: nextCollections, itemsMap: byCollection, categoriesById: nextCategoriesById });
    } catch (e: any) {
      const message = e?.message ? String(e.message) : "Не удалось загрузить коллекции.";
      // Expired/invalid token should not block UI with hard error on collections screen.
      if (message.includes("401")) {
        setCollections([]);
        setItemsMap({});
        setCollectionsError(null);
      } else {
        // If offline/network error: keep last in-memory data; if empty, try to load cache.
        if (
          (message.toLowerCase().includes("network") ||
            message.toLowerCase().includes("failed to fetch") ||
            message.toLowerCase().includes("timeout")) &&
          collections.length === 0
        ) {
          await readCache();
          setCollectionsError(null);
        } else {
          setCollectionsError(message);
        }
      }
    } finally {
      setIsLoadingCollections(false);
    }
  }, [authToken, collections.length, readCache, writeCache]);

  useEffect(() => {
    if (lastAuthRef.current !== authToken) {
      lastAuthRef.current = authToken;
      void readCache();
      refreshCollections();
    }
  }, [authToken, readCache, refreshCollections]);

  const collectionsList = useMemo<CollectionRow[]>(() => {
    return collections.map((c) => {
      const items = itemsMap[String(c.id)] ?? EMPTY_ITEMS;
      return {
        id: c.id,
        name: c.name,
        itemCount: items.length,
        totalValue: items.reduce((s, i) => s + i.price, 0),
        imageUrl: DEFAULT_COLLECTION_IMAGE,
        isPublic: c.isPublic,
      };
      });
  }, [collections, itemsMap]);

  const itemsForCollection = useCallback(
    (collectionId: string) => itemsMap[collectionId] ?? EMPTY_ITEMS,
    [itemsMap],
  );

  const isLoadingItemsForCollection = useCallback(
    (collectionId: string) => itemsLoadingMap[collectionId] === true,
    [itemsLoadingMap],
  );

  const collectionTitle = useCallback(
    (collectionId: string | undefined) => {
      const n = Number(collectionId);
      const c = collectionsList.find((x) => x.id === n);
      return c?.name ?? "Коллекция";
    },
    [collectionsList],
  );

  const collectionImage = useCallback(
    (collectionId: string | undefined) => {
      const n = Number(collectionId);
      const c = collectionsList.find((x) => x.id === n);
      return c?.imageUrl ?? DEFAULT_COLLECTION_IMAGE;
    },
    [collectionsList],
  );

  const collectionIsPublic = useCallback(
    (collectionId: string | undefined) => {
      const n = Number(collectionId);
      const c = collectionsList.find((x) => x.id === n);
      return c?.isPublic ?? false;
    },
    [collectionsList],
  );

  const findCollectionIdForItem = useCallback(
    (itemId: number) => {
      for (const [cid, list] of Object.entries(itemsMap)) {
        if (list.some((i) => i.id === itemId)) {
          return cid;
        }
      }
      return undefined;
    },
    [itemsMap],
  );

  const addCollection = useCallback(
    async (name: string) => {
      if (!authToken) return null;
      const trimmed = name.trim();
      if (!trimmed) return null;
      const res = await createCollectionApi({ token: authToken, name: trimmed });
      const id = safeNumber(res?.id ?? res?.collection_id, NaN);
      await refreshCollections();
      return Number.isFinite(id) ? id : null;
    },
    [authToken, refreshCollections],
  );

  const updateCollection = useCallback(
    async (collectionId: string, patch: { name?: string; image?: string }) => {
      if (!authToken) return;
      const id = Number(collectionId);
      const existing = collections.find((c) => c.id === id);
      const name = (patch.name ?? existing?.name ?? "").trim();
      if (!name) return;
      // Backend schema supports name/description; image is ignored.
      await updateCollectionApi({ token: authToken, collectionId: id, name });
      await refreshCollections();
    },
    [authToken, collections, refreshCollections],
  );

  const deleteCollection = useCallback(
    async (collectionId: string) => {
      if (!authToken) return;
      const id = Number(collectionId);
      if (!Number.isFinite(id)) return;
      await deleteCollectionApi({ token: authToken, collectionId: id });
      await refreshCollections();
    },
    [authToken, refreshCollections],
  );

  const setCollectionVisibility = useCallback(
    async (collectionId: string, isPublic: boolean) => {
      if (!authToken) return;
      const id = Number(collectionId);
      if (!Number.isFinite(id)) return;
      await setCollectionVisibilityApi({ token: authToken, collectionId: id, is_public: isPublic });
      await refreshCollections();
    },
    [authToken, refreshCollections],
  );

  const renameCollection = useCallback(
    (collectionId: string, name: string) => {
      void updateCollection(collectionId, { name });
    },
    [updateCollection],
  );

  const addItemToCollection = useCallback(
    async (collectionId: string, row: Omit<CollectionItemRow, "id" | "isWishlisted"> & { description?: string }) => {
      if (!authToken) return 0;
      const cid = Number(collectionId);
      if (!Number.isFinite(cid)) return 0;

      const name = row.name.trim();
      if (!name) return 0;

      // Ensure category exists (by name). If not found, create it.
      let categoryId: number | null = null;
      const desiredCat = row.category.trim();
      if (desiredCat) {
        const existing = Object.values(categoriesById).find((c) => c.name.toLowerCase() === desiredCat.toLowerCase());
        if (existing) {
          categoryId = existing.id;
        } else {
          const created = await createCategoryApi({ token: authToken, name: desiredCat });
          const createdId = safeNumber(created?.id ?? created?.category_id, NaN);
          categoryId = Number.isFinite(createdId) ? createdId : null;
          await refreshCollections(); // refresh categories cache
        }
      }
      if (!categoryId) {
        // Fallback: pick any existing category.
        const any = Object.values(categoriesById)[0];
        categoryId = any?.id ?? null;
      }
      if (!categoryId) {
        throw new Error("Нет категорий на сервере. Создайте категорию и повторите.");
      }

      const created = await createItemApi({
        token: authToken,
        collection_id: cid,
        category_id: categoryId,
        name,
          price: row.price,
        image_url: row.imageUrl?.trim() ? row.imageUrl.trim() : null,
        description: row.description?.trim() ? row.description.trim() : null,
      });
      const newId = safeNumber(created?.id ?? created?.item_id, 0);
      await refreshCollections();
      return newId;
    },
    [authToken, categoriesById, refreshCollections],
  );

  const updateItemInCollection = useCallback(
    async (_collectionId: string, itemId: number, patch: Partial<CollectionItemRow>) => {
      if (!authToken) return;
      const name = patch.name?.trim();
      const price = patch.price;
      if (!name && price === undefined) {
        return;
      }
      const existing = Object.values(itemsMap).flat().find((x) => x.id === itemId);
      const nextName = (name ?? existing?.name ?? "").trim();
      const nextPrice = price ?? existing?.price ?? 0;
      await updateItemApi({
        token: authToken,
        item_id: itemId,
        name: nextName,
        price: nextPrice,
        image_url: patch.imageUrl?.trim() ? patch.imageUrl.trim() : undefined,
        description: patch.description?.trim() ? patch.description.trim() : undefined,
      });
      await refreshCollections();
    },
    [authToken, itemsMap, refreshCollections],
  );

  const deleteItemFromCollection = useCallback(
    async (_collectionId: string, itemId: number) => {
      if (!authToken) return;
      await deleteItemApi({ token: authToken, itemId });
      await refreshCollections();
    },
    [authToken, refreshCollections],
  );

  const getItem = useCallback(
    (itemId: number): MergedDetail | null => {
      if (!Number.isFinite(itemId)) return null;
      const found = Object.values(itemsMap).flat().find((x) => x.id === itemId);
      if (!found) return null;
      return {
        id: found.id,
        name: found.name,
        category: found.category,
        price: found.price,
        description: found.description,
        imageUrl: found.imageUrl,
      };
    },
    [itemsMap],
  );

  const value = useMemo(
    () => ({
      collectionsList,
      itemsForCollection,
      collectionTitle,
      collectionImage,
      collectionIsPublic,
      isLoadingCollections,
      collectionsError,
      isLoadingItemsForCollection,
      refreshCollections,
      addCollection,
      updateCollection,
      deleteCollection,
      setCollectionVisibility,
      renameCollection,
      addItemToCollection,
      updateItemInCollection,
      getItem,
      deleteItemFromCollection,
      findCollectionIdForItem,
    }),
    [
      collectionsList,
      itemsForCollection,
      collectionTitle,
      collectionImage,
      collectionIsPublic,
      isLoadingCollections,
      collectionsError,
      isLoadingItemsForCollection,
      refreshCollections,
      addCollection,
      updateCollection,
      deleteCollection,
      setCollectionVisibility,
      renameCollection,
      addItemToCollection,
      updateItemInCollection,
      getItem,
      deleteItemFromCollection,
      findCollectionIdForItem,
    ],
  );

  return (
    <CollectionsStoreContext.Provider value={value}>{children}</CollectionsStoreContext.Provider>
  );
}

export function useCollectionsStore(): CollectionsStoreValue {
  const ctx = useContext(CollectionsStoreContext);
  if (!ctx) {
    throw new Error("useCollectionsStore must be used within CollectionsStoreProvider");
  }
  return ctx;
}
