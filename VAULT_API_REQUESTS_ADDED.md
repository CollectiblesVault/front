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

3. **Веб-версия:** пользователь может вставить **https://…** вручную — тот же `image_url` без вызова `/api/upload`.

### Утилиты на фронте (не отдельные HTTP)

- `src/utils/pickAndUploadImage.ts`  
  - `pickImageFromDevice("camera" \| "library")` — камера/галерея (Expo).  
  - `uploadImageFromLocalUri({ token, uri, … })` — внутри вызывает `uploadImageFileApi` + `extractUploadedImageUrl`.

## Кошелёк (баланс в USD)

Ожидаемые эндпоинты на бэке; фронт уже вызывает их при входе и после ставки на аукционе.

| Метод | Путь | Функция | Примечание |
|-------|------|---------|------------|
| `GET` | `/api/wallet` | `getWalletBalanceApi({ token })` | Ответ разбирается через `parseWalletBalance`: поля `balance_usd`, `balance`, `wallet_balance`, либо вложенный `wallet.balance_usd` / `wallet.balance`. Значение — число (USD). |
| `POST` | `/api/wallet/deposit` | `postWalletDepositApi({ token, amount_usd, reference? })` | Пополнение (тест, админ или внешний callback). Тело: `amount_usd`, опционально `reference`. |

### Пример ответа `GET /api/wallet`

```json
{ "balance_usd": 12500.5 }
```

или `{ "balance": 12500.5 }`.

## Вспомогательные экспорты из `vaultApi.ts` (без отдельного HTTP)

- `parseItemLikeStatus(raw)` — нормализация объекта ответа лайков.  
- `extractUploadedImageUrl(raw)` — извлечение URL из ответа загрузки.  
- `parseWalletBalance(raw)` — баланс кошелька из ответа API.  
- Тип `ItemLikeStatus` — `{ likedByMe: boolean; likesCount: number }`.

### Аукцион: ставка на фронте

- В поле вводится **надбавка** к **текущей цене** лота; на бэк в `POST /api/bid` по-прежнему уходит **итог** — `amount = current_price + надбавка` (в USD), минимальная надбавка = `step` лота (если `step` не задан, на фронте берётся `1`).
