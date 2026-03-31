import { Platform } from "react-native";

type StorageKey = "authToken" | "userProfile";

const PREFIX = "collectiblesVault:";

export async function persistSet(key: StorageKey, value: string | null) {
  const fullKey = `${PREFIX}${key}`;
  if (value == null) {
    return persistDelete(key);
  }

  if (Platform.OS === "web") {
    try {
      window.localStorage.setItem(fullKey, value);
    } catch {
      // ignore
    }
    return;
  }

  try {
    const SecureStore = await import("expo-secure-store");
    await SecureStore.setItemAsync(fullKey, value, {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
    });
  } catch {
    // ignore (e.g. SecureStore not available)
  }
}

export async function persistGet(key: StorageKey): Promise<string | null> {
  const fullKey = `${PREFIX}${key}`;

  if (Platform.OS === "web") {
    try {
      return window.localStorage.getItem(fullKey);
    } catch {
      return null;
    }
  }

  try {
    const SecureStore = await import("expo-secure-store");
    return await SecureStore.getItemAsync(fullKey);
  } catch {
    return null;
  }
}

export async function persistDelete(key: StorageKey) {
  const fullKey = `${PREFIX}${key}`;

  if (Platform.OS === "web") {
    try {
      window.localStorage.removeItem(fullKey);
    } catch {
      // ignore
    }
    return;
  }

  try {
    const SecureStore = await import("expo-secure-store");
    await SecureStore.deleteItemAsync(fullKey);
  } catch {
    // ignore
  }
}

