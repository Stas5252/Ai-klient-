# Social source research — 2026-10-08

No social buyer request was verified in this investigation. This is API and access-policy research, not evidence that the project already receives Threads, VK or Instagram orders. No account sessions, secrets, private content or paid tools were used. No messages were sent. No contact list was collected.

## Practical availability

| Source | Can operate at 0 ₽? | State today | What must happen first |
|---|---|---|---|
| Telegram buyer-submitted bot requests | Yes, ordinary Bot API use, within free limits | Existing project intake can be used after its connection is independently checked | Buyer starts the bot and directly submits their own request with explicit, informed and revocable consent |
| Telegram channel/group updates | Bot API itself is free | Permission and consent required; not a general public-channel discovery API | Admin adds the bot; processing still needs the applicable authors' consent and must comply with Telegram terms |
| Public `t.me/s` polling | No suitable recommendation | Do not enable | Telegram terms restrict scraping; a robots 404 is not authorization |
| Threads public keyword search | No paid scraper is required | Own app/token and public-search permission approval required | Meta app with Threads use case; `threads_basic` and approved `threads_keyword_search`; OAuth authorization |
| VK selected community walls / newsfeed search | Potentially, through official API | Auth required; current platform entitlement unverified | User's own approved app/key, current method eligibility check, then a read-only preflight |
| Instagram hashtag discovery | No paid scraper is required | Professional account, Facebook-linked setup, token and App Review required | Approved Instagram Public Content Access and `instagram_basic`; not a general keyword search |
| Manual review in the social apps | Normally no paid infrastructure | Available to a user with normal platform access | Check the original post date, buyer intent, allowed free response route and community rules |

“0 ₽” means choosing ordinary free API usage and the project's existing free infrastructure; these findings do not promise approval, account eligibility, unlimited quotas or lead volume. Social access and successful replies are separate from hosting cost.

## Threads: strongest official discovery option

