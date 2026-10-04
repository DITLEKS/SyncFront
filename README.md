# SyncFront

Веб-клиент **SyncScribe** для бэкенда [SyncBack](https://github.com/DITLEKS/SyncBack) (FastAPI).
Архитектура и решения — в [docs/architecture.md](docs/architecture.md), отчёты по шагам — в [docs/reports](docs/reports).

## Стек

React 18 + TypeScript (strict), Vite 5, React Router v6 (data router), TanStack Query v5, Zustand (локальное состояние редактора),
Tailwind CSS 3.4 + shadcn/ui (Radix), lucide-react, react-hook-form + zod, openapi-typescript + openapi-fetch, Vitest + React Testing Library + MSW,
ESLint (typescript-eslint strict, eslint-plugin-boundaries) + Prettier.

## Запуск

Нужны Node ≥ 20 и запущенный бэкенд (`docker compose up --build` в репозитории SyncBack, API на `http://localhost:8000`).

```bash
cp .env.example .env
npm install
npm run dev          # http://localhost:5173, /api проксируется на бэкенд
```

Пользователь создаётся через экран регистрации (`POST /auth/register`, роль `user`). С `LLM_PROVIDER=stub` на бэкенде анализ завершается быстро и даёт тестовые правки.

## Скрипты

| Команда                           | Что делает                                                                                                   |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `npm run dev`                     | dev-сервер Vite с прокси `/api → VITE_DEV_PROXY_TARGET`                                                      |
| `npm run build`                   | `tsc -b` + сборка в `dist/`                                                                                  |
| `npm run typecheck`               | проверка типов без сборки                                                                                    |
| `npm run lint`                    | ESLint (ошибкой считаются и предупреждения)                                                                  |
| `npm run test` / `test:watch`     | Vitest (jsdom, MSW)                                                                                          |
| `npm run format` / `format:check` | Prettier                                                                                                     |
| `npm run api:types`               | перегенерировать `src/api/openapi.d.ts` из `OPENAPI_URL` (по умолчанию `http://localhost:8000/openapi.json`) |

`src/api/openapi.d.ts` закоммичен, чтобы `typecheck` работал без запущенного бэкенда. После изменения контракта на бэкенде — перегенерировать и закоммитить.

## Переменные окружения

| Переменная              | Назначение                                                                                                                                                                                            |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_API_BASE_URL`     | Базовый URL API для прод-сборки (например `https://api.syncscribe.example`). В dev пустой: работает прокси. Если фронт ходит на API напрямую, его origin должен быть в `CORS_ALLOWED_ORIGINS` бэкенда |
| `VITE_DEV_PROXY_TARGET` | Куда Vite проксирует `/api` в dev (по умолчанию `http://localhost:8000`)                                                                                                                              |
| `OPENAPI_URL`           | Источник OpenAPI для `npm run api:types`                                                                                                                                                              |

## Структура

```
src/
  app/            провайдеры, роутер, layout, ErrorBoundary
  pages/          тонкие страницы
  features/       фичи-bounded contexts (auth, system, …); снаружи доступен только index.ts
  domain/         чистый TS: статусная модель, политики, проекция правок и буфер ревью
  api/            сгенерированные типы, клиент с auth-middleware, функции по ресурсам, queryKeys
  components/ui/  примитивы shadcn/ui
  lib/            cn, errors, format, sseParser, storage
  test/           setup, MSW-хендлеры, renderWithApp
```

Правила зависимостей между слоями проверяет ESLint (`eslint-plugin-boundaries`), подробности — в [docs/architecture.md](docs/architecture.md#3-структура-и-правила-зависимостей).

## Компромиссы и решения

- **Хранение токенов.** Access-токен живёт только в памяти, refresh — в `localStorage`: бэкенд не ставит httpOnly cookie. Refresh ротируется сервером, поэтому обновление выполняется строго в одном экземпляре (single-flight) с очередью ожидающих запросов; новая пара сохраняется атомарно. Access обновляется заранее (за 60 с до истечения) и реактивно на 401 (один повтор запроса). Неудачный refresh очищает сессию и ведёт на `/login?returnTo=…`.
- **Клиентский «Чистовик».** Сервер не меняет текст документа при принятии правок; режимы «Правки» и «Чистовик» вычисляются на клиенте по тем же правилам, что и экспортёры сервера (первое вхождение `original_text` во всём тексте; `add` — в конец документа). Подробно — [docs/architecture.md, §1.3](docs/architecture.md#13-как-сервер-применяет-правки-при-экспорте-определяет-чистовик).
- **`export_format` не передаётся.** Сервер принимает `md | docx | txt`, а формат документа называется `markdown`; без параметра экспорт идёт в исходном формате.
- **Лимиты и форматы загрузки** берутся из `GET /system/capabilities`, а не из констант (`.doc` не поддерживается, лимит 50 МБ по умолчанию).

## План работ

1. **Каркас** — Vite, роутер, auth с refresh-очередью, типы из OpenAPI, прокси, экраны входа и регистрации. ✅ ([отчёт](docs/reports/01-scaffold.md))
2. **Проекты** и страница проекта, источники, «Мои документы», загрузка документа в 2 этапа, групповой анализ. ✅ ([отчёт](docs/reports/02-projects-documents.md), [оформление проекта](docs/reports/02b-project-appearance.md))
3. **Дашборд**, SSE-провайдер, запуск/отмена анализа, индикаторы и ошибки анализа. ✅ ([отчёт](docs/reports/03-dashboard-sse.md))
4. **Редактор**: режимы, карточки правок, буфер решений, сохранение с `If-Match`, конфликт версий, завершение, экспорт, сброс. ✅ ([отчёт](docs/reports/04-editor.md))
5. Полировка: анимации, пустые состояния, тесты, README.
