# Knock in-app feed: what it offers Cadence

Research for issue #3, "Knock in-app feed capabilities". Researched 2026-11-09 against docs.knock.app, knock.app/pricing, the npm package pages, and the `knocklabs/javascript` and `knocklabs/knock-node` GitHub sources. Package versions at that date: `@knocklabs/react` 0.15.1 and `@knocklabs/node` 1.41.0.

Scope: in-app notifications only. Transactional email stays on Postmark (`.outbox/` fallback).

Each claim has a source link. A claim marked **(inferred)** is my own reading of the source and is not stated in the docs.

---

## 1. The in-app feed channel model

- The **in-app feed is a Knock channel**. You add an "in-app" channel step to a **workflow** in the Knock dashboard, then trigger the workflow from the backend. Each recipient gets one **message** in their feed for that channel. Clients read the feed by the channel's ID, the `feedId` (usually stored in `KNOCK_FEED_CHANNEL_ID`). Sources: https://docs.knock.app/integrations/in-app/knock, https://docs.knock.app/in-app-ui/react/feed
- **Templates.** The in-app step has a template you edit in the dashboard. It comes in three variants:
  - standard: body plus an optional **action URL**
  - single-action: one button
  - multi-action: primary and secondary buttons
  
  The action URL can be static or a Liquid variable such as `{{ data.lesson_url }}`. Clicking a notification opens its URL by default. You can override this with `onNotificationClick` / `onNotificationButtonClick`. Button styling comes from the front-end component, not the dashboard. Source: https://docs.knock.app/integrations/in-app/knock
- **Sent messages are immutable.** You cannot edit a sent message's content. To replace a stale notification, archive it and trigger the workflow again. Source: same page.
- **What the feed API returns.** By default it returns actors, public variables, the full trigger `data`, and the recipient. A per-environment **response filter** under Channels and sources > Advanced can trim `vars`/`actor`/`recipient`/`data`. Use it so the browser never receives trigger data that should stay private. Source: same page.
- **Feed metadata.** Every feed response includes `total_count`, `unread_count` and `unseen_count`. Source: https://docs.knock.app/in-app-ui/api-overview
- **Filtering.** Feeds can be filtered by tenant, by archived status (archived messages are excluded by default), and by trigger `data`. Source: https://docs.knock.app/in-app-ui/api-overview

## 2. React SDK, prebuilt components, and SSR

**Packages**
- `@knocklabs/react` contains the components and hooks. It is built on `@knocklabs/react-core` and `@knocklabs/client`. Peer dependencies are `react`/`react-dom` `^17 || ^18 || ^19`, so Cadence's React 19.2 is supported. Optional peers are `next` and `@tanstack/react-router`. There are extra entrypoints `@knocklabs/react/next` and `@knocklabs/react/tanstack`, but **no React Router entrypoint**. Sources: https://unpkg.com/@knocklabs/react/package.json, https://www.npmjs.com/package/@knocklabs/react
- **CSS.** `import "@knocklabs/react/dist/index.css"` is required unless you restyle everything. Theming uses `--rnf-*` CSS variables, and every class is prefixed `rnf-`. `KnockFeedProvider` takes `colorMode="light" | "dark"`. Source: https://docs.knock.app/in-app-ui/react/feed

