# Бесплатные лимиты и стоимость

Проверено 08.10.2026 по официальным страницам:

- Workers Free: 100 000 incoming requests/day, CPU 10 ms на HTTP **и cron**, 50 external subrequests/invocation, internal services отдельно до 1000, 5 cron triggers/account.
- D1 Free: 5 000 000 rows read/day, 100 000 rows written/day, 5 GB total/account; одна база Free до 500 MB.
- Cron данного проекта: 96 тиков/сутки; Workspace раз в час ≈24 job/day; каждый source job robots GET + RSS GET с максимум 1 повтором RSS. API квот источника не опубликован, это не право на неограниченный обход.
- `MAX_SOURCE_REQUESTS_DAY=200` — общий лимит физических исходящих HTTP attempts (историческое название переменной). Каждый robots/RSS/retry/DNS/audit/business/Telegram attempt списывается атомарно. D1 операции не относятся к этому счётчику.
- Аудит: максимум 8 jobs/day, один за тик, DNS A/AAAA + robots + page, без обхода всего сайта. Overpass: до 10 компаний/день в одной области, только если BUSINESS_BBOX задан.
- Уведомления: до 3 за тик, ответ Telegram 429 учитывается. Быстрый ответ каждому клиенту не гарантируется при длинной очереди.
- GitHub public standard Linux CI бесплатно по текущим правилам, политика проверяется отдельно для self-hosted/large runners/private repo. Нет запланированного Actions-сбора и нет платных runners.
- Telegram Bot API — без платы за обычные используемые вызовы. Paid broadcast API не используется.

Источники: https://developers.cloudflare.com/workers/platform/limits/ ; https://developers.cloudflare.com/workers/platform/pricing/ ; https://developers.cloudflare.com/d1/platform/pricing/ ; https://developers.cloudflare.com/d1/platform/limits/ ; https://core.telegram.org/bots/faq

**Существенный риск:** RSS 200 KiB + квалификация могут превысить 10 ms CPU. Парсер ограничивает извлечение 60 элементов до дорогой обработки; локальный benchmark 1800 items / 217 KiB после оптимизации ~0.53 ms, но это не полный production cron. Нужно подтвердить реальный CPU по production logs и при необходимости разделить сбор/квалификацию на небольшие job или вынести тяжёлый этап в бесплатный Actions (с постоянной D1). Платное увеличение CPU запрещено без отдельного согласия. Локальная успешная сборка не подтверждает free-tier runtime.

Deploy guard читает account subscriptions, отклоняет платную/неизвестную Workers subscription и прекращает при невозможности проверки. Не создаёт subscriptions, не привязывает карту. Существующие несвязанные платные сервисы пользователя не изменяет. Доступ к /subscriptions требует Account Billing Read. Проверка доступов не равнозначна покупке. На Free превышение квот вызывает ошибку; абсолютная 24/7 доступность не обещается.
