import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AppSettingsProvider } from "./src/context/app-settings-context";
import { CollectionsStoreProvider } from "./src/context/collections-store-context";
import { TabBarScrollProvider } from "./src/context/tab-bar-scroll-context";
import { WishlistProvider } from "./src/context/wishlist-context";
import { RootNavigator } from "./src/navigation/RootNavigator";

export default function App() {
  return (
    <SafeAreaProvider>
      <AppSettingsProvider>
        <CollectionsStoreProvider>
          <WishlistProvider>
          <TabBarScrollProvider>
            <StatusBar style="light" />
            <RootNavigator />
          </TabBarScrollProvider>
          </WishlistProvider>
        </CollectionsStoreProvider>
      </AppSettingsProvider>
    </SafeAreaProvider>
  );
}
