# Frontend → CollectiblesVault API: что переделать и какие эндпоинты использовать

Этот проект уже частично использует ваше API через `src/api/vaultApi.ts` (базовый URL, авторизация, CSV экспорт, users/categories/collections/items/social/wishlist). Ниже — чеклист, что именно перевести с моков на реальные эндпоинты и где это в UI.

## Текущее состояние (кратко)

- **Слой API уже есть**: `src/api/vaultApi.ts`
  - Используются: `POST /api/login`, `POST /api/register`, `GET/PATCH /api/auth/me`, `GET /api/reports/summary.csv`
  - Реализованы, но пока почти не подключены к UI: `GET/POST/PUT/PATCH` для `collections/items/categories`, `users`, `wishlist`, `likes`, `comments`
- **Основные данные экранов пока на моках**:
  - `src/data/mocks.ts`
  - `src/context/collections-store-context.tsx` строит коллекции/предметы из моков + локальных оверрайдов.

## Важно про авторизацию (header `authorization`)

В OpenAPI у protected-эндпоинтов параметр называется `authorization` (header).

Сейчас `apiRequest()` отправляет токен как есть:

- header `authorization: token`

Если ваш бэкенд ожидает `Bearer <token>`, то нужно будет:

- либо хранить в `authToken` уже строку вида `Bearer xxx`
- либо в `apiRequest()` автоматически добавлять `Bearer ` если его нет.

Файл: `src/api/vaultApi.ts` (функция `apiRequest`).

## Маппинг: экраны → эндпоинты

### Auth (Login/Welcome/Profile)

- **Login / Register** (`src/screens/LoginScreen.tsx`)
  - `POST /api/login` (`loginApi`)
  - `POST /api/register` (`registerApi`)
  - После успеха: `GET /api/auth/me` (`meApi`) → заполнить `userProfile`

- **Редактирование профиля** (у вас сейчас локально в `HomeScreen` в модалке)
  - `PATCH /api/auth/me` (`patchMeApi`) вместо `setUserProfile(...)` локально
  - (опционально) `POST /api/auth/me/password` — отдельный экран/модалка “смена пароля”
  - (опционально) `PATCH /api/auth/me/deactivate`

### Collections (экран “Мои коллекции” + детальная коллекции)

Сейчас: `CollectionsScreen` и `CollectionDetailScreen` берут данные из `useCollectionsStore()` (моки).

Перевод на API:

- Список коллекций:
  - `GET /api/collections` (нужен `authorization`)
- Создание:
  - `POST /api/collections`
- Редактирование:
  - `PUT /api/collections/{collection_id}`
- Удаление:
  - `DELETE /api/collections/{collection_id}`
- Публичность:
  - `PATCH /api/collections/{collection_id}/visibility` (`is_public`)

Что переделать во фронте:

- Вынести “источник истины” из моков → в контекст/хук, который
  - фетчит список из `GET /api/collections`
  - хранит `isLoading / error`
  - умеет `create/update/delete/visibility` через API и обновляет локальный кеш

### Items (предметы в коллекции + экран детали)

В OpenAPI:

- Список предметов (по коллекции, публичный):
  - `GET /api/collections/{collection_id}/items` (без токена)
- Ваши предметы (все):
  - `GET /api/items` (с токеном)
- Создание:
  - `POST /api/items` (нужны `collection_id`, `category_id`, `name`, `price`)
- Редактирование:
  - `PUT /api/items/{item_id}`
- Удаление:
  - `DELETE /api/items/{item_id}`
- Видимость:
  - `PATCH /api/items/{item_id}/visibility`

Социалка (деталь предмета):

- Лайк:
  - `POST /api/items/{item_id}/like`
  - `DELETE /api/items/{item_id}/like`
- Комменты:
  - `GET /api/items/{item_id}/comments`
  - `POST /api/items/{item_id}/comments` (body `{ text }`)

Что переделать:

- В `ItemDetailScreen` получать реальные:
  - лайки/комменты через эндпоинты выше (с токеном)
