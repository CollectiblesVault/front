import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { CollectionDetailScreen } from "../screens/CollectionDetailScreen";
import { CollectionsScreen } from "../screens/CollectionsScreen";
import { CommunityScreen } from "../screens/CommunityScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { ItemDetailScreen } from "../screens/ItemDetailScreen";
import { LoginScreen } from "../screens/LoginScreen";
import { OfflineDemoScreen } from "../screens/OfflineDemoScreen";
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
  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        initialRouteName="Welcome"
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.background },
          animation: "slide_from_right",
        }}
      >
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Collections" component={CollectionsScreen} />
        <Stack.Screen name="CollectionDetail" component={CollectionDetailScreen} />
        <Stack.Screen name="ItemDetail" component={ItemDetailScreen} />
        <Stack.Screen name="Wishlist" component={WishlistScreen} />
        <Stack.Screen name="Reports" component={ReportsScreen} />
        <Stack.Screen name="Community" component={CommunityScreen} />
        <Stack.Screen name="UserProfile" component={UserProfileScreen} />
        <Stack.Screen name="OfflineDemo" component={OfflineDemoScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
