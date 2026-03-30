const BASE_URL = "https://vault.devoriole.ru";

type ApiRequestOptions = {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  query?: Record<string, string | number | boolean | undefined>;
  token?: string | null;
  body?: unknown;
  headers?: Record<string, string>;
};

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
  const res = await fetch(url, {
    method,
    headers: {
      ...(token ? { authorization: token } : {}),
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

export async function reportsSummaryCsvApi({
  token,
  period,
}: {
  token?: string | null;
  period: "week" | "month" | "year";
}) {
  return apiRequest<string>({
    method: "GET",
    path: "/api/reports/summary.csv",
    query: { period },
    token,
    headers: { Accept: "text/csv" },
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

