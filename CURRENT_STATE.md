# Реальное состояние на 09.10.2026

## Обновление 09.10.2026: подготовлено, не опубликовано

147 автоматических тестов, TypeScript и dry-run build прошли. Новая версия принимает внешние заказы только с исходной датой до 60 минут и подтверждённым бесплатным откликом. Старые Workspace-кандидаты остаются архивом. `/new`, `/best` и очередь отправки учитывают свежесть; `/archive` помечен отдельно.

FL: публичная первая страница раз в 15 минут, только собственный бейдж «Для всех». Реальная загрузка 09.10.2026 13:16 UTC успешна; подходящих бесплатных карточек и новых лидов 0. Счётчик inspected показывает выход сборщика, а не все прочитанные HTML-карточки.

Threads/VK: по 8 настроенных запросов; основной раз в 15 минут, остальные раз в час. Без допусков 0 API-запросов. Threads требует approved permission и реальный тест чужого публичного поста до THREADS_PUBLIC_SEARCH_VERIFIED=1. Социальные источники не подключены. После допуска примерно 720 исходящих source HTTP/сутки; общий лимит 1000, последние 100 зарезервированы Telegram.

Бот: меню, бюджет в CRM, отмена брифа и отложенных вопросов, защита от пустого ответа, `/start <канал>`, подходящие реальные кейсы, ручной поиск и инструкции API. Чужой контент из Telegram-групп не собирается.

Два настоящих тестовых owner-only сообщения из обновлённого локального кода подтверждены Telegram API; повторный запуск отправил 0. Новых клиентов 0, третьим лицам 0. Доказательства: research/fresh-live-results.json. Локальная постоянная SQLite проверена; это не новый облачный cron.

Повторный облачный deploy блокирует guard: OAuth не читает billing, subscriptions HTTP 403. Платные планы/карта не добавлялись. Новая версия в production и её CPU пока не проверены. Сайт только аудирован: WEBSITE_LEAD_AUDIT.md.



Production 09.10.2026 13:23 UTC: D1 source_state Workspace отключён, 7 его старых записей со статусом new перенесены в archived (не удалены). `/api/health` HTTP 200: последний автономный тик 13:15:59 UTC, state ok, paused=0. Telegram webhook правильный, pending=0, hasError=false. Это прежний Worker; новые функции не опубликованы. Агрегат research/production-current-health.json.

## Исторический отчёт production 08.10.2026

Ниже сохранены результаты ранее опубликованной версии.

**Облачное ядро работает, первый настоящий cron подтверждён. Полная приёмка всего ТЗ не завершена: CPU превышает опубликованный Free лимит, тариф не подтверждён Billing API, дополнительные источники/браузерный аудит/исходящие не подключены.**

## Доступ

- GitHub: https://github.com/Stas5252/Ai-klient- . Публичный репозиторий содержит код, тестовые fixtures и агрегаты, без CRM/контактов/секретов.
- GitHub CI для deployment-кода2a822f9: SUCCESS, https://github.com/Stas5252/Ai-klient-/actions/runs/37740267083 .
- HTTP health: https://web-lead-machine.stas5252-leads-9fb8e2.workers.dev/health . Проверяет HTTP, не свежий сбор. Для программной проверки используйте User-Agent `WebLeadMachine/0.1`: Cloudflare может блокировать стандартный Python/Node UA кодом 1010.
- Управление: https://t.me/StanislawWeb_bot . Numeric whitelist владельца установлен, ID не публикуется.
- Панель: https://dash.cloudflare.com/9fb8e2fe6df89c2cf254b6d241a59f10/workers/services/view/web-lead-machine/production/settings . Требуется вход владельца.

## Подтверждено в production