The official [Keyword and Topic Tag Search](https://developers.facebook.com/documentation/threads/keyword-search) documentation, updated **2026-01-21**, confirms:

- `GET https://graph.threads.com/v1.0/keyword_search` with `q`, **`search_type=RECENT`**, optional `since`/`until`, and `limit` up to **100**. `order=RECENT` is not the documented parameter.
- Request `fields=id,text,permalink,timestamp`; compare returned original timestamps with the freshness threshold, and deduplicate by media ID.
- Required permissions: `threads_basic`, `threads_keyword_search`. **Without approval for `threads_keyword_search`, only the authenticated user's own posts are searched.** A generated token alone does not unlock public lead discovery.
- Maximum **2,200 queries per user per rolling 24 hours**, shared across apps; repeat keywords count; empty result queries do not count.
- Sensitive/offensive keywords can return empty arrays; empty output is not proof that no buyers exist.

Example read-only configuration after authorization: `q=нужен сайт&search_type=RECENT&since=<UTC_UNIX_START>&until=<UTC_UNIX_NOW>&limit=100&fields=id,text,permalink,timestamp`. Use properly encoded query values. Do not put an actual access token into logs, research or shareable links.

Practical setup:

1. Open [Meta Apps](https://developers.facebook.com/apps/) and [Create an app for Threads](https://developers.facebook.com/documentation/threads/get-started/create-an-app). Select the Threads use case. Use the **Threads** app ID/secret, not the other Meta app credentials.
2. Add `threads_keyword_search`; configure exact OAuth redirect, deauthorization and data-deletion URLs. Invite a Threads tester and accept the invitation in the account's Website permissions.
3. Follow [Get Access Tokens](https://developers.facebook.com/documentation/threads/get-started/get-access-tokens-and-permissions), updated **2026-08-12**. Authorization starts at `https://threads.com/oauth/authorize` with the user's own app ID, redirect URI and requested scopes. Exchange the code server-side; do not ask the user to disclose passwords or browser cookies.
4. Complete the required permission App Review. Verify a public post from an unrelated account can actually be returned before marking this source connected.
5. Follow [Long-lived tokens](https://developers.facebook.com/documentation/threads/get-started/long-lived-tokens): short-lived tokens last **1 hour**, long-lived tokens **60 days**; refresh an unexpired long-lived token after it is at least **24 hours** old. Refresh does not replace required permission approval.

Suggested initial searches: `нужен сайт`, `ищу разработчика сайта`, `нужен лендинг`, `заказать сайт`, `нужен интернет-магазин`, `ищу веб-разработчика`. An eight-query sweep hourly is 192 calls/day before pagination, below the documented search quota, but still obey response rate-limit headers and app-level limits. These are unmeasured candidate queries, not verified lead yield.

Use a manual reply on the original thread only when the author asks for offers. A public post or API discovery does not itself authorize unsolicited private messages. Do not add publishing/reply scopes merely to discover leads.

## VK: documented methods, uncertain current entitlement

The live `dev.vk.com` documentation could not be read because the inherited proxy returned a **403 destination denial**. The proxy was preserved; no direct connection or mirror bypass was attempted.

Official evidence is the [VKCOM/vk-api-schema repository](https://github.com/VKCOM/vk-api-schema). Its README identifies **API v5.199**. This is useful contract evidence, but not proof of current 2026 app eligibility or OAuth scopes:

- [newsfeed.search schema](https://github.com/VKCOM/vk-api-schema/blob/master/newsfeed/methods.json): user/service token types; `q`, `start_time` (default 24 hours ago), `end_time` (default current time), `start_from`; `count` default 30, maximum **200**. No documented `sort` parameter in this schema. Sort retained results locally by their `date`, and verify freshness; do not presume all search results are exhaustive.
- [wall.get schema](https://github.com/VKCOM/vk-api-schema/blob/master/wall/methods.json): user/service token types; `domain`, `offset`, `count` maximum **100**, `filter`, `extended`. Use selected public communities and public `all`/`owner`/`others` filters; do not use suggested, postponed, archived, Donut or private content for general discovery.
- [wall objects](https://github.com/VKCOM/vk-api-schema/blob/master/wall/objects.json) document `date` as the publishing Unix timestamp. Repost/edit activity is not a new buyer request. A pinned post can be old; inspect its timestamp.
- The last method-file commits returned by GitHub were [newsfeed 2024-04-19](https://github.com/VKCOM/vk-api-schema/commit/81bd2be682c626d3efa56d5a859e8567c7a76cbd) and [wall 2025-01-20](https://github.com/VKCOM/vk-api-schema/commit/08576fa2fab4d76478070fd7c083f01fe60b74dc). Do not call them current 2026 permission guidance.

Practical user setup links: [VK application management](https://vk.com/apps?act=manage), [current VK API documentation](https://dev.vk.com/ru/api/overview), [wall.get](https://dev.vk.com/ru/method/wall.get), [newsfeed.search](https://dev.vk.com/ru/method/newsfeed.search). These VK setup/doc pages were not successfully opened in this environment. The user must verify whether their app exposes an eligible service key or approved OAuth access; a VK ID sign-in token must not automatically be treated as a VK API token. Read-only preflight calls with the user's own key must pass before deployment can label VK connected. Do not infer `wall` or `offline` scopes from old tutorials. Do not invent a current exact request-per-second quota without live guidance.

Free response routes are conditional: the original post's comments when community rules permit, or the buyer's explicit requested contact route. Public profile discovery alone is not a reason to send a cold DM. No specific VK order/community was validated here.

## Instagram: restricted discovery, not arbitrary text search

Official [Instagram API with Facebook Login](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-facebook-login) explains that it cannot access consumer accounts and does not support ordering results. [Business Discovery](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-facebook-login/business-discovery), updated **2026-08-12**, retrieves known professional-account metadata/media, not free text search across all posts.

[Hashtag Search](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-facebook-login/hashtag-search), updated **2026-08-17**, requires App Review, **Instagram Public Content Access** and **`instagram_basic`**. It allows **30 unique hashtags per rolling 7 days**, including fetching media for known hashtag IDs. Stories hashtags are not supported. API commenting on media discovered this way is not allowed.

[IG Hashtag Recent Media](https://developers.facebook.com/documentation/instagram-platform/instagram-graph-api/reference/ig-hashtag/recent-media), updated **2026-08-17**, confirms:

- Public photo/video media from only the previous **24 hours**, maximum **50 per page**.
- Results are **not always chronological**. Sort locally by `timestamp`.
- `caption`, `permalink`, `timestamp` can be requested; **`username` cannot**.
- An eligible Facebook User access token is required for the connected Page. When the Page role is granted through Business Manager, one of `ads_management`, `business_management` or `pages_read_engagement` is additionally required.

Setup: [Meta Apps](https://developers.facebook.com/apps/) → [Facebook Login Instagram setup](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-facebook-login) → professional account and linked Page → approved feature/permissions → OAuth → hashtag ID lookup → `recent_media`. Do not advertise this as free monitoring of every Russian post or a guaranteed order source. General web hashtags are likely to include many developer advertisements; yield has not been measured.

[Instagram Login API](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login) can support the user's own professional account/media/comments/incoming messages and does not require a linked Facebook Page. Its scoped account-management abilities do not add general public keyword search. Current core scopes include `instagram_business_basic`, `instagram_business_manage_messages` and `instagram_business_manage_comments`. An approved inbound interaction path is preferable to cold messaging.

## Telegram: terms must precede a monitor

`https://t.me/robots.txt` returned **404**. That supplies no affirmative scraping permission.

[Telegram Terms of Service](https://telegram.org/tos) explicitly state that Telegram “prohibits data scraping” under its content-licensing terms. [Content Licensing and AI Scraping Terms](https://telegram.org/tos/content-licensing) prohibit access outside ordinary, legitimate intended platform use, and prohibit scraping, indexing, harvesting and aggregation of platform data for AI deployment except explicit informed affirmative continued consent from relevant users for the specific content/context.

[Bot Developer Terms §4.3](https://telegram.org/tos/bot-developers) say: “Always prohibited uses include any form of data collection aimed at creating large datasets, machine learning models and AI products, such as scraping public group or channel contents.” The same section permits data submitted **directly and voluntarily** to the bot when users are clearly informed and provide **individual, explicit, active and revocable consent**. Channel admin permission or the user's forwarding of someone else's post does not establish the original author's consent for AI aggregation.

Accordingly, this investigation did **not** fetch or index `t.me/s` job-channel posts and cannot honestly supply exact recent Telegram buyer timestamps or verified free reply instructions. It does not treat missing data as zero demand. Manual checking inside Telegram is the remaining way to find current public orders without building such a monitor. A user's direct submission of their own request to the bot is the implementable consented collection path.

[Bot FAQ](https://core.telegram.org/bots/faq) confirms that a bot receives channel messages only in channels where it is a member, and describes group privacy restrictions. Bot API membership is not universal channel access and does not grant historical scraping rights. Keep explicit source allowlists and consent boundaries; receiving an update does not alone make arbitrary processing appropriate.

Setup: open [BotFather](https://t.me/BotFather), create/use the user's bot, configure its webhook according to [Bot API](https://core.telegram.org/bots/api), let buyers start the bot and submit requests. Use a clear purpose/retention/consent notice and revocation/deletion mechanism. Keep paid broadcasts disabled. The ordinary [Bot FAQ limits](https://core.telegram.org/bots/faq#my-bot-is-hitting-limits-how-do-i-avoid-this) describe free operation, approximately 30 outgoing messages/sec overall, 1/sec per chat and 20/minute per group; this project needs small opt-in owner notifications, not broadcasts.

## Buyer validation and free contact rules

Accept project-specific buyer requests such as “нужен сайт для…”, “ищу исполнителя…”, with scope, deadline or budget. Reject developer service ads (“создаю сайты”, “беру заказы”), portfolios, courses, repost digests, permanent employment/recruitment, and closed/fulfilled requests. An isolated word “сайт” or an exposed contact handle is not buyer intent.

For any later authorized/API-fed candidate, record original publishing timestamp with timezone, original post URL, project intent, whether still open, and the author's actual invitation to respond. Rank original requests from the past 24 hours first, then at most 72 hours. Exclude future-dated entries and unknown timestamps from “fresh” claims. Never invent a timestamp from fetch time. Reject paid reply bots, subscription-only contacts or agency intermediaries as “free response routes” unless the buyer's free path is independently confirmed. Keep operational lead details private and never publish contact databases.
