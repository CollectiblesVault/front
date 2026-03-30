/** Склонение для числительных: 1 лайк, 2 лайка, 5 лайков */
export function pluralRu(n: number, forms: [one: string, few: string, many: string]) {
  const abs = Math.abs(Math.trunc(n)) % 100;
  const n1 = abs % 10;
  if (abs > 10 && abs < 20) return forms[2];
  if (n1 > 1 && n1 < 5) return forms[1];
  if (n1 === 1) return forms[0];
  return forms[2];
}
