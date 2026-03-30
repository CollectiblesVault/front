import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import { wishlistSeed } from "../data/mocks";

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
  addToWishlist: (entry: Omit<WishlistEntry, "priority"> & { priority?: WishlistEntry["priority"] }) => void;
  removeFromWishlist: (id: number) => void;
  isInWishlist: (id: number) => boolean;
  toggleWishlist: (entry: Omit<WishlistEntry, "priority"> & { priority?: WishlistEntry["priority"] }) => void;
}

const WishlistContext = createContext<WishlistValue | null>(null);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<WishlistEntry[]>(() =>
    wishlistSeed.map((w) => ({
      id: w.id,
      name: w.name,
      category: w.category,
      estimatedPrice: w.estimatedPrice,
      notes: w.notes,
      image: w.image,
      priority: w.priority,
    })),
  );

  const isInWishlist = useCallback((id: number) => entries.some((e) => e.id === id), [entries]);

  const addToWishlist = useCallback(
    (entry: Omit<WishlistEntry, "priority"> & { priority?: WishlistEntry["priority"] }) => {
      setEntries((prev) => {
        if (prev.some((e) => e.id === entry.id)) {
          return prev;
        }
        const row: WishlistEntry = {
          ...entry,
          priority: entry.priority ?? "medium",
          notes: entry.notes ?? "",
        };
        return [...prev, row];
      });
    },
    [],
  );

  const removeFromWishlist = useCallback((id: number) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

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
      addToWishlist,
      removeFromWishlist,
      isInWishlist,
      toggleWishlist,
    }),
    [entries, addToWishlist, removeFromWishlist, isInWishlist, toggleWishlist],
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
