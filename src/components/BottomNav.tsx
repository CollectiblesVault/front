import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { FolderOpen, Heart, Home, TrendingUp, Users } from "lucide-react-native";

import { useTabTransition } from "../context/tab-transition-context";
import type { RootStackParamList } from "../navigation/types";
import { theme } from "../theme";

type Nav = NativeStackNavigationProp<RootStackParamList>;

function goTab(navigation: Nav, key: keyof RootStackParamList) {
  switch (key) {
    case "Bootstrap":
      navigation.navigate("Home");
      break;
    case "Welcome":
      navigation.navigate("Welcome");
      break;
    case "Login":
      navigation.navigate("Login", undefined);
      break;
    case "Home":
      navigation.navigate("Home");
      break;
    case "Collections":
      navigation.navigate("Collections");
      break;
    case "CollectionDetail":
      navigation.navigate("CollectionDetail", { id: "1" });
      break;
    case "ItemDetail":
      navigation.navigate("ItemDetail", { id: "1" });
      break;
    case "Wishlist":
      navigation.navigate("Wishlist");
      break;
    case "Reports":
      navigation.navigate("Reports");
      break;
    case "Community":
      navigation.navigate("Community");
      break;
    case "UserProfile":
      navigation.navigate("UserProfile", { userId: "u-nina" });
      break;
    default: {
      const _exhaustive: never = key;
      return _exhaustive;
    }
  }
}

const items: { key: keyof RootStackParamList; label: string; icon: typeof Home }[] = [
  { key: "Home", label: "Главная", icon: Home },
  { key: "Collections", label: "Мои", icon: FolderOpen },
  { key: "Community", label: "Публичные", icon: Users },
  { key: "Wishlist", label: "Желания", icon: Heart },
  { key: "Reports", label: "Отчёты", icon: TrendingUp },
];

const HIDE_ROUTES: (keyof RootStackParamList)[] = ["Welcome", "Login", "UserProfile"];

export function BottomNav() {
  const navigation = useNavigation<Nav>();
  const route = useRoute();
  const routeName = route.name as keyof RootStackParamList;
  const { beginTabSwitch } = useTabTransition();

  if (HIDE_ROUTES.includes(routeName)) {
    return null;
  }

  return (
    <View style={styles.bar}>
      <View style={styles.row}>
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = routeName === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              style={styles.cell}
              onPress={() => {
                if (!isActive) {
                  beginTabSwitch(String(item.key));
                }
                goTab(navigation, item.key);
              }}
              activeOpacity={0.75}
            >
              <Icon size={20} color={isActive ? theme.primary : theme.mutedForeground} strokeWidth={2} />
              <Text style={[styles.label, isActive && styles.labelActive]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.border,
    backgroundColor: theme.card,
    paddingBottom: 8,
    paddingTop: 4,
    zIndex: 40,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    minHeight: 56,
    paddingHorizontal: 2,
  },
  cell: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 4,
  },
  label: {
    fontSize: 10,
    fontWeight: "500",
    color: theme.mutedForeground,
  },
  labelActive: {
    color: theme.primary,
  },
});
