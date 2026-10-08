# Реальное состояние на 08.10.2026

**Облачное ядро работает, первый настоящий cron подтверждён. Полная приёмка всего ТЗ не завершена: CPU превышает опубликованный Free лимит, тариф не подтверждён Billing API, дополнительные источники/браузерный аудит/исходящие не подключены.**

## Доступ

- GitHub: https://github.com/Stas5252/Ai-klient- . Публичный репозиторий содержит код, тестовые fixtures и агрегаты, без CRM/контактов/секретов.
- HTTP health: https://web-lead-machine.stas5252-leads-9fb8e2.workers.dev/health . Проверяет HTTP, не свежий сбор. Для программной проверки используйте User-Agent `WebLeadMachine/0.1`: Cloudflare может блокировать стандартный Python/Node UA кодом 1010.
- Управление: https://t.me/StanislawWeb_bot . Numeric whitelist владельца установлен, ID не публикуется.
- Панель: https://dash.cloudflare.com/9fb8e2fe6df89c2cf254b6d241a59f10/workers/services/view/web-lead-machine/production/settings . Требуется вход владельца.

## Подтверждено в production

- Cloudflare OAuth подтверждён владельцем; Worker и постоянная D1 `web-lead-machine` созданы, миграции применены. Секреты установлены через Cloudflare Secrets.
- Telegram getMe, setWebhook и setMyCommands успешны. `/api/telegram-status`: правильный URL webhook, pending=0, hasError=false.
- Облачный ручной поиск 06:39:34 UTC: 50 inspected, 6 qualified/inserted, 44 rejected, notifications=3, state=ok. Это 6 кандидатов на проверку, не согласившиеся клиенты. Бесплатность конкретного отклика неизвестна.
- **Настоящий Cron Trigger около 06:45 UTC**, `event.cron="*/15 * * * *"`, outcome=ok: inspected=0 (источник ещё не due), notifications=3. Фактический eventTimestamp в tail — 06:46:00 UTC. Запуск инициирован Cloudflare независимо от локальной команды.
- Production webhook-команды `/health`, `/pause`, `/resume` проверены явно синтетическими owner-only updates с уникальными ID. Последнее состояние paused=0/outboundStopped=0; посторонние люди не участвовали.
- Облачный повторный поиск + аудит 06:49:23 UTC: inspected=50, qualified=6, inserted=0, rejected=44, audits=1, state=ok. D1: 6 уникальных leads без дублей, sent=12, других состояний outbox нет. Эти сообщения — карточки, отчёт и owner-only проверки, не 12 разных лидов. Ещё 7 сообщений ранее доставлены владельцу из локальных проверок; всего 19 на момент этой проверки.
- Реальный облачный read-only audit собственного stanislavweb.ru прошёл: state=ok, problems=[]; audit_jobs.status=done. Только реализованные static checks, не обещание отсутствия любых проблем.
- Overpass локально вернул 10 реальных публичных бизнес-карточек малой области Москвы, 0 подтверждённых потребностей/отсутствия сайта; личные контакты не собирались. BUSINESS_BBOX в production не задан, регулярный поиск компаний выключен.
- Никаких сообщений третьим лицам, покупок, платных API/VPS/PRO или добавления карты.

## Что работает

Официальный Workspace RSS раз в час; cron раз в 15 минут; фильтрация/скоринг без минимального бюджета; D1 dedup; черновики; уведомления/команды/статусы; rule-based intake; durable inbox/outbox; backoff/квоты/leases; отчётность; ограниченный static audit; stop/delete; аварийное отключение.

Реальные заявки клиентов и реальные партнёры не обнаружены. Входящий опрос проверен интеграционными fixtures. Локализация персональных данных в D1 по 152-ФЗ не подтверждена, подробности SECURITY.md.

## Материальные ограничения

Workers Free CPU опубликован как 10 ms. В tail первый сбор использовал 72 ms, повтор со static audit — 38 ms, cron с отправками — 21 ms; все outcome=ok. Cloudflare допускает отдельные превышения, но может прекращать регулярные; устойчивость не доказана. Увеличение платного CPU не выполнялось.

OAuth `/subscriptions` даёт 403. Первичный bootstrap разрешён только по новому пустому аккаунту (<24h), пустым entitlements/scripts/databases. Это косвенное свидетельство бесплатной начальной настройки, не независимая проверка тарифа/счёта. Повторный guarded deploy требует Billing Read; оплаченные планы не создаются.

FL monitoring выключен по robots; Freelance/Weblancer/Habr API/RSS не подтверждены. Telegram-группы, Threads/VK/личный Telegram аккаунт не подключены. Исходящих transport нет, cold outreach — только черновики. Редактирование основного сайта не выполнялось.

Последние проверки: TEST_RESULTS.md. Не завершённые пункты: TASK_QUEUE.md и BUGS.md.
