# ТЗ для бэкенда под мобильный фронт CollectiblesVault

Документ описывает, что именно ожидает фронтенд от API: заголовки, схемы запросов/ответов, статусы, ошибки и особенности. Все эндпоинты ниже считаются верными путями; если в текущей реализации что‑то расходится — прошу отметить и согласовать маппинг.

## Общие требования
- База: `https://vault.devoriole.ru`
- Аутентификация: заголовок `Authorization: Bearer <token>`
- Ответы JSON (`application/json`), кроме CSV‑эндпоинтов
- Ошибки:
  - 401 Unauthorized — невалидный/просроченный токен (без HTML)
  - 422 Unprocessable Entity — валидация (с телом FastAPI `HTTPValidationError` или унифицированным JSON)
  - 4xx/5xx — JSON с `message`/`detail` по возможности
- Пагинация (там где массивы могут быть большими): `?limit` (1..200, default 50), `?offset` (>=0)
- Часовой пояс и даты: ISO 8601, UTC (например, `2026-03-30T12:00:00Z`)

---

## Auth

### POST /api/login
- Body:
```json
{ "email": "user@example.com", "password": "secret123" }
```
- 200 OK: объект с любым из полей токена (фронт извлекает первое строковое достаточной длины), желательно:
```json
{ "token": "<jwt-or-session-token>" }
```
- Ошибки: 422 для невалидного email/пароля (не совпадают), 401 для неверных учётных

### POST /api/register
- Body:
```json
{ "email": "user@example.com", "password": "secret123" }
```
- 200 OK: объект со свежим токеном (как и login)
- Ошибки: 422 (занятый email, слабый пароль)

### GET /api/auth/me
- Headers: `Authorization: Bearer <token>`
- 200 OK:
```json
{
  "email": "user@example.com",
  "display_name": "Имя Фамилия",
  "bio": "Текст био",
  "avatar_url": "https://..."
}
```
- Ошибки: 401 если токен невалиден

### PATCH /api/auth/me
- Headers: `Authorization`
- Body (все поля опц.):
```json
{
  "email": "user@example.com",
  "display_name": "Имя",
  "bio": "Био",
  "avatar_url": "https://..."
}
```
- 200 OK: объект профиля (как в GET)

### POST /api/auth/me/password
- Headers: `Authorization`
- Body:
```json
{ "current_password": "old", "new_password": "new" }
```
- 200 OK: `{ "changed": true }`

### PATCH /api/auth/me/deactivate
- Headers: `Authorization`
- 200 OK: `{ "deactivated": true }`

---

## Users / Community

### GET /api/users
- Query: `limit`, `offset`
- 200 OK (массив):
```json
[{
  "id": 123,
  "display_name": "Александр",
  "handle": "@alex",
  "bio": "О себе",
  "avatar_url": "https://...",
  "collections_count": 5,
  "items_count": 120,
  "total_value_usd": 123456,
  "is_self": false
}]
```

### GET /api/users/{user_id}
- 200 OK: как один объект из списка выше

### GET /api/users/{user_id}/collections
- Headers: опционально `Authorization`
- 200 OK (массив):
```json
[{
  "id": 1,
  "name": "Мои часы",
  "description": "опц.",
  "items_count": 24,
  "total_value_usd": 125000,
  "image_url": "https://..."  // опц. обложка
}]
```

---

## Collections

### GET /api/collections
- Headers: `Authorization`
- 200 OK (массив):
```json
[{
  "id": 1,
  "name": "Мои часы",
  "description": "опц."
}]
```

### POST /api/collections
- Headers: `Authorization`
- Body:
```json
{ "name": "Название", "description": "опц." }
```
- 200 OK:
```json
{ "id": 1, "name": "Название", "description": "опц." }
```

### PUT /api/collections/{collection_id}
- Headers: `Authorization`
- Body:
```json
{ "name": "Новое имя", "description": "опц." }
```
- 200 OK: обновлённая коллекция

### DELETE /api/collections/{collection_id}
- Headers: `Authorization`
- 200 OK: `{ "deleted": true }`

### PATCH /api/collections/{collection_id}/visibility
- Headers: `Authorization`
- Body:
```json
{ "is_public": true }
```
- 200 OK: `{ "is_public": true }`

### GET /api/collections/{collection_id}/items
- Публичные предметы по коллекции:
```json
[{
  "id": 101,
  "name": "Наименование",
  "category_id": 11,
  "price": 1234.56,
  "description": "опц.",
  "image_url": "https://..."
}]
```

---

## Items

### GET /api/items
- Headers: `Authorization`
- 200 OK (массив моих предметов, формат как в GET по коллекции, но с `collection_id`):
```json
[{
  "id": 101,
  "collection_id": 1,
  "category_id": 11,
  "name": "Наименование",
  "price": 1234.56,
  "description": "опц.",
  "image_url": "https://..."
}]
```

### POST /api/items
- Headers: `Authorization`
- Body (обяз.): `collection_id`, `category_id`, `name`, `price`; опц.: `description`, `image_url`
- 200 OK: созданный предмет `{ "id": 101, ... }`

### PUT /api/items/{item_id}
- Headers: `Authorization`
- Body: минимум `name`, `price`; опц.: `description`, `image_url`
- 200 OK: обновлённый предмет

### DELETE /api/items/{item_id}
- Headers: `Authorization`
- 200 OK: `{ "deleted": true }`