- Cloudflare OAuth подтверждён владельцем; Worker и постоянная D1 `web-lead-machine` созданы, миграции применены. Секреты установлены через Cloudflare Secrets.
- Telegram getMe, setWebhook и setMyCommands успешны. `/api/telegram-status`: правильный URL webhook, pending=0, hasError=false.
- Облачный ручной поиск 06:39:34 UTC: 50 inspected, 6 qualified/inserted, 44 rejected, notifications=3, state=ok. Это 6 кандидатов на проверку, не согласившиеся клиенты. Бесплатность конкретного отклика неизвестна.
- **Настоящий Cron Trigger около 06:45 UTC**, `event.cron="*/15 * * * *"`, outcome=ok: inspected=0 (источник ещё не due), notifications=3. Фактический eventTimestamp в tail — 06:46:00 UTC. Запуск инициирован Cloudflare независимо от локальной команды.
- **Второй настоящий cron около07:00UTC**: scheduledTime07:00:59, tail eventTimestamp07:01:14, outcomeok, inspected50/qualified6/inserted0/rejected44. Для этой приёмки source.next_run заранее сделан due; загрузка выполнена именно автономным Cloudflare event, не `/api/run`. Дальнейшая source.next_run08:00:59UTC, cron остаётся15мин. Общий inspected150 включает три просмотра той же выборки50, новых leads всего6.
- Production webhook-команды `/health`, `/pause`, `/resume` проверены явно синтетическими owner-only updates с уникальными ID. Последнее состояние paused=0/outboundStopped=0; посторонние люди не участвовали.
- Облачный повторный поиск + аудит 06:49:23 UTC: inspected=50, qualified=6, inserted=0, rejected=44, audits=1, state=ok. D1: 6 уникальных leads без дублей, sent=12, других состояний outbox нет. Эти сообщения — карточки, отчёт и owner-only проверки, не 12 разных лидов. Ещё 7 сообщений ранее доставлены владельцу из локальных проверок; всего 19 на момент этой проверки.
- Реальный облачный read-only audit собственного stanislavweb.ru прошёл: state=ok, problems=[]; audit_jobs.status=done. Только реализованные static checks, не обещание отсутствия любых проблем.
- Overpass локально вернул 10 реальных публичных бизнес-карточек малой области Москвы, 0 подтверждённых потребностей/отсутствия сайта; личные контакты не собирались. BUSINESS_BBOX в production не задан, регулярный поиск компаний выключен.
- Никаких сообщений третьим лицам, покупок, платных API/VPS/PRO или добавления карты.

## Что работает

Официальный Workspace RSS раз в час; cron раз в 15 минут; фильтрация/скоринг без минимального бюджета; D1 dedup; черновики; уведомления/команды/статусы; rule-based intake; durable inbox/outbox; backoff/квоты/leases; отчётность; ограниченный static audit; stop/delete; аварийное отключение.

Реальные заявки клиентов и реальные партнёры не обнаружены. Входящий опрос проверен интеграционными fixtures. Локализация персональных данных в D1 по 152-ФЗ не подтверждена, подробности SECURITY.md.

## Материальные ограничения

Workers Free CPU опубликован как 10 ms. В tail первый сбор использовал 72 ms, повтор со static audit — 38 ms, cron с отправками — 21 ms, второй cron со сбором — 36ms; все outcome=ok. Cloudflare допускает отдельные превышения, но может прекращать регулярные; устойчивость не доказана. Увеличение платного CPU не выполнялось. На07:02UTC: error events0, общий HTTP budget27/200, D1 размер208896bytes.

OAuth `/subscriptions` даёт 403. Первичный bootstrap разрешён только по новому пустому аккаунту (<24h), пустым entitlements/scripts/databases. Это косвенное свидетельство бесплатной начальной настройки, не независимая проверка тарифа/счёта. Повторный guarded deploy требует Billing Read; оплаченные планы не создаются.

FL monitoring выключен по robots; Freelance/Weblancer/Habr API/RSS не подтверждены. Telegram-группы, Threads/VK/личный Telegram аккаунт не подключены. Исходящих transport нет, cold outreach — только черновики. Редактирование основного сайта не выполнялось.

Последние проверки: TEST_RESULTS.md. Не завершённые пункты: TASK_QUEUE.md и BUGS.md.
