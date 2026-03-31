import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import {
  type CurrencyCode,
  formatCurrency,
  formatCurrencyThousands,
} from "../utils/formatMoney";
import { persistGet, persistSet } from "../utils/persist";
import { meApi } from "../api/vaultApi";

export interface UserProfile {
  email: string;
  displayName: string;
}

interface AppSettingsValue {
  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;
  userProfile: UserProfile | null;
  setUserProfile: (p: UserProfile | null) => void;
  authToken: string | null;
  setAuthToken: (t: string | null) => void;
  logout: () => void;
  canInteract: boolean;
  isAuthHydrating: boolean;
  hideFromSearch: boolean;
  setHideFromSearch: (v: boolean) => void;
  formatMoney: (amountUsd: number) => string;
  formatThousands: (amountUsd: number) => string;
}

const AppSettingsContext = createContext<AppSettingsValue | null>(null);

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState<CurrencyCode>("USD");
  const [hideFromSearch, setHideFromSearch] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [isAuthHydrating, setIsAuthHydrating] = useState(true);
  const didHydrateRef = useRef(false);

  const canInteract = userProfile != null;

  const logout = useCallback(() => {
    setUserProfile(null);
    setAuthToken(null);
    void persistSet("authToken", null);
    void persistSet("userProfile", null);
  }, []);

  useEffect(() => {
    if (didHydrateRef.current) return;
    didHydrateRef.current = true;

    let cancelled = false;
    (async () => {
      try {
        const [tokenRaw, profileRaw] = await Promise.all([persistGet("authToken"), persistGet("userProfile")]);
        if (cancelled) return;

        const token = tokenRaw?.trim() ? tokenRaw.trim() : null;
        if (token) {
          setAuthToken(token);
        }

        if (profileRaw) {
          try {
            const parsed = JSON.parse(profileRaw);
            const email = typeof parsed?.email === "string" ? parsed.email : "";
            const displayName = typeof parsed?.displayName === "string" ? parsed.displayName : "";
            if (email || displayName) {
              setUserProfile({ email, displayName });
            }
          } catch {
            // ignore
          }
        }

        // If we have a token, verify it and refresh profile from backend (best-effort).
        if (token) {
          try {
            const me = await meApi(token);
            if (cancelled) return;
            const email = typeof me?.email === "string" ? me.email : "";
            const displayName =
              typeof me?.display_name === "string"
                ? me.display_name
                : typeof me?.displayName === "string"
                  ? me.displayName
                  : "";
            if (email || displayName) {
              const profile = { email, displayName: displayName || email || "Пользователь" };
              setUserProfile(profile);
              await persistSet("userProfile", JSON.stringify(profile));
            }
          } catch {
            // Token may be expired/invalid.
            setAuthToken(null);
            setUserProfile(null);
            await persistSet("authToken", null);
            await persistSet("userProfile", null);
          }
        }
      } finally {
        if (!cancelled) setIsAuthHydrating(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!didHydrateRef.current) return;
    void persistSet("authToken", authToken);
  }, [authToken]);

  useEffect(() => {
    if (!didHydrateRef.current) return;
    void persistSet("userProfile", userProfile ? JSON.stringify(userProfile) : null);
  }, [userProfile]);

  const formatMoney = useCallback(
    (amountUsd: number) => formatCurrency(amountUsd, currency),
    [currency],
  );
  const formatThousands = useCallback(
    (amountUsd: number) => formatCurrencyThousands(amountUsd, currency),
    [currency],
  );

  const value = useMemo(
    () => ({
      currency,
      setCurrency,
      userProfile,
      setUserProfile,
      authToken,
      setAuthToken,
      logout,
      canInteract,
      isAuthHydrating,
      hideFromSearch,
      setHideFromSearch,
      formatMoney,
      formatThousands,
    }),
    [
      currency,
      userProfile,
      logout,
      authToken,
      canInteract,
      isAuthHydrating,
      hideFromSearch,
      formatMoney,
      formatThousands,
    ],
  );

  return <AppSettingsContext.Provider value={value}>{children}</AppSettingsContext.Provider>;
}

export function useAppSettings(): AppSettingsValue {
  const ctx = useContext(AppSettingsContext);
  if (!ctx) {
    throw new Error("useAppSettings must be used within AppSettingsProvider");
  }
  return ctx;
}
