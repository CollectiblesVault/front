/** Design tokens from Figma `theme.css` */
export const theme = {
  background: "#0A0A0A",
  foreground: "#FFFFFF",
  card: "#1A1A1A",
  cardForeground: "#FFFFFF",
  muted: "#2A2A2A",
  mutedForeground: "#FFFFFF",
  primary: "#D4AF37",
  primaryForeground: "#0A0A0A",
  border: "#2A2A2A",
  destructive: "#DC2626",
  radiusLg: 12,
  radiusXl: 16,
} as const;

export type Theme = typeof theme;
