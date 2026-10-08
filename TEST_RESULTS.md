# Результаты проверок

Последняя полная проверка: 08.10.2026, 06:16 UTC, Node 24.19, TypeScript, Vitest 4.1.11, local workerd/Miniflare D1 (не production Cloudflare).

| Проверка | Результат |
|---|---|
| `npm test` | 75 tests PASS, 6 files, exit0 |
| `npm run typecheck` | PASS, exit0 |
| `npm run build` | PASS, dry-run bundle 71.40 KiB / gzip18.90 KiB, exit0 |
| `git diff --check` | PASS |
| Secret scan tracked files | PASS, нет bot token или private CRM |
| Реальный Workspace RSS + pipeline | 50 inspected, 6 qualified/inserted, 44 rejected |
| Повторный запуск | 0 дополнительных вставок, данные SQLite сохранились |
| Реальный аудит stanislavweb.ru | state ok, подтверждённых проблем 0 по реализованным static checks |
| Реальный Overpass | 10 public business candidates, 0 verified website need, 0 личных контактов |
| Реальный Telegram API | getMe OK, owner private /start matched, test sendMessage OK message_id2 + 6 real pipeline уведомлений, всего7 |
| Production deploy | НЕ ВЫПОЛНЕН: Cloudflare secrets отсутствуют |
| Production webhook / следующий cron / CPU | НЕ ПОДТВЕРЖДЕНЫ |

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

Независимый агент review проверил код и нашёл 6 проблем: intake atomicity, inbound dedup, cleanup of owner copies, optout bypass, parser workload, HTTP quota. Все исправлены; regression tests подтверждают первые 4 и quota. Workload ограничен и измерен локально. Повторная независимая проверка не выполнялась; после исправлений полная suite75/typecheck/build прошла.
