# Развёртывание и восстановление

## Необходимые действия владельца

1. В Cloudflare создайте/используйте account на **Workers Free**, D1 Free. Карту и платный тариф не подключать. Account ID виден в панели Workers/D1.
2. Создайте API token с Workers Scripts Edit, D1 Edit, Account Settings Read (если требуется CLI), **Account Billing Read для /subscriptions**; scope — только нужный account. Секретный токен в защищённые secrets рабочего окружения: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.
3. Telegram @BotFather `/newbot`. Токен, отправленный в чат 08.10.2026, следует заменить через `/revoke` перед постоянной эксплуатацией. Новый token — в secret `TELEGRAM_BOT_TOKEN`, никогда не в чат/репозиторий.
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

Скрипт сначала проверяет все обязательные поля и account billing через официальный API. Если доступ к billing не предоставлен или обнаружен платный/неизвестный Workers plan — fail closed, ничего не покупает. Создаёт только D1 database при необходимости, записывает её UUID в wrangler.jsonc, применяет миграции, загружает secrets bulk через stdin, deploy, setWebhook secret, setMyCommands и GET /health. **Не считать проект готовым только по успешному deploy.**

BUSINESS_BBOX (одна маленькая область) и TELEGRAM_GROUP_IDS опциональны. Добавляйте через vars/private конфигурацию. OpenStreetMap не охватывает все компании РФ и не подтверждает отсутствие сайта. Для groups бот должен быть добавлен и использование разрешено администратором. Отключение источника — `enabled:false` + redeploy; состояние/пауза живут в D1.

## Обязательная приёмка после deploy

- Проверьте getWebhookInfo: URL, pending count, ошибки.
- Напишите `/health` и `/new` своим аккаунтом; получите настоящее owner-only уведомление.
- Проверьте D1: source_state.last_checked и lead rows, уникальные URL/content_key.
- Дождитесь **следующего** cron через 15 минут; `npx wrangler tail` показывает `scheduled_run`, а `/health` — более новый timestamp. Закройте локальную сессию и повторите проверку позже. Без этого автономность не доказана.
- В Cloudflare logs проверьте CPU для cron/HTTP: Free лимит **10 ms**. При exceededCpu нельзя переходить на paid автоматически; разделить тяжёлую работу.
- Проверьте D1 read/write/storage quotas в dashboard. Карта/платные планы не нужны.

## Экспорт и восстановление

`GET WORKER_URL/api/export` с header `Authorization: Bearer ADMIN_API_KEY` возвращает до 100 leads и `nextCursor`. Повторите с `?cursor=...`. Храните экспорт только локально/в приватном шифрованном хранилище, удаляйте по retention.

Миграции проверяются на local D1. Перед изменением production схемы экспортируйте D1 средствами панели/CLI (`wrangler d1 export web-lead-machine --remote --output <закрытый путь>`); никогда не git add backup. Time Travel срок зависит от Free, сверить dashboard, не обещать длинную историю бесплатно. Автоматический удалённый backup не настроен.

После временных сетевых сбоев backoff/leases восстанавливают запуск. Unknown Telegram sends проверяются вручную; не replay без проверки чата. Критические ошибки группируются в owner notifications, но при отказе Telegram уведомление тоже невозможно — нужен просмотр Cloudflare metrics.

## Обновление и остановка

`/pause` — остановить поиск, бот продолжает отвечать. `/shutdown` — остановить поиск и все отправки. `/restart` — включить снова. Для полного удаления остановите cron/Worker в Cloudflare и удалите webhook. Отозвать bot token — BotFather revoke; Cloudflare token — панель API tokens.

Обновление: git pull → npm ci → tests/typecheck/build → при необходимости migration → guarded deploy. Откат: Cloudflare deployments rollback к проверенной версии, учитывая обратную совместимость миграций. Секреты в резервную копию конфигурации не входят.
