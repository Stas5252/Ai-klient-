# Web Lead Machine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Исполнение в текущей сессии согласно прямому указанию пользователя работать автономно.

**Goal:** проверяемая бесплатная система поиска веб-заказов с CRM и Telegram.
**Architecture:** Worker cron/webhook, D1 persistent state, modular pure qualification pipeline.
**Tech Stack:** TypeScript, Cloudflare Workers/D1, Telegram Bot API, Vitest.
**Spec:** docs/superpowers/specs/2026-10-08-web-lead-machine-design.md

## Global Constraints
0 ₽ обязательных новых расходов; нет порога бюджета; нет холодной автопосылки; источник считается подключённым только после реального сбора; основной сайт не изменяется; секреты и CRM не в git.

## Review Focus
- Неверная личность в callback: проверяется numeric owner ID, а не username.
- Публикация без даты: требует ручной проверки, не срочная автоматически.
- Отправка с неизвестным итогом: no auto retry, видимый unknown state.
- Перезапуск после падения: lease expires, уникальная запись остаётся одна.
- Аудит внутренних адресов/redirect: блокируется до запроса.

### Task 1: Источники и квалификация
Create src/{types,source_registry,collectors,normalizer,validator,deduplicator,lead_scoring,message_builder}.ts; tests/pipeline.test.ts.
Interfaces: RawItem → qualify(RawItem, Source, now): Lead|null; collect(Source): Promise<RawItem[]>.
- [ ] Написать тесты свежего/старого/закрытого заказа, разработчика, 3000/50000/unknown budget, partnership, injection, dedup. Запустить RED.
- [ ] Реализовать типы и pure pipeline, RSS parse. Запустить GREEN и typecheck; commit.

### Task 2: Хранилище и коммуникация
Create migrations/0001.sql, src/{storage,crm,outreach_queue,telegram_bot,inbound_manager}.ts; tests/integration.test.ts.
Interfaces: Store(D1Database); insertLead(Lead): boolean; webhook(update): Promise<void>; allowedOutreach(Lead,permission): boolean.
- [ ] Написать D1/Telegram tests: дубликаты, opt-out, unauthorized admin, intake to CRM, recipient guard; RED.
- [ ] Реализовать persistent inbox/outbox, whitelist, commands, buttons, intake; GREEN.

### Task 3: Аудит и scheduler
Create src/{website_auditor,scheduler,analytics,monitoring,index}.ts.
Interfaces: audit(url): AuditResult; run(env,now): Promise<RunSummary>; Worker fetch/scheduled.
- [ ] Написать tests robots, SSRF, GET retry, network uncertainty, quota, recovery; RED.
- [ ] Реализовать bounded audit, leases, retries, monitoring, retention; GREEN.

### Task 4: Реальные проверки и выпуск
Create scripts/{live-check.ts,deploy.mjs,health.mjs}, CI, README и обязательные документы.
- [ ] npm test; npm run typecheck; npm run build; npm run live. Документировать exact counters.
- [ ] Separate private repo push, free-plan guard, D1 migration, secrets, deploy.
- [ ] getMe, owner start/test, webhook health, scheduled next-run logs. Доступы обязательны; отсутствие зафиксировать, не выдумывать запуск.
