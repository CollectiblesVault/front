import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import { collectionItems as seedItems, collections as seedCollections, itemDetailById } from "../data/mocks";

export interface CollectionRow {
  id: number;
  name: string;
  itemCount: number;
  totalValue: number;
  image: string;
}

export interface CollectionItemRow {
  id: number;
  name: string;
  category: string;
  price: number;
  year: number;
  condition: string;
  image: string;
  isWishlisted: boolean;
}

/** Поля карточки предмета + расширение для экрана детали (мержится с моком). */
export type ItemDetailOverride = Partial<{
  name: string;
  category: string;
  price: number;
  year: number;
  condition: string;
  description: string;
  image: string;
  purchasePrice: number;
  currentValue: number;
  likes: number;
}>;

const DEFAULT_NEW_IMAGE =
  "https://images.unsplash.com/photo-1631692364644-d6558eab0915?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800";

const EMPTY_ITEMS: CollectionItemRow[] = [];

function mapSeedItem(it: (typeof seedItems)[number]): CollectionItemRow {
  return {
    id: it.id,
    name: it.name,
    category: it.category,
    price: it.price,
    year: it.year,
    condition: it.condition,
    image: it.image,
    isWishlisted: it.isWishlisted,
  };
}

function fallbackDetailFromId(idStr: string) {
  const d = itemDetailById["1"]!;
  return {
    ...d,
    id: Number(idStr),
    name: "Новый предмет",
    category: "Разное",
    price: 0,
    year: new Date().getFullYear(),
    condition: "—",
    description: "",
    purchasePrice: 0,
    currentValue: 0,
    image: DEFAULT_NEW_IMAGE,
    likes: 0,
    comments: [] as { id: number; user: string; text: string; time: string }[],
  };
}

interface CollectionsStoreValue {
  collectionsList: CollectionRow[];
  itemsForCollection: (collectionId: string) => CollectionItemRow[];
  collectionTitle: (collectionId: string | undefined) => string;
  collectionImage: (collectionId: string | undefined) => string;
  addCollection: (name: string, image?: string) => number | null;
  updateCollection: (collectionId: string, patch: { name?: string; image?: string }) => void;
  renameCollection: (collectionId: string, name: string) => void;
  addItemToCollection: (
    collectionId: string,
    row: Omit<CollectionItemRow, "id" | "isWishlisted"> & { description?: string },
  ) => number;
  updateItemInCollection: (
    collectionId: string,
    itemId: number,
    patch: Partial<CollectionItemRow>,
  ) => void;
  patchItemDetail: (itemIdStr: string, patch: ItemDetailOverride) => void;
  mergedItemDetail: (itemIdStr: string) => ReturnType<typeof buildMergedDetail>;
  findCollectionIdForItem: (itemId: number) => string | undefined;
}

const CollectionsStoreContext = createContext<CollectionsStoreValue | null>(null);

function buildMergedDetail(itemIdStr: string, overrides: Record<string, ItemDetailOverride>) {
  const seed = itemDetailById[itemIdStr];
  const o = overrides[itemIdStr] ?? {};
  const base = seed ?? fallbackDetailFromId(itemIdStr);
  const merged = { ...base, ...o, id: Number(itemIdStr) };
  return merged;
}

