/** Суммы хранятся в USD; отображение по выбранной валюте. */

export type CurrencyCode = "USD" | "EUR" | "RUB" | "GBP";

/** Fallback: сколько единиц валюты за 1 USD. */
const FALLBACK_USD_TO: Record<CurrencyCode, number> = {
  USD: 1,
  EUR: 0.92,
  RUB: 92,
  GBP: 0.79,
};

let USD_TO: Record<CurrencyCode, number> = { ...FALLBACK_USD_TO };

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

export async function refreshCurrencyRates() {
  try {
    // Floatrates exposes bid/ask for many currency pairs.
    const res = await fetch("https://www.floatrates.com/daily/usd.json");
    if (!res.ok) return;
    const json = (await res.json()) as Record<string, any>;
    const eurBid = Number(json?.eur?.bid ?? json?.eur?.rate);
    const rubBid = Number(json?.rub?.bid ?? json?.rub?.rate);
    const gbpBid = Number(json?.gbp?.bid ?? json?.gbp?.rate);
    USD_TO = {
      USD: 1,
      EUR: Number.isFinite(eurBid) && eurBid > 0 ? eurBid : FALLBACK_USD_TO.EUR,
      RUB: Number.isFinite(rubBid) && rubBid > 0 ? rubBid : FALLBACK_USD_TO.RUB,
      GBP: Number.isFinite(gbpBid) && gbpBid > 0 ? gbpBid : FALLBACK_USD_TO.GBP,
    };
  } catch {
    // keep fallback cache
  }
}

function currencySymbol(code: CurrencyCode) {
  switch (code) {
    case "USD":
      return "$";
    case "EUR":
      return "€";
    case "RUB":
      return "₽";
    case "GBP":
      return "£";
  }
}

export function formatCurrency(amountUsd: number, code: CurrencyCode): string {
  const v = amountUsd * USD_TO[code];
  const n = Math.round(v);
  const symbol = currencySymbol(code);
  return code === "RUB" ? `${n.toLocaleString("ru-RU")}\u00A0${symbol}` : `${symbol}${n.toLocaleString("ru-RU")}`;
}

export function formatCurrencyThousands(amountUsd: number, code: CurrencyCode): string {
  const v = (amountUsd * USD_TO[code]) / 1000;
  const k = Math.round(v);
  const symbol = currencySymbol(code);
  return code === "RUB"
    ? `${k.toLocaleString("ru-RU")}\u00A0тыс.\u00A0${symbol}`
    : `${symbol}${k.toLocaleString("ru-RU")}\u00A0k`;
}

/** @deprecated используйте formatCurrency с контекстом валюты */
export function formatUsd(n: number): string {
  return formatCurrency(n, "USD");
}

/** @deprecated используйте formatCurrencyThousands с контекстом валюты */
export function formatUsdThousands(n: number): string {
  return formatCurrencyThousands(n, "USD");
}
