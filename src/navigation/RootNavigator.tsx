import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { TabTransitionOverlay } from "../components/TabTransitionOverlay";
import { useTabTransition } from "../context/tab-transition-context";
import { BootstrapScreen } from "../screens/BootstrapScreen";
import { CollectionDetailScreen } from "../screens/CollectionDetailScreen";
import { CollectionsScreen } from "../screens/CollectionsScreen";
import { CommunityScreen } from "../screens/CommunityScreen";
import { AuctionScreen } from "../screens/AuctionScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { ItemDetailScreen } from "../screens/ItemDetailScreen";
import { LoginScreen } from "../screens/LoginScreen";
import { ReportsScreen } from "../screens/ReportsScreen";
import { UserProfileScreen } from "../screens/UserProfileScreen";
import { WelcomeScreen } from "../screens/WelcomeScreen";
import { WishlistScreen } from "../screens/WishlistScreen";
import { theme } from "../theme";
import type { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: theme.primary,
    background: theme.background,
    card: theme.card,
    text: theme.foreground,
    border: theme.border,
    notification: theme.primary,
  },
};

export function RootNavigator() {
  const { onNavigationStateChange } = useTabTransition();
  return (
    <>
      <NavigationContainer theme={navTheme} onStateChange={onNavigationStateChange}>
        <Stack.Navigator
          initialRouteName="Bootstrap"
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.background },
            animation: "slide_from_right",
          }}
        >
          <Stack.Screen name="Bootstrap" component={BootstrapScreen} />
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Collections" component={CollectionsScreen} />
          <Stack.Screen name="CollectionDetail" component={CollectionDetailScreen} />
          <Stack.Screen name="ItemDetail" component={ItemDetailScreen} />
          <Stack.Screen name="Wishlist" component={WishlistScreen} />
          <Stack.Screen name="Reports" component={ReportsScreen} />
          <Stack.Screen name="Community" component={CommunityScreen} />
          <Stack.Screen name="Auction" component={AuctionScreen} />
          <Stack.Screen name="UserProfile" component={UserProfileScreen} />
        </Stack.Navigator>
      </NavigationContainer>
      <TabTransitionOverlay />
    </>
  );
}
