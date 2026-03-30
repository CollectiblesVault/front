import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import {
  type CurrencyCode,
  formatCurrency,
  formatCurrencyThousands,
} from "../utils/formatMoney";

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

  const canInteract = userProfile != null;

  const logout = useCallback(() => {
    setUserProfile(null);
    setAuthToken(null);
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
      authToken,
      setAuthToken,
      logout,
      canInteract,
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
