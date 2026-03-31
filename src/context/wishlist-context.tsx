import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { addItemToWishlistApi, getWishlistApi, removeItemFromWishlistApi } from "../api/vaultApi";
import { useAppSettings } from "./app-settings-context";

export interface WishlistEntry {
  id: number;
  name: string;
  category: string;
  estimatedPrice: number;
  notes: string;
  image: string;
  priority: "high" | "medium" | "low";
}

interface WishlistValue {
  entries: WishlistEntry[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addToWishlist: (entry: Omit<WishlistEntry, "priority"> & { priority?: WishlistEntry["priority"] }) => Promise<void>;
  removeFromWishlist: (id: number) => Promise<void>;
  isInWishlist: (id: number) => boolean;
  toggleWishlist: (entry: Omit<WishlistEntry, "priority"> & { priority?: WishlistEntry["priority"] }) => Promise<void>;
}

const WishlistContext = createContext<WishlistValue | null>(null);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { authToken, canInteract } = useAppSettings();
  const [entries, setEntries] = useState<WishlistEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastAuthRef = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    if (!authToken || !canInteract) {
      setEntries([]);
      setError(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const raw = await getWishlistApi({ token: authToken });
      const list: WishlistEntry[] = (raw ?? []).map((w: any, idx: number) => {
        const id = typeof w?.item_id === "number" ? w.item_id : typeof w?.id === "number" ? w.id : idx + 1;
        return {
          id,
          name: typeof w?.item_name === "string" ? w.item_name : typeof w?.name === "string" ? w.name : `Item ${id}`,
          category: typeof w?.category === "string" ? w.category : "—",
          estimatedPrice: typeof w?.estimated_price === "number" ? w.estimated_price : 0,
          notes: typeof w?.notes === "string" ? w.notes : "",
          image: typeof w?.image_url === "string" ? w.image_url : typeof w?.image === "string" ? w.image : "",
          priority: (w?.priority === "high" || w?.priority === "low" || w?.priority === "medium") ? w.priority : "medium",
        };
      });
      setEntries(list);
    } catch (e: any) {
      setError(e?.message ? String(e.message) : "Не удалось загрузить список желаний.");
    } finally {
      setIsLoading(false);
    }
  }, [authToken, canInteract]);

  useEffect(() => {
    if (lastAuthRef.current !== authToken) {
      lastAuthRef.current = authToken;
      void refresh();
    }
  }, [authToken, refresh]);

  const isInWishlist = useCallback((id: number) => entries.some((e) => e.id === id), [entries]);

  const addToWishlist = useCallback(
    async (entry: Omit<WishlistEntry, "priority"> & { priority?: WishlistEntry["priority"] }) => {
      if (!authToken) return;
      await addItemToWishlistApi({ token: authToken, itemId: entry.id });
      await refresh();
    },
    [authToken, refresh],
  );

  const removeFromWishlist = useCallback((id: number) => {
    if (!authToken) return Promise.resolve();
    return removeItemFromWishlistApi({ token: authToken, itemId: id }).then(() => refresh());
  }, [authToken, refresh]);

  const toggleWishlist = useCallback(
    (entry: Omit<WishlistEntry, "priority"> & { priority?: WishlistEntry["priority"] }) => {
      if (isInWishlist(entry.id)) {
        removeFromWishlist(entry.id);
      } else {
        addToWishlist(entry);
      }
    },
    [addToWishlist, removeFromWishlist, isInWishlist],
  );

  const value = useMemo(
    () => ({
      entries,
      isLoading,
      error,
      refresh,
      addToWishlist,
      removeFromWishlist,
      isInWishlist,
      toggleWishlist,
    }),
    [entries, isLoading, error, refresh, addToWishlist, removeFromWishlist, isInWishlist, toggleWishlist],
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist(): WishlistValue {
  const ctx = useContext(WishlistContext);
  if (!ctx) {
    throw new Error("useWishlist must be used within WishlistProvider");
  }
  return ctx;
}
