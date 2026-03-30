import { DollarSign, Euro, PoundSterling } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

import { theme } from "../theme";
import type { CurrencyCode } from "../utils/formatMoney";

interface CurrencyIconProps {
  code: CurrencyCode;
  size?: number;
  color?: string;
  filled?: boolean;
}

export function CurrencyIcon({ code, size = 18, color = theme.primary, filled }: CurrencyIconProps) {
  const stroke = filled ? 2.5 : 2;
  switch (code) {
    case "USD":
      return <DollarSign size={size} color={color} strokeWidth={stroke} />;
    case "EUR":
      return <Euro size={size} color={color} strokeWidth={stroke} />;
    case "GBP":
      return <PoundSterling size={size} color={color} strokeWidth={stroke} />;
    case "RUB":
      return (
        <View style={[styles.rubWrap, { width: size + 4, height: size + 4 }]}>
          <Text style={[styles.rubText, { fontSize: size * 0.85, color }]}>₽</Text>
        </View>
      );
    default: {
      const _e: never = code;
      return _e;
    }
  }
}

const styles = StyleSheet.create({
  rubWrap: { alignItems: "center", justifyContent: "center" },
  rubText: { fontWeight: "700" },
});
