# Бесплатные лимиты и стоимость

Обновление 09.10.2026 (ещё не production): общий HTTP лимит 1000/сутки, до 2000 при ручной настройке. Сбор прекращается на 90% общего лимита, остаток доступен только Telegram. После подключения обеих соцсетей основной запрос каждые 15 минут, остальные 7 раз в час: примерно 720 source HTTP/сутки вместе с двумя FL GET на каждом тике. Повторы, аудит и сообщения также учитываются. Без токенов соцсети не расходуют HTTP. Ни платный план, ни повышение CPU не подключались.

Ниже исторические лимиты и измерения первого deployment 08.10.2026.

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

**Существенный подтверждённый риск:** production первый сбор72ms, повторный сбор+аудит38ms, cron с3 отправками21ms CPU, все outcomeok. Это выше Free10ms. Документация Cloudflare допускает отдельные превышения, но регулярные может прекращать. Парсер ограничивает60 элементов; локальный benchmark1800items/217KiB~0.53ms не измеряет весь job. Нужно профилирование и разделение на небольшие job либо тяжёлый этап в бесплатном Actions (с постоянной D1 и отдельными secrets, пока нет прав добавлять их). Платное увеличение CPU не выполнялось. Долговременная устойчивость не подтверждена.

Второй настоящий cron около07:00UTC со сбором50публикаций использовал36msCPU/outcomeok. Снимок07:02UTC: HTTP27/200дневного собственного лимита, D1size208896bytes. Малый объём БД не снимает проблему CPU.

Deploy guard читает account subscriptions и отклоняет обнаруженную платную/неизвестную Workers subscription. При недоступном billing разрешён только первичный bootstrap нового (<24h) пустого аккаунта с entitlements/scripts/databases=[]; существующий аккаунт отклоняется. Именно этим bootstrap выполнен deploy08.10.2026. OAuth /subscriptions403: тариф/счёт через Billing API не подтверждены независимо. Скрипт не создаёт subscriptions, не привязывает карту и не повышает платные лимиты. Доступ к /subscriptions требует Account Billing Read. На Free превышение квот вызывает ошибку, абсолютная24/7 доступность не обещается.
