import { CommonActions, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useEffect, useRef } from "react";

import { LoadingState } from "../components/LoadingState";
import { useAppSettings } from "../context/app-settings-context";
import type { RootStackParamList } from "../navigation/types";

type Nav = NativeStackNavigationProp<RootStackParamList, "Bootstrap">;

export function BootstrapScreen() {
  const navigation = useNavigation<Nav>();
  const { isAuthHydrating, canInteract } = useAppSettings();
  const didRouteRef = useRef(false);

  useEffect(() => {
    if (didRouteRef.current) return;
    if (isAuthHydrating) return;
    didRouteRef.current = true;

    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: canInteract ? "Home" : "Welcome" }],
      }),
    );
  }, [canInteract, isAuthHydrating, navigation]);

  return <LoadingState />;
}