- Для карточек предметов нужен маппинг “item → category name”.
  - Для этого нужен список категорий: `GET /api/categories`

### Categories

- Список:
  - `GET /api/categories`
- Создание:
  - `POST /api/categories`

Что переделать:

- При создании/редактировании предмета показывать picker категорий,
  загруженный из API (а не строки из моков).

### Wishlist (“Желания”)

В OpenAPI есть 2 формата:

- “Современный” по item id:
  - `POST /api/items/{item_id}/wishlist`
  - `DELETE /api/items/{item_id}/wishlist`
- И “список желаний” как сущность:
  - `GET /api/wishlist`
  - `POST /api/wishlist` (body может содержать `item_id` или `item_name`)
  - `DELETE /api/wishlist/{wishlist_id}`

Что выбрать во фронте:

- Если в UI wishlist — это просто “флажок на item”, проще использовать
  `POST/DELETE /api/items/{id}/wishlist`.
- Если в UI нужен отдельный список с id-шниками wishlist-строк — тогда `GET /api/wishlist`
  и удаление через `DELETE /api/wishlist/{wishlist_id}`.

Сейчас `WishlistScreen` использует `useWishlist()` и моковые записи.

### Reports

Сейчас:

- Экспорт CSV уже умеет:
  - `GET /api/reports/summary.csv?period=...` (используется в `ReportsScreen`)

Что можно улучшить/подключить:

- Данные для виджетов на экране:
  - `GET /api/reports/summary?period=...` (JSON) — вместо “детерминированных” локальных расчётов
- Детализация:
  - `GET /api/reports/collection?collectionId=...&fromDate=...&toDate=...`
  - `GET /api/reports/item?itemId=...`
  - `GET /api/reports/category?sort=...`
  - CSV:
    - `GET /api/reports/collections.csv`
    - `GET /api/reports/items.csv`

### Community / Users

Сейчас `CommunityScreen` показывает моковые профили.

Перевод на API:

- `GET /api/users?limit&offset`
- `GET /api/users/{user_id}`
- `GET /api/users/{user_id}/collections`

## Конкретный “чеклист переделок” (самое полезное)

1) **CollectionsStore**: заменить моковый `collections-store-context` на API-backed store
   - `GET /api/collections`
   - `POST/PUT/DELETE /api/collections`
   - `PATCH /api/collections/{id}/visibility`

2) **Items**: добавить загрузку предметов из API
   - для “моих коллекций” — `GET /api/collections/{id}/items`
   - для “моих предметов” — `GET /api/items`
   - создание/редактирование/удаление через `POST/PUT/DELETE /api/items`

3) **Wishlist**: выбрать модель (item-flag или wishlist-entity) и подключить соответствующие эндпоинты.

4) **ItemDetail**: лайки/комменты на реальные эндпоинты.

5) **ReportsScreen**: заменить локальную “детерминированную” серию на `GET /api/reports/summary`.

6) **CommunityScreen**: заменить `mocks.ts` на `GET /api/users`.

## Где уже можно переиспользовать код прямо сейчас

В `src/api/vaultApi.ts` уже есть готовые функции под большинство ваших эндпоинтов из OpenAPI:

- auth: `loginApi`, `registerApi`, `meApi`, `patchMeApi`
- reports: `reportsSummaryCsvApi`
- users: `getPublicUsersApi`, `getUserCollectionsApi`
- collections/items/categories: `getPublicCollectionItemsApi`, `getCategoriesApi`, `createCategoryApi`, `createCollectionApi`, `updateCollectionApi`, `setCollectionVisibilityApi`, `createItemApi`, `updateItemApi`, `setItemVisibilityApi`
- social/wishlist: `likeItemApi`, `unlikeItemApi`, `createItemCommentApi`, `getItemCommentsApi`, `addItemToWishlistApi`, `removeItemFromWishlistApi`

Если скажешь, какой экран переводим первым (обычно “Мои коллекции”), я могу сразу сделать рефактор: контекст/хуки + загрузки + ошибки/ретраи + оптимистичные апдейты.

