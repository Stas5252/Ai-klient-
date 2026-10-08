# Результаты проверок

Последняя полная автоматическая проверка: 08.10.2026, 06:48 UTC, Node 24.19, TypeScript, Vitest 4.1.11, local workerd/Miniflare D1. Production проверки отдельно ниже.

| Проверка | Результат |
|---|---|
| `npm test` | 84 tests PASS, 8 files, exit0 |
| `npm run typecheck` | PASS, exit0 |
| `npm run build` | PASS, dry-run bundle 74.31 KiB / gzip19.50 KiB, exit0 |
| `git diff --check` | PASS |
| Secret scan tracked files | PASS, нет bot token или private CRM |
| Реальный Workspace RSS + pipeline | 50 inspected, 6 qualified/inserted, 44 rejected |
| Повторный запуск | 0 дополнительных вставок, данные SQLite сохранились |
| Реальный аудит stanislavweb.ru | state ok, подтверждённых проблем 0 по реализованным static checks |
| Реальный Overpass | 10 public business candidates, 0 verified website need, 0 личных контактов |
| Реальный Telegram API | getMe OK, owner private /start matched, test sendMessage OK message_id2 + 6 real pipeline уведомлений, всего7 |
| GitHub CI | SUCCESS, https://github.com/Stas5252/Ai-klient-/actions/runs/37740267083 для deployment-кода2a822f9 |
| Production deploy | Worker/D1 развёрнуты 06:36 UTC, миграции и Secrets установлены, health200 |
| Production Telegram | webhook URL правильный, pending0/errorfalse; owner-only /health/pause/resume200 |
| Production источник | 06:39 manual run:50/6/44; 06:49 повтор:50/6/44 inserted0 |
| Оригинальные ссылки кандидатов | 6из6 HTTP200; явных проверенных строк «Тендер закрыт» не найдено. Это не подтверждение бесплатного/открытого отклика |
| Production cron | Настоящий cron около06:45, eventTimestamp06:46:00, outcomeok/notifications3; второй около07:00, timestamp07:01:14, outcomeok,50/6/0inserted/44 |
| Production static audit | 06:49 stanislavweb.ru:done, stateok, problems0; сайт не изменялся |
| Production D1/outbox | leads6/uniqueURLs6; sent12, нет pending/failed/unknown на06:51 |
| Восстановление backup | Remote D1 SQL export59348bytes → in-memory SQLite; leads6, uniqueURLs6, uniqueContentKeys6. Backup только private/, chmod600, не git |
| Production CPU | 72ms first collection,38ms repeat+audit,21ms cron+send,36ms scheduled collection. Все outcomeok, но выше Free10ms; риск не закрыт |
| Billing API | OAuth /subscriptions403, entitlements[]. Нет authoritative Free проверки; bootstrap нового пустого аккаунта, покупок0 |
| Production usage/error snapshot07:02 | error events0, externalHTTP27/200, D1size208896bytes, sourceinspected150повторных просмотров/6новых вставок |

Агрегированные доказательства в research/*.json; сырые leads/briefings/SQLite — private/, не git. Во время проверки точности первоначальные 11 кандидатов были пересмотрены: 5 маркетинговых/неверно квалифицированных записей исключены. Финальные числа 6/44/0 partners.

## Сценарии из ТЗ

| № | Сценарий | Проверка |
|---|---|---|
| 1–2 | Новый/старый заказ | pipeline: fresh urgent / rejects old; live RSS |
| 3 | Одна публикация в двух источниках | content hash и D1 unique, parallel/repeated inserts |
| 4 | Автор рекламирует услуги | rejects seller |
| 5–7 | Без бюджета, 3000, 50000 | retained, exact/range bounds без минимального порога |
| 8 | Закрытый заказ | rejects closed, fixtures |
| 9 | Ссылка недоступна | audit HTTP/network uncertain, fixtures; реальные найденные ссылки не проверены на возможность отклика |
| 10 | Компания без сайта | missing directory/map field остаётся unverified; отсутствие сайта не доказано |
| 11–12 | Не открывается/временный сбой | bounded GET + uncertainty; статуса вечной недоступности не придумываем |
| 13 | У компании другой сайт | verifyNoWebsite active evidence overrides absence hypothesis |
| 14 | Партнёр | explicit recurring cooperation fixture; real partners0 |
| 15–17 | Неверный адресат, запрет отправки, optout | permission gates; /stop blocks all customer delivery, /delete_me clears stored copies |
| 18 | Telegram недоступен | unknown no retry; confirmed429 rescheduled |
| 19 | D1 недоступен | webhook returns sanitized503; intake/session+outbox atomic rollback/retry |
| 20 | Restart | expiring leases, repeated-run dedup, persistent outbox keys |
| 21 | Free quota | every HTTP attempt charged, max0 skips network, exhausted quota stops next GET |
| 22 | Подозрительная инструкция | untrusted content flag, draft blocked, no shell/model execution |
| 23 | Неавторизованный admin | /pause cannot change settings, secret webhook/API required |
| 24 | Уведомление | real owner test message2 + tests delivery state |
| 25 | Входящая в CRM | 7-question integration, distinct users identical briefs stay separate, transactional flow |

## Проверка ресурсов

Независимый review выявил полный XML parse 228 KiB /1800 items ~36.95 ms localCPU. После bounded extraction benchmark 217 KiB /1800 items ~0.53 ms local time в прогретом процессе. Это диагностическая оптимизация, **не подтверждение Workers Free cron CPU10ms**.

## Проверка кода

Независимый агент review проверил код и нашёл 6 проблем: intake atomicity, inbound dedup, cleanup of owner copies, optout bypass, parser workload, HTTP quota. Все исправлены; regression tests подтверждают первые 4 и quota. Workload ограничен и измерен локально. Дополнительный независимый review deployment-policy и защищённых Telegram connect/status endpoints: новых critical/important замечаний нет; bootstrap нельзя выдавать за подтверждение billing. Полная suite84/typecheck/build прошла.
