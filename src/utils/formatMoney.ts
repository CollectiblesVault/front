/** Суммы хранятся в USD; отображение по выбранной валюте. */

export type CurrencyCode = "USD" | "EUR" | "RUB" | "GBP";

/** Курс: сколько единиц валюты за 1 USD (для демо). */
const USD_TO: Record<CurrencyCode, number> = {
  USD: 1,
  EUR: 0.92,
  RUB: 92,
  GBP: 0.79,
};

const CURRENCY_LABELS: Record<CurrencyCode, string> = {
  USD: "Доллар США",
  EUR: "Евро",
  RUB: "Рубль",
  GBP: "Фунт стерлингов",
};

export function getCurrencyLabel(code: CurrencyCode): string {
  return CURRENCY_LABELS[code];
}

export const CURRENCY_CODES: CurrencyCode[] = ["USD", "EUR", "RUB", "GBP"];

export function formatCurrency(amountUsd: number, code: CurrencyCode): string {
  const v = amountUsd * USD_TO[code];
  const n = Math.round(v);
  switch (code) {
    case "USD":
      return `${n.toLocaleString("ru-RU")}\u00A0долл.`;
    case "EUR":
      return `${n.toLocaleString("ru-RU")}\u00A0€`;
    case "RUB":
      return `${n.toLocaleString("ru-RU")}\u00A0₽`;
    case "GBP":
      return `${n.toLocaleString("ru-RU")}\u00A0£`;
  }
}

export function formatCurrencyThousands(amountUsd: number, code: CurrencyCode): string {
  const v = (amountUsd * USD_TO[code]) / 1000;
  const k = Math.round(v);
  switch (code) {
    case "USD":
      return `${k.toLocaleString("ru-RU")}\u00A0тыс.\u00A0долл.`;
    case "EUR":
      return `${k.toLocaleString("ru-RU")}\u00A0тыс.\u00A0€`;
    case "RUB":
      return `${k.toLocaleString("ru-RU")}\u00A0тыс.\u00A0₽`;
    case "GBP":
      return `${k.toLocaleString("ru-RU")}\u00A0тыс.\u00A0£`;
  }
}

/** @deprecated используйте formatCurrency с контекстом валюты */
export function formatUsd(n: number): string {
  return formatCurrency(n, "USD");
}

/** @deprecated используйте formatCurrencyThousands с контекстом валюты */
export function formatUsdThousands(n: number): string {
  return formatCurrencyThousands(n, "USD");
}
