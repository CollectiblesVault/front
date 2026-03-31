import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AppSettingsProvider } from "./src/context/app-settings-context";
import { CollectionsStoreProvider } from "./src/context/collections-store-context";
import { TabBarScrollProvider } from "./src/context/tab-bar-scroll-context";
import { TabTransitionProvider } from "./src/context/tab-transition-context";
import { WishlistProvider } from "./src/context/wishlist-context";
import { RootNavigator } from "./src/navigation/RootNavigator";

export default function App() {
  return (
    <SafeAreaProvider>
      <AppSettingsProvider>
        <CollectionsStoreProvider>
          <WishlistProvider>
          <TabBarScrollProvider>
              <TabTransitionProvider>
                <StatusBar style="light" translucent backgroundColor="transparent" />
            <RootNavigator />
              </TabTransitionProvider>
          </TabBarScrollProvider>
          </WishlistProvider>
        </CollectionsStoreProvider>
      </AppSettingsProvider>
    </SafeAreaProvider>
  );
}