export function CollectionsStoreProvider({ children }: { children: ReactNode }) {
  const [extra, setExtra] = useState<CollectionRow[]>([]);
  const [nameOverrides, setNameOverrides] = useState<Record<string, string>>({});
  const [imageOverrides, setImageOverrides] = useState<Record<string, string>>({});
  const [itemDetailOverrides, setItemDetailOverrides] = useState<Record<string, ItemDetailOverride>>({});
  const [itemsMap, setItemsMap] = useState<Record<string, CollectionItemRow[]>>(() => {
    const m: Record<string, CollectionItemRow[]> = {};
    for (const c of seedCollections) {
      m[String(c.id)] = seedItems.map(mapSeedItem);
    }
    return m;
  });

  const collectionsList = useMemo(() => {
    const rows: CollectionRow[] = [];
    for (const c of seedCollections) {
      const id = String(c.id);
      const items = itemsMap[id] ?? EMPTY_ITEMS;
      rows.push({
        ...c,
        name: nameOverrides[id] ?? c.name,
        image: imageOverrides[id] ?? c.image,
        itemCount: items.length,
        totalValue: items.reduce((s, i) => s + i.price, 0),
      });
    }
    for (const e of extra) {
      const id = String(e.id);
      const items = itemsMap[id] ?? EMPTY_ITEMS;
      rows.push({
        ...e,
        name: nameOverrides[id] ?? e.name,
        image: imageOverrides[id] ?? e.image,
        itemCount: items.length,
        totalValue: items.reduce((s, i) => s + i.price, 0),
      });
    }
    return rows;
  }, [itemsMap, extra, nameOverrides, imageOverrides]);

  const itemsForCollection = useCallback(
    (collectionId: string) => itemsMap[collectionId] ?? EMPTY_ITEMS,
    [itemsMap],
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
      return c?.image ?? DEFAULT_NEW_IMAGE;
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
    (name: string, image?: string) => {
      const trimmed = name.trim();
      if (!trimmed) {
        return null;
      }
      const maxId = collectionsList.reduce((m, c) => Math.max(m, c.id), 0);
      const id = maxId + 1;
      const img = image?.trim() || DEFAULT_NEW_IMAGE;
      const row: CollectionRow = {
        id,
        name: trimmed,
        itemCount: 0,
        totalValue: 0,
        image: img,
      };
      setExtra((prev) => [...prev, row]);
      setItemsMap((prev) => ({ ...prev, [String(id)]: [] }));
      return id;
    },
    [collectionsList],
  );

  const updateCollection = useCallback((collectionId: string, patch: { name?: string; image?: string }) => {
    if (patch.name != null) {
      const t = patch.name.trim();
      if (t) {
        setNameOverrides((prev) => ({ ...prev, [collectionId]: t }));
      }
    }
    if (patch.image != null) {
      const u = patch.image.trim();
      if (u) {
        setImageOverrides((prev) => ({ ...prev, [collectionId]: u }));
      }
    }
  }, []);

  const renameCollection = useCallback(
    (collectionId: string, name: string) => {
      updateCollection(collectionId, { name });
    },
    [updateCollection],
  );

  const patchItemDetail = useCallback((itemIdStr: string, patch: ItemDetailOverride) => {
    setItemDetailOverrides((prev) => ({
      ...prev,
      [itemIdStr]: { ...prev[itemIdStr], ...patch },
    }));
  }, []);

  const addItemToCollection = useCallback(
    (collectionId: string, row: Omit<CollectionItemRow, "id" | "isWishlisted"> & { description?: string }) => {
      let newId = 0;
      setItemsMap((prev) => {
        const list = prev[collectionId] ?? [];
        const allIds = Object.values(prev)
          .flat()
          .map((i) => i.id);
        newId = Math.max(0, ...allIds) + 1;
        const item: CollectionItemRow = {
          id: newId,
          name: row.name,
          category: row.category,
          price: row.price,
          year: row.year,
          condition: row.condition,
          image: row.image,
          isWishlisted: false,
        };
        return { ...prev, [collectionId]: [...list, item] };
      });
      const idStr = String(newId);
      setItemDetailOverrides((prev) => ({
        ...prev,
        [idStr]: {
          ...prev[idStr],
          description: row.description ?? "",
          purchasePrice: row.price,
          currentValue: row.price,
          name: row.name,
          category: row.category,
          price: row.price,
          year: row.year,
          condition: row.condition,
          image: row.image,
        },
      }));
      return newId;
    },
    [],
  );

  const updateItemInCollection = useCallback(
    (collectionId: string, itemId: number, patch: Partial<CollectionItemRow>) => {
      setItemsMap((prev) => {
        const list = prev[collectionId];
        if (!list) {
          return prev;
        }
        const next = list.map((it) => (it.id === itemId ? { ...it, ...patch } : it));
        return { ...prev, [collectionId]: next };
      });
    },
    [],
  );

  const mergedItemDetail = useCallback(
    (itemIdStr: string) => buildMergedDetail(itemIdStr, itemDetailOverrides),
    [itemDetailOverrides],
  );

  const value = useMemo(
    () => ({
      collectionsList,
      itemsForCollection,
      collectionTitle,
      collectionImage,
      addCollection,
      updateCollection,
      renameCollection,
      addItemToCollection,
      updateItemInCollection,
      patchItemDetail,
      mergedItemDetail,
      findCollectionIdForItem,
    }),
    [
      collectionsList,
      itemsForCollection,
      collectionTitle,
      collectionImage,
      addCollection,
      updateCollection,
      renameCollection,
      addItemToCollection,
      updateItemInCollection,
      patchItemDetail,
      mergedItemDetail,
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
