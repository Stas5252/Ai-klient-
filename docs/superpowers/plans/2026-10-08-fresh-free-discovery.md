# План исполнения

1. Исследовать реальные endpoints/правила/бесплатные ответы/оригинальные даты. Исследования отдельно для бирж и соцсетей, без shared production edits.
2. RED тесты freshness/free-gates и нескольких независимых sources. Реализовать src/freshness.ts, Source/RawItem/Env расширения, getText bounded custom limit.
3. FL collector+tests (отдельные файлы), official Threads/VK collectors+tests (отдельные файлы). Default source registry только с проверенным бесплатным маршрутом; missing auth явно auth_required.
4. Scheduler: убрать limit одного источника, freshness gate до вставки/уведомления, pending age recheck, приоритет новых публикаций. Сохранить dedup/backoff/quotas/inbox atomicity.
5. Telegram: /fresh,/new,/best; /archive; /search быстрые оригинальные площадки; /connect текущие доступы/инструкции. Показать возраст и бесплатность; stale outbox не отправлять как новый заказ.
6. Полная suite/typecheck/build, независимый review, реальные load (0 валидных считать0), защищённый production smoke владельцу, actual scheduled run, push/CI, актуальные docs/evidence.
