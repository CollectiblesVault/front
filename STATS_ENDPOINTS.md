# Эндпоинты статистики (из текущей OpenAPI)

Ниже список эндпоинтов, которые возвращают статистические/аналитические данные.

- `GET /api/reports/summary?period=...`
  - Сводная статистика за период (`week`/`month`/`year`).
- `GET /api/reports/summary.csv?period=...`
  - Та же сводка в CSV.
- `GET /api/reports/collections.csv?fromDate=...&toDate=...`
  - Отчёт по коллекциям в CSV за диапазон дат.
- `GET /api/reports/items.csv?fromDate=...&toDate=...`
  - Отчёт по предметам в CSV за диапазон дат.
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