**Prebuilt components** (source: https://docs.knock.app/in-app-ui/react/feed and https://docs.knock.app/in-app-ui/react/overview)
- `KnockProvider`. Props are `apiKey` (the public key), `user={{ id }}` (the older `userId` is deprecated), `userToken`, `onUserTokenExpiring`, `i18n`, and `enabled` (default `true`). With `enabled={false}` the provider still renders its children but the client sits idle. Switching it to `false` disconnects and clears data. Knock recommends this over mounting the provider conditionally. Sources: https://raw.githubusercontent.com/knocklabs/javascript/main/packages/react/README.md, https://raw.githubusercontent.com/knocklabs/javascript/main/packages/react-core/src/modules/core/context/KnockProvider.tsx
- `KnockFeedProvider` takes `feedId`, `colorMode` and `defaultFeedOptions`.
- `NotificationIconButton` is the **bell** with a badge. `badgeCountType` defaults to unseen. Set it to `"unread"` to count unread items instead.
- `NotificationFeedPopover` is the dropdown **popover** anchored to the bell through `buttonRef`. Its props are `isVisible`, `onClose`, `onOpen` and `onNotificationClick`. **By default, opening it marks every item as seen.** You can override that in `onOpen`.
- `NotificationFeed` is the inline **feed/list**, for example for a full-page "Notifications" route. Its props are `renderItem`, `renderHeader`, `initialFilterStatus`, `onNotificationClick` and `onNotificationButtonClick`. The default header has a status filter (all/unread/read) and a "mark all as read" control.
- `NotificationCell` and `Avatar` are building blocks for a custom `renderItem`.
- **Headless option.** The hooks (`useKnockFeed`, and others) expose the feed client and store, so you can build the bell and list in Cadence's own shadcn/Tailwind components instead of the prebuilt ones. Sources: https://docs.knock.app/in-app-ui/react/overview, https://docs.knock.app/in-app-ui/react/headless/feed
- **Localisation.** Only `en` strings ship by default. Others go through `i18n`. Source: https://docs.knock.app/in-app-ui/react/feed

**SSR compatibility (React Router v8)**
- The docs have **no SSR guidance** for React Router, Remix, or non-Next frameworks. Knock's Next.js tutorial puts `KnockProvider` in a layout but does not address `'use client'` or server rendering. Sources: https://docs.knock.app/in-app-ui/react/feed, https://knock.app/blog/how-to-add-an-in-app-notification-feed-to-nextjs-15
- From the source code:
  - `KnockProvider` makes no `window`/`document` access in its render body.
  - The feed client guards its only browser API, `BroadcastChannel`, with `typeof self !== "undefined"`, and its comment says this is because `self` is "not in server rendered envs".
  
  Sources: https://raw.githubusercontent.com/knocklabs/javascript/main/packages/react-core/src/modules/core/context/KnockProvider.tsx, https://raw.githubusercontent.com/knocklabs/javascript/main/packages/client/src/clients/feed/feed.ts
- **(inferred)** The providers will probably server-render. The bell and feed would then render empty or loading on the server and fill in after hydration, because fetching and the socket start client-side. Nothing guarantees this. The safe pattern is to render the bell only on the client (for example behind a `useEffect` "mounted" flag, or `<ClientOnly>`), or to drive it with `enabled`, and to spike it early. The badge count will not appear in the SSR HTML.

## 3. Identifying users and authenticating the feed

**Users**
- Every Knock user has an `id`. Use your **own primary key** for it, not an email. The `id` is a string of at most 256 characters, cannot contain `/` or `#`, and **cannot be changed later**. Optional attributes are `name`, `email`, `avatar` (a URL), `timezone`, and any custom `properties`. Source: https://docs.knock.app/concepts/users
- A user must exist in Knock before you can notify them. There are two ways to create or update one:
  - **Identify (upsert)**: `PUT /v1/users/{user_id}`, called as `client.users.update(userId, {...})` in Node. It merges only the fields you send. Sources: https://docs.knock.app/api-reference/users/update, https://raw.githubusercontent.com/knocklabs/knock-node/main/api.md
  - **Inline identification in the trigger.** Pass recipients as objects (`{ id, name, email }`), not as bare ID strings. Knock guarantees these recipients are upserted before any workflow step runs. Source: https://docs.knock.app/managing-recipients/identifying-recipients
- Deleting a user means existing in-app messages that reference them show a "missing user" marker. Source: https://docs.knock.app/concepts/users
- **What this means for Cadence.** `users.id` is an autoincrement **integer** (`app/db/schema.ts`), and the session stores it as a number (`app/lib/session.ts` `getCurrentUserId`). Cadence must stringify it consistently, for example `String(user.id)`. Inline identification can send `name`, `email` and `avatarUrl → avatar` on every trigger, so Cadence would not need a separate sync job.

**Keys and authentication**
- **Secret key.** Server only. Used by the Node SDK. Its env var defaults to `KNOCK_API_KEY` in `@knocklabs/node` v1. Source: https://www.npmjs.com/package/@knocklabs/node
- **Public key.** Used in the browser, and limited to user-scoped endpoints (feeds, preferences, and so on). Source: https://docs.knock.app/in-app-ui/security-and-authentication
- **Enhanced security mode** is a per-environment toggle that Knock recommends for production. When it is **off**, "a request with your public key can act as any user", so anyone can read anyone's feed by changing the user id. When it is **on**, every client request must also carry a **signed user token**. Source: https://docs.knock.app/in-app-ui/security-and-authentication
- **The user token**
  - It is a JWT signed with **RS256**, using a private signing key you generate in the dashboard (Platform > API keys). The key is shown only once. The conventional env var is `KNOCK_SIGNING_KEY`.
  - Claims: `sub` is the user id (required), plus `iat` and `exp` (both recommended), and optional `grants`/`explicit_grants` for tenant and object access.
  - The Node helper is `signUserToken(userId, { signingKey?, expiresInSeconds? })`. Its default expiry is **3600 s**.
  
  Sources: https://docs.knock.app/in-app-ui/security-and-authentication, https://www.npmjs.com/package/@knocklabs/node
- Knock suggests matching the token expiry to the app session. Otherwise, use a short-lived token and refresh it with `onUserTokenExpiring`. Refreshing calls `authenticate` again, which restarts the realtime connection. Source: https://docs.knock.app/in-app-ui/security-and-authentication
- **(inferred) How this fits Cadence.** The root or app-layout loader already knows the user from the cookie session. It would call `signUserToken(String(userId))` on the server and return `{ knockUserId, knockToken, publicKey, feedId }` to the client, which passes them to `KnockProvider`. `KNOCK_SIGNING_KEY` never leaves the server. Signing a token on every navigation is cheap, but the loader could cache the token for its expiry window. Cadence's cookie has no explicit `maxAge`, so the `onUserTokenExpiring` refresh path, or re-signing on each loader run, is needed.
- **CommonJS caveat.** The Node SDK signs with `jose`. CJS projects that cannot `require` ESM must pin `jose` to v5. Cadence's server build is ESM, so this probably does not apply **(inferred)**. Source: https://www.npmjs.com/package/@knocklabs/node

## 4. Triggering workflows from Node

```ts
import Knock from "@knocklabs/node";
const knock = new Knock({ apiKey: process.env.KNOCK_API_KEY }); // default env var, can be omitted

const { workflow_run_id } = await knock.workflows.trigger("lesson-published", {
  recipients: [{ id: "42", name: "Ada", email: "ada@example.com" }], // inline identify
  actor: "7",            // who did it; shows as the avatar/actor in the feed
  data: { courseTitle: "…", lessonUrl: "/courses/…" },
  tenant: undefined,     // optional multi-tenant scoping
  cancellation_key: undefined,
  // settings: { sandbox_mode: true, skip_delay: true } — see §8
});
```
Sources: https://www.npmjs.com/package/@knocklabs/node, https://docs.knock.app/api-reference/workflows/trigger, https://docs.knock.app/managing-recipients/identifying-recipients

- `POST /v1/workflows/{key}/trigger`. Runs are **asynchronous**: the call returns only a `workflow_run_id`, not the delivered messages. Inline identification works for `actor`, `recipients` and `tenant`. Source: https://docs.knock.app/api-reference/workflows/trigger
- A trigger accepts **at most 1000 recipients**, and there is no bulk-trigger API. To notify every Student in a large Course you must split the recipients into batches, or use Knock **Objects/subscriptions**, where a course is an object that its students subscribe to. Sources: https://docs.knock.app/send-notifications/triggering-workflows, https://knock.app/changelog/2023-02-09
- Other relevant workflow features:
  - Trigger **conditions** can short-circuit a run.
  - **Trigger frequency** can be set to "once per recipient".
  - `cancellation_key` with `workflows.cancel(key, …)` stops runs that are waiting in delay or batch steps.
  - Triggering an **inactive** workflow returns `workflow_inactive`.
  
  Sources: https://docs.knock.app/send-notifications/triggering-workflows, https://raw.githubusercontent.com/knocklabs/knock-node/main/api.md
- Node SDK requirements: Node 20 LTS or later, TypeScript 4.9 or later. Default options are `maxRetries: 2` and `timeout: 60s`. Source: https://www.npmjs.com/package/@knocklabs/node
- **(inferred)** Triggering is one HTTP call to Knock. In a React Router `action` it should not block the user's response or fail the mutation when Knock is down. That argues for a small `notify.server.ts` seam, like `mailer.server.ts`, that swallows and logs errors.

## 5. Real-time updates

- Knock runs a **WebSocket** that the client SDK subscribes to per feed channel. The documented event is `new-message`. It carries updated badge metadata rather than the full message, and it "might be throttled". Source: https://docs.knock.app/in-app-ui/api-overview
- The React feed updates in real time by default. Two `defaultFeedOptions` control this:
  - `auto_manage_socket_connection` disconnects hidden tabs and reconnects them when they become visible (default delay 2000 ms).
  - `__experimentalCrossBrowserUpdates` syncs the user's tabs through `BroadcastChannel`.
  
  Source: https://docs.knock.app/in-app-ui/react/feed
- Headless code uses `feedClient.listenForUpdates()` / `teardown()`, plus events such as `items.received.realtime`. Source: https://docs.knock.app/in-app-ui/javascript/sdk/feed-client
- Cadence's server needs nothing for this, because the browser connects straight to Knock **(inferred)**.

## 6. Read / unread / seen / archived and mark-all

- **Status model**
  - **Unseen**: the message has not yet been rendered in the feed.
  - **Seen**: rendered but not read.
  - **Read**: explicitly marked read, which the default UI does when the item is clicked.
  - **Archived**: separate from the above. It removes the message from the feed (the "x" on a cell).
  - **Interacted**: an engagement event recorded when a cell or button is clicked.
  
  Source: https://docs.knock.app/integrations/in-app/knock
- **Badge.** The default count is **unseen**, and opening the popover sets it to zero. Some apps count **unread** instead (`badgeCountType="unread"`). Source: https://docs.knock.app/integrations/in-app/knock, https://docs.knock.app/in-app-ui/react/feed
- **Mark all.** The default feed header has "mark all as read". The feed client has `markAllAsSeen`, `markAllAsRead` and `markAllAsArchived`, which apply to the current scope and update the store optimistically. There are also per-item `markAsSeen/Unseen/Read/Unread/Archived/Unarchived/Interacted`. Sources: https://docs.knock.app/in-app-ui/javascript/sdk/feed-client, https://docs.knock.app/integrations/in-app/knock
- **How mark-all works.** `markAllAsRead` calls a bulk endpoint scoped to the feed channel (`bulkUpdateAllStatusesInChannel`). The server-side equivalent is `client.channels.bulk.updateMessageStatus(channelId, action, …)` (`POST /v1/channels/{channel_id}/messages/bulk/{action}`). Server-side per-message calls also exist (`client.messages.markAsRead`, `client.messages.batch.markAsRead`). Sources: https://raw.githubusercontent.com/knocklabs/javascript/main/packages/client/src/clients/feed/feed.ts, https://raw.githubusercontent.com/knocklabs/knock-node/main/api.md
- **Archived view.** The default component has no archived view. Archived items are fetched with `archived: "only"`. Source: https://docs.knock.app/integrations/in-app/knock

## 7. Free tier and environments

**Free ("Developer") plan, from https://knock.app/pricing**
- $0, no card required.
- **10,000 messages per month**. One message is "a single message delivered to a single user on a single channel". Bounced or failed sends are excluded.
- **Unlimited environments**, unlimited team members.
- Feed retention is unlimited (configurable). Log retention is 30 days.
- Knock branding is not removed.
- Messages are **not hard-capped**. If you go over without a billing method, Knock contacts you the following month.
- The next tier, Starter, is $250/month for 50k messages, then $0.005 per message.
- (inferred) For Cadence, fan-out events such as "new lesson to every enrolled Student" count one message per recipient. They are the main driver of usage.

**Environments, from https://docs.knock.app/concepts/environments**
- Every account has **Production**. Enabling environments adds **Development**, and custom ones such as Staging can be inserted between them.
- Each environment has **its own API keys and isolated data**, so users and messages never mix.
- Workflows and templates are versioned with **commits** and **promoted** from Development up to Production under the same key. API triggers use the last *committed* version, while the test runner uses the last *saved* version (https://docs.knock.app/send-notifications/testing-workflows).
- Environments are created only in the dashboard, not through the API.
- The docs do not say whether development-environment messages count toward the monthly limit.

## 8. Running locally and in tests without keys

- **Knock has no offline, mock, or local-server mode.** None of the docs pages consulted describe one. The environments page names no sandbox or test mode, and the closest thing is a separate Development environment, which still needs keys and network. Sources: https://docs.knock.app/concepts/environments, https://docs.knock.app/send-notifications/testing-workflows
- **What exists**
  - The dashboard **test runner** runs a workflow or a single step with a chosen recipient and data.
  - **`settings.sandbox_mode`** on a trigger generates and previews messages without delivering them to providers.
  - **`settings.skip_delay`** skips delay steps.
  
  All three still need a valid key and network access. It is not documented whether sandboxed in-app messages appear in the feed, or whether they count toward billing. Sources: https://docs.knock.app/send-notifications/testing-workflows, https://docs.knock.app/api-reference/workflows/trigger
- **Client side.** `KnockProvider enabled={false}` renders children with an idle client. This is useful when no public key or user is configured. Source: https://raw.githubusercontent.com/knocklabs/javascript/main/packages/react/README.md
- **(inferred) Implication for Cadence.** Mirror the Postmark mailer pattern. Put a `notify.server.ts` module in front of `@knocklabs/node`:
  - When `KNOCK_API_KEY` is unset, it writes the would-be trigger (`workflow`, `recipients`, `actor`, `data`) to a local `.outbox/`-style file or an in-memory array that Vitest can assert on.
  - On the client, render the bell only when `KNOCK_PUBLIC_API_KEY` and `KNOCK_FEED_CHANNEL_ID` are present (or set `enabled={false}`).
  
  Tests then never touch Knock. The DevUI user switcher would still work locally without keys, but with no live feed.

## Open questions and things to spike

1. Does the prebuilt `NotificationFeedPopover` server-render cleanly under React Router v8 SSR, or does it need a client-only wrapper? The docs say nothing either way, and the source only suggests it is SSR-tolerant.
2. Do the prebuilt components fit Cadence's shadcn/Tailwind look well enough with `--rnf-*` variables, or is the headless hooks route better?
3. Do sandboxed in-app messages show up in the feed, and do they count toward the 10k/month free limit?
4. Large fan-out (more than 1000 recipients per trigger): batch in app code, or model Courses as Knock Objects with subscriptions?

## Sources

- https://docs.knock.app/integrations/in-app/knock
- https://docs.knock.app/in-app-ui/react/feed
- https://docs.knock.app/in-app-ui/react/overview
- https://docs.knock.app/in-app-ui/react/headless/feed
- https://docs.knock.app/in-app-ui/javascript/sdk/feed-client
- https://docs.knock.app/in-app-ui/api-overview
- https://docs.knock.app/in-app-ui/security-and-authentication
- https://docs.knock.app/concepts/users
- https://docs.knock.app/concepts/environments
- https://docs.knock.app/managing-recipients/identifying-recipients
- https://docs.knock.app/api-reference/users/update
- https://docs.knock.app/api-reference/workflows/trigger
- https://docs.knock.app/send-notifications/triggering-workflows
- https://docs.knock.app/send-notifications/testing-workflows
- https://knock.app/pricing
- https://knock.app/changelog/2023-02-09
- https://www.npmjs.com/package/@knocklabs/node
- https://www.npmjs.com/package/@knocklabs/react
- https://unpkg.com/@knocklabs/react/package.json
- https://raw.githubusercontent.com/knocklabs/javascript/main/packages/react/README.md
- https://raw.githubusercontent.com/knocklabs/javascript/main/packages/react-core/src/modules/core/context/KnockProvider.tsx
- https://raw.githubusercontent.com/knocklabs/javascript/main/packages/client/src/clients/feed/feed.ts
- https://raw.githubusercontent.com/knocklabs/knock-node/main/api.md
- https://knock.app/blog/how-to-add-an-in-app-notification-feed-to-nextjs-15
