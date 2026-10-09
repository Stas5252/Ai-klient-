# Развёртывание и восстановление

## Вход без передачи API-токена

Wrangler 4.148 поддерживает `npx wrangler login --device --scopes account:read user:read workers_scripts:write workers_tail:read d1:write`. Команда выдаёт одноразовую ссылку Cloudflare; владелец подтверждает доступ в браузере, секреты в чат не передаются. У нас этот вход подтверждён 08.10.2026. OAuth не даёт Billing Read: для первичного развёртывания проверен новый пустой аккаунт (<24h), пустые entitlements, scripts и databases. Это узкая bootstrap-проверка, **не независимое подтверждение тарифа через billing**. Для существующих аккаунтов deploy guard отказывает. Повторный guard deploy требует Billing Read через scoped API token, без отключения защиты.

## Необходимые действия владельца

1. В Cloudflare создайте/используйте account на **Workers Free**, D1 Free. Карту и платный тариф не подключать. Account ID виден в панели Workers/D1.
2. Создайте API token с Workers Scripts Edit, D1 Edit, Account Settings Read (если требуется CLI), **Account Billing Read для /subscriptions**; scope — только нужный account. Секретный токен в защищённые secrets рабочего окружения: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.
3. Telegram @BotFather `/newbot`. Token — в Cloudflare Secret `TELEGRAM_BOT_TOKEN`, никогда не в репозиторий. Существующий бот подключён; новый не нужен.
4. Откройте бота своим аккаунтом и `/start`. Сохраните numeric `ADMIN_IDS` и `ADMIN_CHAT_ID` в секретах; usernames недостаточно для авторизации. Текущий владелец был проверен через getUpdates и @Butov52, ID не публикуется.
5. Создайте 3 случайных секрета ≥24 символов: `TELEGRAM_WEBHOOK_SECRET`, `ADMIN_API_KEY`, `SUPPRESSION_SALT`. Можно локально `openssl rand -hex 32`, затем в закрытые secrets; не в issue или README.

## Запуск

```sh
npm ci
npm test
npm run typecheck
npm run build
npm run deploy
```

Для deploy secrets должны быть **переменными процесса**; `.dev.vars` Wrangler используется для локального Worker, deployment script её автоматически не импортирует. Это специально исключает случайную загрузку токена из файла. Рабочий runtime может быть выдан секретами через настройки окружения.

Скрипт сначала проверяет все обязательные поля и account billing через официальный API. При закрытом billing допускается только новый пустой аккаунт по указанным выше признакам; иначе fail closed. Платный/неизвестный обнаруженный Workers plan отклоняется. Скрипт ничего не покупает: создаёт D1 database при необходимости, записывает UUID в wrangler.jsonc, применяет миграции, deploy, загружает secrets bulk через stdin, setWebhook secret, setMyCommands и GET /health. **Не считать проект готовым только по успешному deploy.**

BUSINESS_BBOX (одна маленькая область) опционален. Сбор Telegram-групп в обновлении выключен, TELEGRAM_GROUP_IDS не включает его. Добавляйте через vars/private конфигурацию. OpenStreetMap не охватывает все компании РФ и не подтверждает отсутствие сайта. Для groups бот должен быть добавлен и использование разрешено администратором. Отключение источника — `enabled:false` + redeploy; состояние/пауза живут в D1.

## Обязательная приёмка после deploy

- Проверьте getWebhookInfo: URL, pending count, ошибки.
- Напишите `/health` и `/new` своим аккаунтом; получите настоящее owner-only уведомление.
- Проверьте D1: source_state.last_checked и lead rows, уникальные URL/content_key.
- Дождитесь **следующего** cron через 15 минут; `npx wrangler tail` показывает `scheduled_run`, а `/health` — более новый timestamp. Закройте локальную сессию и повторите проверку позже. Без этого автономность не доказана.
- В Cloudflare logs проверьте CPU для cron/HTTP: Free лимит **10 ms**. При exceededCpu нельзя переходить на paid автоматически; разделить тяжёлую работу.
- Проверьте D1 read/write/storage quotas в dashboard. Карта/платные планы не нужны.

## Экспорт и восстановление

`GET WORKER_URL/api/export` с header `Authorization: Bearer ADMIN_API_KEY` возвращает до 100 leads и `nextCursor`. Повторите с `?cursor=...`. Храните экспорт только локально/в приватном шифрованном хранилище, удаляйте по retention.

Миграции проверяются на local D1. Перед изменением production схемы экспортируйте D1 средствами панели/CLI (`wrangler d1 export web-lead-machine --remote --output <закрытый путь>`); никогда не git add backup. CLI может вывести временную подписанную download-ссылку: сохраняйте его stdout только в закрытый файл, не в публичный CI log. Экспорт кратковременно блокирует D1, выполняйте вне scheduled job. 08.10.2026 создан частный SQL backup, восстановление в локальную in-memory SQLite подтвердило6уникальных leads. Time Travel срок зависит от Free, сверить dashboard, не обещать длинную историю бесплатно. Автоматический удалённый backup не настроен.

После временных сетевых сбоев backoff/leases восстанавливают запуск. Unknown Telegram sends проверяются вручную; не replay без проверки чата. Критические ошибки группируются в owner notifications, но при отказе Telegram уведомление тоже невозможно — нужен просмотр Cloudflare metrics.

## Обновление и остановка

`/pause` — остановить поиск, бот продолжает отвечать. `/shutdown` — остановить поиск и все отправки. `/restart` — включить снова. Для полного удаления остановите cron/Worker в Cloudflare и удалите webhook. Отозвать bot token — BotFather revoke; Cloudflare token — панель API tokens.

Обновление: git pull → npm ci → tests/typecheck/build → при необходимости migration → guarded deploy. Откат: Cloudflare deployments rollback к проверенной версии, учитывая обратную совместимость миграций. Секреты в резервную копию конфигурации не входят.

## Подключение Telegram без раскрытия токена исполнителю

Сохранить `TELEGRAM_BOT_TOKEN` прямо в Variables and Secrets → Secret на странице Worker. Затем исполнитель вызывает защищённый `POST /api/connect-telegram`: Worker сам вызывает getMe/setWebhook/setMyCommands. `GET /api/telegram-status` возвращает только URL/pending/error flag, без токена. Текущий токен оставлен по прямому указанию владельца; в git/logs его нет.

## Новые подключения (код пока не опубликован)

Threads: Meta App Review для threads_keyword_search/threads_basic, затем безопасный read-only preflight чужого публичного поста. Только после этого THREADS_PUBLIC_SEARCH_VERIFIED=1. Токен THREADS_ACCESS_TOKEN — Secret в Worker. VK_ACCESS_TOKEN аналогично; доступ newsfeed.search должен пройти реальную проверку. Секреты не в чат и не в git. /connect показывает инструкции, /sources отличает ожидание допуска от успешной загрузки. Подробности research/SOCIAL_SOURCE_RESEARCH.md.

Один ключевой запрос каждого провайдера планируется раз в 15 минут, остальные раз в час. FRESH_WINDOW_MINUTES=60. Общий HTTP лимит 1000, 10% оставлено Telegram. Изменения ещё требуют guarded deploy, настоящего уведомления и нового автономного cron.
