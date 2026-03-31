# Недостающее API / несоответствия UI (после полного удаления моков)

Фронт полностью избавлен от `src/data/mocks.ts`, но часть UI раньше показывала данные, которых **нет в OpenAPI**, либо они не гарантированы формой ответов. Ниже — список, что нужно добавить/уточнить в бэкенде, чтобы фронт мог быть “полностью живым” без заглушек.

## 1) Home: «Недавняя активность»

Раньше это было из моков `recentActivity`. Сейчас блок заменён на ссылку в отчёты.

Нужно:

- **GET `/api/activity/recent`**
  - Возвращает последние действия пользователя: создание/изменение коллекции, добавление предмета, лайк/коммент и т.п.
  - Поля: `type`, `title`, `subtitle`, `created_at`, `target` (например `{ screen: "ItemDetail", params: { id } }`)

## 2) Item detail: расширенные поля предмета

UI использует поля:

- `year`, `condition`, `purchasePrice`, `currentValue`, `acquired`

В OpenAPI для items есть только:

- `name`, `description`, `price`, `image_url`, `collection_id`, `category_id`

Нужно (один из вариантов):

- расширить модель `Item` этими полями
- или добавить отдельный эндпоинт:
  - **GET `/api/items/{item_id}`** (детальная карточка)

## 3) Лайки: состояние «я лайкнул» + актуальный счётчик

Сейчас фронт делает optimistic toggle и вызывает:

- `POST /api/items/{id}/like`
- `DELETE /api/items/{id}/like`

Но чтобы корректно показывать:

- “я лайкнул?” после перезахода
- точный `likesCount`

Нужно:

- либо в `GET /api/items/{id}` отдавать `likes_count` и `liked_by_me`
- либо отдельный эндпоинт:
  - **GET `/api/items/{id}/like`** → `{ liked_by_me, likes_count }`

## 4) Comments: автор/время

Сейчас фронт маппит `GET /api/items/{id}/comments` максимально терпимо, но нужен контракт:

- `id: number`
- `text: string`
- `author_display_name: string` (или `user`)
- `created_at: string` (ISO)

## 5) Wishlist: формат ответа

Фронт использует “wishlist как флаг на item” (эндпоинты):

- `POST /api/items/{id}/wishlist`
- `DELETE /api/items/{id}/wishlist`

А `GET /api/wishlist` в OpenAPI — массив объектов без явной схемы (в спецификации).

Нужно определить схему ответа `GET /api/wishlist`, например:

- `{ item_id, item_name, image_url, estimated_price, priority, notes, category_name }[]`

Либо убрать `GET /api/wishlist` и возвращать wishlist в `GET /api/items` (поле `is_wishlisted`).

## 6) Коллекции: обложка/картинка

В UI есть поле “обложка коллекции”. В OpenAPI у `CollectionCreate/Update` нет `image_url`.

Нужно:

- добавить `image_url` в коллекцию (create/update + get)
  - или отдельный эндпоинт для медиа/обложки.

## 7) Публичный профиль пользователя: коллекции и их метрики

`GET /api/users/{user_id}/collections` сейчас используется, но UI хотел показывать превью предметов внутри коллекции.

Чтобы сделать красиво без “второго клика”:

- либо добавить `cover_image_url`, `items_count`, `total_value_usd`
- либо добавить:
  - **GET `/api/users/{user_id}/collections/{collection_id}/items`** (публичный)

