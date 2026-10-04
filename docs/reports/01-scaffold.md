# Отчёт по шагу 1 — каркас

Дата: 04.10.2026. Бэкенд: `DITLEKS/SyncBack main @ 609ce98`. Ветка фронта: `feat/01-scaffold`.

## Что сделано

- Vite 5 + React 18 + TypeScript strict (`noUncheckedIndexedAccess`, `noImplicitOverride`), алиас `@/`, прокси `/api → http://localhost:8000`.
- Типы API сгенерированы `openapi-typescript` из реального `openapi.json` (получен из `app.main` на `609ce98`; 35 путей). Скрипт `npm run api:types`.
- `src/api`: `authSession` (access в памяти, refresh в localStorage, single-flight refresh, проактивное обновление за 60 с, подписка на очистку),
  `client` (openapi-fetch, middleware Authorization / 401 → refresh → один повтор), `ok()` → `ApiError`, `queryKeys`, ресурсы `auth`, `system`, `projects`.
- `src/domain`: `statusMeta` + `documentPolicy` (зеркало `DocumentLifecycle`), подсказки к кодам ошибок анализа; проверка совпадения словаря с OpenAPI на уровне типов.
- `src/lib`: `getErrorMessage` (оба формата `detail`, `Retry-After` для 429, сетевые ошибки), инкрементальный SSE-парсер, `formatBytes`/`formatDate`/`pluralize`, безопасный `localStorage`.
- Фича `auth`: `AuthProvider` (восстановление сессии, login/register/logout), `RequireAuth` с `returnTo`, `GuestOnly`, формы входа и регистрации (react-hook-form + zod, серверные ошибки показываются как есть).
- Фича `system`: `CapabilitiesProvider` (один запрос на сессию).
- Layout: сворачиваемый сайдбар (состояние в `localStorage`), меню аккаунта (email, роль, выход), заглушка настроек; страницы-заглушки разделов с указанием шага.
- shadcn-примитивы: button, input, label, card, alert, skeleton, tooltip, dropdown-menu, `FormField` с aria-связями.
- ESLint: typescript-eslint `strictTypeChecked`, react-hooks, `eslint-plugin-boundaries` (слои и публичные `index.ts` фич), Prettier с плагином Tailwind.
- Тесты (31, зелёные): single-flight refresh и проактивное обновление, middleware 401 → refresh → retry без зацикливания, SSE-парсер, `getErrorMessage`,
  `statusMeta`/`documentPolicy`, интеграционные с MSW: редирект с `returnTo`, вход, неверный пароль, 429 без повтора, 422 при регистрации, регистрация → вход, восстановление сессии.

Проверки: `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build` — зелёные (локально, Node 20.20).

## Что не работает из-за бэкенда

Ничего: на этом шаге фронт обращается только к `/auth/*` и `/system/capabilities`, запуск против живого бэкенда не выполнялся (в среде сборки нет Docker). Контракт проверен по сгенерированному OpenAPI и коду роутеров.

## Расхождения, найденные при сверке с кодом бэкенда

См. [docs/architecture.md, §1.4](../architecture.md#14-расхождения-промптаui-описания-с-кодом-бэкенда-найдены-при-сверке): R-1 (`export_format` принимает `md`, а формат документа — `markdown`),
R-2 (`add` вставляется в конец документа), R-3 (поиск `original_text` — первое вхождение во всём тексте), R-4 (слабые типы `format`/`role`/`view_mode` в OpenAPI),
R-5…R-7 (`.doc`, лимит, экспорт до `ready`, ручная правка текста — ограничения из промпта подтверждены).

## Открытые вопросы

Перечислены в [docs/architecture.md, §7](../architecture.md#7-открытые-вопросы-к-владельцу).

## Следующий шаг

Шаг 2: проекты (сетка, создание с базовыми источниками, переименование, удаление), страница проекта, источники, «Мои документы» с поиском и фильтром, загрузка документа в два этапа.