### PATCH /api/items/{item_id}/visibility
- Headers: `Authorization`
- Body: `{ "is_public": true }`
- 200 OK: `{ "is_public": true }`

---

## Categories

### GET /api/categories
- Headers: `Authorization` (опц.)
- 200 OK:
```json
[ { "id": 11, "name": "Часы" } ]
```

### POST /api/categories
- Headers: `Authorization`
- Body: `{ "name": "Часы" }`
- 200 OK: `{ "id": 11, "name": "Часы" }`

---

## Wishlist

### GET /api/wishlist
- Headers: `Authorization`
- 200 OK (массив — может быть лёгкой формой, но желательно вернуть минимум):
```json
[{
  "item_id": 101,
  "item_name": "Наименование",
  "image_url": "https://...",
  "estimated_price": 1234.56,
  "priority": "high" | "medium" | "low",
  "notes": "опц.",
  "category_name": "Часы"   // опц., если есть
}]
```

### POST /api/items/{item_id}/wishlist
- Headers: `Authorization`
- 200 OK: `{ "ok": true }`

### DELETE /api/items/{item_id}/wishlist
- Headers: `Authorization`
- 200 OK: `{ "deleted": true }`

// (Альтернатива с `/api/wishlist` POST/DELETE также поддерживается фронтом, но основной UX — флаг на item)

---

## Социалка

### POST /api/items/{item_id}/like
- Headers: `Authorization`
- 200 OK: `{ "ok": true }`

### DELETE /api/items/{item_id}/like
- Headers: `Authorization`
- 200 OK: `{ "deleted": true }`

### GET /api/items/{item_id}/comments
- 200 OK:
```json
[{
  "id": 1,
  "text": "Комментарий",
  "author": "Имя",
  "created_at": "2026-03-30T12:00:00Z"
}]
```

### POST /api/items/{item_id}/comments
- Headers: `Authorization`
- Body: `{ "text": "..." }`
- 200 OK: созданный комментарий

---

## Reports / Статистика

### GET /api/reports/summary?period=week|month|year
- Headers: `Authorization` (желательно)
- Период (контракт для фронта):
  - `week` — последние 7 дней
  - `month` — последние 1 год
  - `year` — последние 30 дней
- 200 OK (минимум):
```json
{
  "period": "week",
  "buckets": [
    { "label": "Пн", "collectionsDelta": 1, "itemsDelta": 3, "likesDelta": 4, "commentsDelta": 2, "wishlistDelta": 1 }
  ],
  "totals": {
    "collections": 12,
    "items": 245,
    "likes": 58,
    "comments": 21,
    "wishlist": 34,
    "portfolioUsd": 123456
  },
  "categories": [
    { "label": "Часы", "value": 120 },
    { "label": "Монеты", "value": 80 }
  ]
}
```
- Фронтенд:
  - `buckets.itemsDelta` — серия для столбиков
  - `totals.portfolioUsd` — карточка портфеля
  - `categories` — donut

### GET /api/reports/activity?period=...
- 200 OK:
```json
{
  "events": [
    { "type": "item_created", "title": "Создан предмет", "subtitle": "Ролекс ...", "created_at": "2026-03-30T12:00:00Z" }
  ]
}
```

### GET /api/reports/collections?fromDate&toDate
- Headers: `Authorization`
- 200 OK: массив объектов (гибкий формат), используется для таблиц/экспортов

### GET /api/reports/items?fromDate&toDate
- Headers: `Authorization`
- 200 OK: массив объектов

### GET /api/reports/summary.csv?period=...
### GET /api/reports/collections.csv?fromDate&toDate
### GET /api/reports/items.csv?fromDate&toDate
- Контент: CSV, `text/csv`

---

## Auction

### GET /api/lots
- 200 OK (массив):
```json
[{
  "id": 10,
  "name": "Лот 10",
  "description": "опц.",
  "start_price": 1000,
  "current_price": 1500,   // если ведётся
  "step": 50,
  "end_time": "2026-04-01T12:00:00Z"
}]
```

### POST /api/lot
- Headers: `Authorization`
- Body:
```json
{
  "name": "Лот",
  "description": "опц.",
  "start_price": 1000,
  "step": 50,
  "end_time": "2026-04-01T12:00:00Z"
}
```
- 200 OK: созданный лот `{ "id": 10, ... }`

### POST /api/bid
- Headers: `Authorization`
- Body:
```json
{ "lot_id": 10, "amount": 1600 }
```
- 200 OK: `{ "ok": true, "current_price": 1600 }` (желательно вернуть актуальную цену/состояние)
- Ошибки: 422 (слишком малая ставка, завершённый аукцион и т.п.) с понятным сообщением

---

## Health

### GET /api/health
### GET /api/db-health
- 200 OK: `{ "status": "ok" }` (или объект свойств)

---

## Примечания для интеграции
- Фронт при 401 на protected эндпоинтах не должен падать — лучше вернуть 401 с JSON, фронт очистит сессию.
- Для больших списков (`/users`, потенциально `/items`) — поддерживать пагинацию.
- Ответы без HTML. Даже в ошибках — JSON.
- По возможности, для `reports/summary` вернуть консистентные `label` для выбранного периода (Week: Пн..Вс, Month: Нед.1..4, Year: Янв..Дек).

