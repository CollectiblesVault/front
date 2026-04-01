# Запросы API, добавленные в `vaultApi.ts`

Клиентские функции живут в `src/api/vaultApi.ts`. Ниже — HTTP-метод, путь и назначение.

## Лайки (статус и счётчик)

| Метод | Путь | Функция | Примечание |
|-------|------|---------|------------|
| `GET` | `/api/items/{item_id}/like` | `getItemLikeStatusApi({ token, itemId })` | Ожидаемое тело ответа парсится через `parseItemLikeStatus` → `{ likedByMe, likesCount }`. Поля бэка могут быть в snake_case или camelCase (`liked_by_me`, `likes_count`, и т.д.). |

## Загрузка изображений (multipart) — обложки и фото предметов

Поле формы: **`file`** (один файл). Заголовок: `Authorization: Bearer <token>` (обязателен для загрузки с клиента).

| Метод | Путь | Функция | Примечание |
|-------|------|---------|------------|
| `POST` | `/api/upload` | `uploadImageFileApi({ token?, fileUri, fileName?, mimeType?, uploadPath? })` | По умолчанию `uploadPath` = `/api/upload`. Ответ JSON; публичный URL извлекается через `extractUploadedImageUrl(raw)` (поля `url`, `image_url`, `file_url`, `public_url`, `data.url`). |
| `POST` | `/api/auth/me/avatar` | `uploadMyAvatarApi({ token, fileUri, fileName?, mimeType? })` | Только аватар профиля; тот же multipart-контракт, поле `file`. |

### Что должен сделать бэкенд для фото предметов и коллекций

1. **`POST /api/upload`**  
   - Принять `multipart/form-data`, поле **`file`**.  
   - Сохранить файл в хранилище (S3, локальный `static`, CDN).  
   - Вернуть JSON с **постоянным публичным URL**, по которому картинка открывается в браузере/приложении, например:  
     `{ "url": "https://vault.devoriole.ru/media/…" }` или `{ "image_url": "…" }`.

2. **Связка с сущностями** (уже есть на фронте):  
   - **Предмет:** `POST /api/items` и `PUT /api/items/{id}` принимают **`image_url`** — туда подставляется URL из шага 1.  
   - **Коллекция:** если бэк поддерживает обложку — то же поле в create/update коллекции (как договорено в вашем API); фронт передаёт строку URL после загрузки.

3. **Web:** пользователь может вставить **https://…** вручную — тот же `image_url` без вызова `/api/upload`.

### Утилиты на фронте (не отдельные HTTP)

- `src/utils/pickAndUploadImage.ts`  
  - `pickImageFromDevice("camera" \| "library")` — камера/галерея (Expo).  
  - `uploadImageFromLocalUri({ token, uri, … })` — внутри вызывает `uploadImageFileApi` + `extractUploadedImageUrl`.

## Вспомогательные экспорты из `vaultApi.ts` (без отдельного HTTP)

- `parseItemLikeStatus(raw)` — нормализация объекта ответа лайков.  
- `extractUploadedImageUrl(raw)` — извлечение URL из ответа загрузки.  
- Тип `ItemLikeStatus` — `{ likedByMe: boolean; likesCount: number }`.
