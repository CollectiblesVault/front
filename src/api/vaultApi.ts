const BASE_URL = "https://vault.devoriole.ru";

type ApiRequestOptions = {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  query?: Record<string, string | number | boolean | undefined>;
  token?: string | null;
  body?: unknown;
  headers?: Record<string, string>;
};

type SummaryPeriod = "week" | "month" | "year";

function toQueryString(query: ApiRequestOptions["query"]) {
  if (!query) return "";
  const parts: string[] = [];
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined) continue;
    parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  }
  return parts.length ? `?${parts.join("&")}` : "";
}

async function apiRequest<T = any>({ method, path, query, token, body, headers }: ApiRequestOptions) {
  const url = `${BASE_URL}${path}${toQueryString(query)}`;
  const authHeaderValue =
    token && token.trim().length > 0
      ? /^Bearer\s+/i.test(token.trim())
        ? token.trim()
        : `Bearer ${token.trim()}`
      : null;
  const res = await fetch(url, {
    method,
    headers: {
      ...(authHeaderValue ? { authorization: authHeaderValue } : {}),
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      Accept: "application/json",
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API error ${res.status}: ${text || res.statusText}`);
  }

  // Some endpoints (e.g. CSV) return non-JSON.
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("text/csv") || contentType.includes("text/plain")) {
    return (await res.text()) as unknown as T;
  }

  return (await res.json()) as T;
}

function extractToken(payload: any): string | null {
  if (!payload || typeof payload !== "object") return null;

  const candidates = [
    payload.access_token,
    payload.token,
    payload.auth_token,
    payload.authorization,
    payload.accessToken,
    payload.jwt,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.length > 10) return c;
  }

  // Fallback: first string value.
  const maybe = Object.values(payload).find((v) => typeof v === "string");
  return typeof maybe === "string" ? maybe : null;
}

export async function loginApi({
  email,
  password,
}: {
  email: string;
  password: string;
}): Promise<{ token: string | null; raw: any }> {
  const raw = await apiRequest<any>({
    method: "POST",
    path: "/api/login",
    body: { email, password },
  });
  return { token: extractToken(raw), raw };
}

export async function registerApi({
  email,
  password,
}: {
  email: string;
  password: string;
}): Promise<{ token: string | null; raw: any }> {
  const raw = await apiRequest<any>({
    method: "POST",
    path: "/api/register",
    body: { email, password },
  });
  return { token: extractToken(raw), raw };
}

export async function meApi(token: string) {
  return apiRequest<any>({ method: "GET", path: "/api/auth/me", token });
}

export async function patchMeApi({
  token,
  patch,
}: {
  token: string;
  patch: { display_name?: string | null; email?: string | null; bio?: string | null; avatar_url?: string | null };
}) {
  // Backend expects snake_case in openapi names.
  return apiRequest<any>({
    method: "PATCH",
    path: "/api/auth/me",
    token,
    body: patch,
  });
}

export async function uploadMyAvatarApi({
  token,
  fileUri,
  fileName = "avatar.jpg",
  mimeType = "image/jpeg",
}: {
  token: string;
  fileUri: string;
  fileName?: string;
  mimeType?: string;
}) {
  const authHeaderValue = /^Bearer\s+/i.test(token.trim()) ? token.trim() : `Bearer ${token.trim()}`;
  const formData = new FormData();
  formData.append("file", {
    uri: fileUri,
    name: fileName,
    type: mimeType,
  } as any);

  const res = await fetch(`${BASE_URL}/api/auth/me/avatar`, {
    method: "POST",
    headers: {
      authorization: authHeaderValue,
      Accept: "application/json",
    },
    body: formData,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API error ${res.status}: ${text || res.statusText}`);
  }
  return (await res.json()) as any;
}

export async function reportsSummaryCsvApi({
  token,
  period,
}: {
  token?: string | null;
  period: SummaryPeriod;
}) {
  return apiRequest<string>({
    method: "GET",
    path: "/api/reports/summary.csv",
    query: { period },
    token,
    headers: { Accept: "text/csv" },
  });
}

const SUMMARY_CSV_HEADER = "period,date,metric,value";
const SUMMARY_METRICS = new Set(["collections", "items", "likes", "comments", "wishlist"]);

function parseCsvCellRow(line: string) {
  // API currently returns simple CSV without escaped commas in values.
  return line.split(",").map((cell) => cell.trim());
}

function normalizeSummaryCsv(csv: string, fallbackPeriod: SummaryPeriod): string[] {
  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  const header = parseCsvCellRow(lines[0]).map((cell) => cell.toLowerCase());
  const body = lines.slice(1);
  const normalizedRows: string[] = [];

  const periodIdx = header.indexOf("period");
  const dateIdx = header.indexOf("date");
  const metricIdx = header.indexOf("metric");
  const valueIdx = header.indexOf("value");

  // Already in long format: period,date,metric,value
  if (dateIdx >= 0 && metricIdx >= 0 && valueIdx >= 0) {
    for (const row of body) {
      const cols = parseCsvCellRow(row);
      const rowPeriod = periodIdx >= 0 ? cols[periodIdx] || fallbackPeriod : fallbackPeriod;
      const rowDate = cols[dateIdx] ?? "";
      const rowMetric = (cols[metricIdx] ?? "").toLowerCase();
      const rowValue = cols[valueIdx] ?? "0";
      if (!rowDate || !SUMMARY_METRICS.has(rowMetric)) continue;
      normalizedRows.push(`${rowPeriod},${rowDate},${rowMetric},${rowValue}`);
    }
    return normalizedRows;
  }

  // Wide format fallback: date,collections,items,likes,comments,wishlist
  if (dateIdx >= 0) {
    const metricColumns = header
      .map((name, idx) => ({ name, idx }))
      .filter((entry) => SUMMARY_METRICS.has(entry.name));

    for (const row of body) {
      const cols = parseCsvCellRow(row);
      const rowDate = cols[dateIdx] ?? "";
      if (!rowDate) continue;
      for (const metric of metricColumns) {
        const metricValue = cols[metric.idx] ?? "0";
        normalizedRows.push(`${fallbackPeriod},${rowDate},${metric.name},${metricValue}`);
      }
    }
  }

  return normalizedRows;
}

export async function reportsSummaryCsvUnifiedApi({
  token,
  period,
}: {
  token?: string | null;
  period: SummaryPeriod;
}) {
  const raw = await reportsSummaryCsvApi({ token, period });
  const rows = normalizeSummaryCsv(raw, period);
  return [SUMMARY_CSV_HEADER, ...rows].join("\n");
}

export async function reportsSummaryCsvCombinedApi({
  token,
  periods = ["week", "month", "year"],
}: {
  token?: string | null;
  periods?: SummaryPeriod[];
}) {
  const chunks = await Promise.all(periods.map((period) => reportsSummaryCsvApi({ token, period })));
  const allRows = chunks.flatMap((chunk, idx) => normalizeSummaryCsv(chunk, periods[idx]));
  return [SUMMARY_CSV_HEADER, ...allRows].join("\n");
}

export async function reportsSummaryApi({
  token,
  period,
}: {
  token?: string | null;
  period: "week" | "month" | "year";
}) {
  return apiRequest<any>({
    method: "GET",
    path: "/api/reports/summary",
    query: { period },
    token,
  });
}

export async function reportsCollectionsApi({
  token,
  fromDate,
  toDate,
}: {
  token?: string | null;
  fromDate: string; // ISO
  toDate: string;   // ISO
}) {
  return apiRequest<any[]>({
    method: "GET",
    path: "/api/reports/collections",
    query: { fromDate, toDate },
    token,
  });
}

export async function reportsItemsApi({
  token,
  fromDate,
  toDate,
}: {
  token?: string | null;
  fromDate: string; // ISO
  toDate: string;   // ISO
}) {
  return apiRequest<any[]>({
    method: "GET",
    path: "/api/reports/items",
    query: { fromDate, toDate },
    token,
  });
}

export async function reportsActivityApi({
  token,
  period,
}: {
  token?: string | null;
  period: "week" | "month" | "year";
}) {
  return apiRequest<any>({
    method: "GET",
    path: "/api/reports/activity",
    query: { period },
    token,
  });
}
export async function getPublicUsersApi({
  limit,
  offset,
}: {
  limit?: number;
  offset?: number;
}) {
  return apiRequest<any[]>({
    method: "GET",
    path: "/api/users",
    query: { limit, offset },
  });
}

export async function getUserCollectionsApi({ userId, token }: { userId: number; token?: string | null }) {
  return apiRequest<any[]>({
    method: "GET",
    path: `/api/users/${userId}/collections`,
    token,
  });
}

export async function getPublicCollectionItemsApi({ collectionId }: { collectionId: number }) {
  return apiRequest<any[]>({
    method: "GET",
    path: `/api/collections/${collectionId}/items`,
  });
}

export async function getCollectionsApi({ token }: { token?: string | null }) {
  return apiRequest<any[]>({
    method: "GET",
    path: "/api/collections",
    token,
  });
}

export async function deleteCollectionApi({ token, collectionId }: { token?: string | null; collectionId: number }) {
  return apiRequest<{ [k: string]: boolean }>({
    method: "DELETE",
    path: `/api/collections/${collectionId}`,
    token,
  });
}

export async function getItemsApi({ token }: { token?: string | null }) {
  return apiRequest<any[]>({
    method: "GET",
    path: "/api/items",
    token,
  });
}

export async function deleteItemApi({ token, itemId }: { token?: string | null; itemId: number }) {
  return apiRequest<{ [k: string]: boolean }>({
    method: "DELETE",
    path: `/api/items/${itemId}`,
    token,
  });
}

export async function getWishlistApi({ token }: { token?: string | null }) {
  return apiRequest<any[]>({
    method: "GET",
    path: "/api/wishlist",
    token,
  });
}

export async function createWishlistApi({
  token,
  item_id,
  item_name,
}: {
  token?: string | null;
  item_id?: number | null;
  item_name?: string | null;
}) {
  return apiRequest<any>({
    method: "POST",
    path: "/api/wishlist",
    token,
    body: {
      ...(item_id !== undefined ? { item_id } : {}),
      ...(item_name !== undefined ? { item_name } : {}),
    },
  });
}

export async function deleteWishlistApi({ token, wishlistId }: { token?: string | null; wishlistId: number }) {
  return apiRequest<{ [k: string]: boolean }>({
    method: "DELETE",
    path: `/api/wishlist/${wishlistId}`,
    token,
  });
}

export async function getPublicUserApi({ userId }: { userId: number }) {
  return apiRequest<any>({
    method: "GET",
    path: `/api/users/${userId}`,
  });
}

export async function getCategoriesApi({ token }: { token?: string | null }) {
  return apiRequest<any[]>({
    method: "GET",
    path: "/api/categories",
    token,
  });
}

export async function createCategoryApi({ token, name }: { token?: string | null; name: string }) {
  return apiRequest<any>({
    method: "POST",
    path: "/api/categories",
    token,
    body: { name },
  });
}

export async function createCollectionApi({
  token,
  name,
  description,
}: {
  token?: string | null;
  name: string;
  description?: string | null;
}) {
  return apiRequest<any>({
    method: "POST",
    path: "/api/collections",
    token,
    body: { name, ...(description !== undefined ? { description } : {}) },
  });
}

export async function updateCollectionApi({
  token,
  collectionId,
  name,
  description,
}: {
  token?: string | null;
  collectionId: number;
  name: string;
  description?: string | null;
}) {
  return apiRequest<any>({
    method: "PUT",
    path: `/api/collections/${collectionId}`,
    token,
    body: { name, ...(description !== undefined ? { description } : {}) },
  });
}

export async function setCollectionVisibilityApi({
  token,
  collectionId,
  is_public,
}: {
  token?: string | null;
  collectionId: number;
  is_public: boolean;
}) {
  return apiRequest<any>({
    method: "PATCH",
    path: `/api/collections/${collectionId}/visibility`,
    token,
    body: { is_public },
  });
}

export async function createItemApi({
  token,
  collection_id,
  category_id,
  name,
  price,
  image_url,
  description,
}: {
  token?: string | null;
  collection_id: number;
  category_id: number;
  name: string;
  price: number | string;
  image_url?: string | null;
  description?: string | null;
}) {
  return apiRequest<any>({
    method: "POST",
    path: "/api/items",
    token,
    body: {
      collection_id,
      category_id,
      name,
      price,
      ...(image_url !== undefined ? { image_url } : {}),
      ...(description !== undefined ? { description } : {}),
    },
  });
}

export async function updateItemApi({
  token,
  item_id,
  name,
  price,
  image_url,
  description,
}: {
  token?: string | null;
  item_id: number;
  name: string;
  price: number | string;
  image_url?: string | null;
  description?: string | null;
}) {
  return apiRequest<any>({
    method: "PUT",
    path: `/api/items/${item_id}`,
    token,
    body: {
      name,
      price,
      ...(image_url !== undefined ? { image_url } : {}),
      ...(description !== undefined ? { description } : {}),
    },
  });
}

export async function setItemVisibilityApi({
  token,
  itemId,
  is_public,
}: {
  token?: string | null;
  itemId: number;
  is_public: boolean;
}) {
  return apiRequest<any>({
    method: "PATCH",
    path: `/api/items/${itemId}/visibility`,
    token,
    body: { is_public },
  });
}

export async function likeItemApi({ token, itemId }: { token?: string | null; itemId: number }) {
  return apiRequest<any>({
    method: "POST",
    path: `/api/items/${itemId}/like`,
    token,
  });
}

export async function unlikeItemApi({ token, itemId }: { token?: string | null; itemId: number }) {
  return apiRequest<any>({
    method: "DELETE",
    path: `/api/items/${itemId}/like`,
    token,
  });
}

export async function createItemCommentApi({
  token,
  itemId,
  text,
}: {
  token?: string | null;
  itemId: number;
  text: string;
}) {
  return apiRequest<any>({
    method: "POST",
    path: `/api/items/${itemId}/comments`,
    token,
    body: { text },
  });
}

export async function getItemCommentsApi({ itemId, token }: { itemId: number; token?: string | null }) {
  return apiRequest<any[]>({
    method: "GET",
    path: `/api/items/${itemId}/comments`,
    token,
  });
}

export async function addItemToWishlistApi({ token, itemId }: { token?: string | null; itemId: number }) {
  return apiRequest<any>({
    method: "POST",
    path: `/api/items/${itemId}/wishlist`,
    token,
  });
}

export async function removeItemFromWishlistApi({ token, itemId }: { token?: string | null; itemId: number }) {
  return apiRequest<any>({
    method: "DELETE",
    path: `/api/items/${itemId}/wishlist`,
    token,
  });
}

export async function getLotsApi() {
  return apiRequest<any[]>({
    method: "GET",
    path: "/api/lots",
  });
}

export async function getLotBidsApi({
  lotId,
  token,
}: {
  lotId: number;
  token?: string | null;
}) {
  return apiRequest<any[]>({
    method: "GET",
    path: `/api/lots/${lotId}/bids`,
    token,
  });
}

export async function closeLotApi({
  lotId,
  token,
}: {
  lotId: number;
  token?: string | null;
}) {
  return apiRequest<any>({
    method: "POST",
    path: `/api/lots/${lotId}/close`,
    token,
  });
}

export async function settleExpiredLotsApi({ token }: { token?: string | null }) {
  return apiRequest<any>({
    method: "POST",
    path: "/api/lots/settle-expired",
    token,
  });
}

export async function createLotApi({
  token,
  name,
  collection_id,
  item_id,
  start_price,
  step,
  end_time,
  description,
}: {
  token?: string | null;
  name: string;
  collection_id: number;
  item_id?: number | null;
  start_price: number | string;
  step: number | string;
  end_time: string;
  description?: string | null;
}) {
  return apiRequest<any>({
    method: "POST",
    path: "/api/lot",
    token,
    body: {
      name,
      collection_id,
      ...(item_id !== undefined ? { item_id } : {}),
      start_price,
      step,
      end_time,
      ...(description !== undefined ? { description } : {}),
    },
  });
}

export async function createBidApi({
  token,
  lot_id,
  amount,
}: {
  token?: string | null;
  lot_id: number;
  amount: number | string;
}) {
  return apiRequest<any>({
    method: "POST",
    path: "/api/bid",
    token,
    body: { lot_id, amount },
  });
}

// --- Health ---
export async function healthApi() {
  return apiRequest<Record<string, string>>({ method: "GET", path: "/api/health" });
}

export async function dbHealthApi() {
  return apiRequest<Record<string, string>>({ method: "GET", path: "/api/db-health" });
}

// --- Auth (extended) ---
export async function changePasswordApi({
  token,
  current_password,
  new_password,
}: {
  token: string;
  current_password: string;
  new_password: string;
}) {
  return apiRequest<Record<string, boolean>>({
    method: "POST",
    path: "/api/auth/me/password",
    token,
    body: { current_password, new_password },
  });
}

export async function deactivateMeApi({ token }: { token: string }) {
  return apiRequest<any>({
    method: "PATCH",
    path: "/api/auth/me/deactivate",
    token,
  });
}

// --- Reports (additional endpoints from OpenAPI) ---
export async function reportsCollectionApi({
  token,
  collectionId,
  fromDate,
  toDate,
}: {
  token?: string | null;
  collectionId: number;
  fromDate: string; // ISO
  toDate: string; // ISO
}) {
  return apiRequest<any[]>({
    method: "GET",
    path: "/api/reports/collection",
    query: { collectionId, fromDate, toDate },
    token,
  });
}

export async function reportsItemApi({ token, itemId }: { token?: string | null; itemId: number }) {
  return apiRequest<any>({
    method: "GET",
    path: "/api/reports/item",
    query: { itemId },
    token,
  });
}

export async function reportsCategoryApi({
  token,
  sort = "items_count",
}: {
  token?: string | null;
  sort?: string;
}) {
  return apiRequest<any[]>({
    method: "GET",
    path: "/api/reports/category",
    query: { sort },
    token,
  });
}

export async function reportsCollectionsCsvApi({
  token,
  fromDate,
  toDate,
}: {
  token?: string | null;
  fromDate: string; // ISO
  toDate: string; // ISO
}) {
  return apiRequest<string>({
    method: "GET",
    path: "/api/reports/collections.csv",
    query: { fromDate, toDate },
    token,
    headers: { Accept: "text/csv" },
  });
}

export async function reportsItemsCsvApi({
  token,
  fromDate,
  toDate,
}: {
  token?: string | null;
  fromDate: string; // ISO
  toDate: string; // ISO
}) {
  return apiRequest<string>({
    method: "GET",
    path: "/api/reports/items.csv",
    query: { fromDate, toDate },
    token,
    headers: { Accept: "text/csv" },
  });
}

// --- Social (generic endpoints from OpenAPI) ---
export async function createLikeApi({
  token,
  entity_type,
  entity_id,
}: {
  token?: string | null;
  entity_type: string;
  entity_id: number;
}) {
  return apiRequest<any>({
    method: "POST",
    path: "/api/like",
    token,
    body: { entity_type, entity_id },
  });
}

export async function createCommentApi({
  token,
  entity_type,
  entity_id,
  text,
}: {
  token?: string | null;
  entity_type: string;
  entity_id: number;
  text: string;
}) {
  return apiRequest<any>({
    method: "POST",
    path: "/api/comment",
    token,
    body: { entity_type, entity_id, text },
  });
}

export async function getCommentsApi({
  entity_type,
  entity_id,
}: {
  entity_type: string;
  entity_id: number;
}) {
  return apiRequest<any[]>({
    method: "GET",
    path: "/api/comments",
    query: { entity_type, entity_id },
  });
}

