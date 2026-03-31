# Запросы API, добавленные в `vaultApi.ts`

Клиентские функции живут в `src/api/vaultApi.ts`. Ниже — HTTP-метод, путь и назначение.

## Лайки (статус и счётчик)

| Метод | Путь | Функция | Примечание |
|-------|------|---------|------------|
| `GET` | `/api/items/{item_id}/like` | `getItemLikeStatusApi({ token, itemId })` | Ожидаемое тело ответа парсится через `parseItemLikeStatus` → `{ likedByMe, likesCount }`. Поля бэка могут быть в snake_case или camelCase (`liked_by_me`, `likes_count`, и т.д.). |

## Загрузка файлов (multipart)

Поле формы по умолчанию: **`file`** (как у аватара). Заголовок авторизации: `Authorization: Bearer …`, если передан `token`.

| Метод | Путь | Функция | Примечание |
|-------|------|---------|------------|
| `POST` | `/api/upload` | `uploadImageFileApi({ token?, fileUri, fileName?, mimeType?, uploadPath? })` | По умолчанию `uploadPath` = `/api/upload`. Другой путь бэка можно передать в `uploadPath`. Сырой JSON ответа — как вернул сервер; URL картинки удобно брать через `extractUploadedImageUrl(raw)`. |
| `POST` | `/api/auth/me/avatar` | `uploadMyAvatarApi({ token, fileUri, fileName?, mimeType? })` | Контракт не менялся; реализация переведена на общий `multipartPostJson` внутри модуля. |

## Вспомогательные экспорты (без отдельного HTTP)

- `parseItemLikeStatus(raw)` — нормализация объекта ответа лайков.
- `extractUploadedImageUrl(raw)` — извлечение URL из типичных ответов загрузки.
- Тип `ItemLikeStatus` — `{ likedByMe: boolean; likesCount: number }`.
