import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import {
  type CurrencyCode,
  formatCurrency,
  formatCurrencyThousands,
  refreshCurrencyRates,
} from "../utils/formatMoney";
import { persistGet, persistSet } from "../utils/persist";
import { getWalletBalanceApi, meApi, parseWalletBalance } from "../api/vaultApi";

export interface UserProfile {
  /** С бэка `/api/auth/me` — для сопоставления со ставками (bidder_id). */
  id?: number;
  email: string;
  displayName: string;
  avatarUrl?: string;
}

interface AppSettingsValue {
  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;
  userProfile: UserProfile | null;
  setUserProfile: (p: UserProfile | null) => void;
  walletBalance: number;
  setWalletBalance: (v: number) => void;
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

function buildAvatarFallback(displayName: string, email: string) {
  const seed = encodeURIComponent((displayName || email || "Пользователь").trim());
  return `https://ui-avatars.com/api/?name=${seed}&background=1A1A1A&color=FFFFFF&size=256`;
}

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState<CurrencyCode>("USD");
  const [, setRatesVersion] = useState(0);
  const [hideFromSearch, setHideFromSearch] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [isAuthHydrating, setIsAuthHydrating] = useState(true);
  const didHydrateRef = useRef(false);

  const canInteract = userProfile != null;

  const logout = useCallback(() => {
    setUserProfile(null);
    setWalletBalance(0);
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
            const avatarUrl = typeof parsed?.avatarUrl === "string" ? parsed.avatarUrl : "";
            const id =
              typeof parsed?.id === "number" && Number.isFinite(parsed.id) ? parsed.id : undefined;
            if (email || displayName) {
              setUserProfile({
                ...(id != null ? { id } : {}),
                email,
                displayName,
                avatarUrl: avatarUrl || buildAvatarFallback(displayName, email),
              });
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
            const avatarUrl =
              typeof me?.avatar_url === "string"
                ? me.avatar_url
                : typeof me?.avatarUrl === "string"
                  ? me.avatarUrl
                  : "";
            const userIdRaw = me?.id ?? me?.user_id;
            const id =
              typeof userIdRaw === "number" && Number.isFinite(userIdRaw)
                ? userIdRaw
                : typeof userIdRaw === "string"
                  ? Number.parseInt(userIdRaw, 10)
                  : undefined;
            const resolvedId = id != null && Number.isFinite(id) ? id : undefined;
            if (email || displayName) {
              const resolvedName = displayName || email || "Пользователь";
              const profile = {
                ...(resolvedId != null ? { id: resolvedId } : {}),
                email,
                displayName: resolvedName,
                avatarUrl: avatarUrl || buildAvatarFallback(resolvedName, email),
              };
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
    if (isAuthHydrating) return;
    if (!authToken) {
      setWalletBalance(0);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const raw = await getWalletBalanceApi({ token: authToken });
        if (cancelled) return;
        const b = parseWalletBalance(raw);
        if (b != null) setWalletBalance(b);
      } catch {
        /* GET /api/wallet может отсутствовать на бэке */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authToken, isAuthHydrating]);

  useEffect(() => {
    if (!didHydrateRef.current) return;
    void persistSet("authToken", authToken);
  }, [authToken]);

  useEffect(() => {
    if (!didHydrateRef.current) return;
    void persistSet("userProfile", userProfile ? JSON.stringify(userProfile) : null);
  }, [userProfile]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      await refreshCurrencyRates();
      if (cancelled) return;
      // Force rerender so formatters use latest rates.
      setRatesVersion((v) => v + 1);
    };
    void run();
    const timer = setInterval(() => {
      void run();
    }, 30 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

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
      walletBalance,
      setWalletBalance,
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
      walletBalance,
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
