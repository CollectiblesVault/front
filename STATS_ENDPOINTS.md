# Эндпоинты статистики (из текущей OpenAPI) и требования фронта

Ниже список эндпоинтов, которые возвращают статистические/аналитические данные.

- `GET /api/reports/summary?period=...`
  - Сводная статистика за период (`week`/`month`/`year`).
  - Фронт ожидает минимум:
    - `buckets`: массив точек серии
      - `{ label: string, collectionsDelta: number, itemsDelta: number, likesDelta: number, commentsDelta: number, wishlistDelta: number }[]`
    - `totals`: агрегаты за период (используются в карточках/портфеле)
      - `{ collections: number, items: number, likes: number, comments: number, wishlist: number, portfolioUsd: number }`
    - `categories`: данные для donut-диаграммы
      - `{ label: string, value: number }[]`
- `GET /api/reports/summary.csv?period=...`
  - Та же сводка в CSV.
- `GET /api/reports/activity?period=...`
  - Сводка активности за период (можно использовать для “недавней активности”).
- `GET /api/reports/collections.csv?fromDate=...&toDate=...`
  - Отчёт по коллекциям в CSV за диапазон дат.
- `GET /api/reports/items.csv?fromDate=...&toDate=...`
  - Отчёт по предметам в CSV за диапазон дат.
- `GET /api/reports/collections?fromDate=...&toDate=...`
  - JSON-версия отчёта по коллекциям.
- `GET /api/reports/items?fromDate=...&toDate=...`
  - JSON-версия отчёта по предметам.
- `GET /api/reports/collection?collectionId=...&fromDate=...&toDate=...`
  - Статистика по конкретной коллекции.
- `GET /api/reports/item?itemId=...`
  - Статистика по конкретному предмету.
- `GET /api/reports/category?sort=...`
  - Статистика по категориям.

## Смежные эндпоинты с агрегатами (не раздел reports)

- `GET /api/users`
- `GET /api/users/{user_id}`
- `GET /api/users/{user_id}/collections`
- `GET /api/collections`
- `GET /api/items`
- `GET /api/wishlist`

Они обычно используются для dashboard-метрик (counts/sums), но формально это не отдельный reports API.

