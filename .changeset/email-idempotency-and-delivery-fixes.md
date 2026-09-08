---
'@mobilizehub/payload-plugin': minor
---

feat: per-record email idempotency keys, plus `replyTo`, `previewText` and unsubscribe fixes
- Generate an idempotency key per email record and store it on the row, instead of deriving it from broadcast and contact IDs — this prevents key collisions between environments sharing a Resend account and makes retries safe
- Add `idempotencyKey`, `unsubscribeTokenId` and `replyTo` fields to the emails collection, plus a unique index on `(broadcast, contact)` — **consumers will need to create and run a migration**
- Fix `replyTo`, which was accepted on a broadcast but never sent: it is now stored on the email row and passed to Resend as `reply_to`
- Fix `previewText`, which was accepted on a broadcast but never used: it is now passed to the `render` function so a template can emit it as a preheader
- Fix `POST /api/unsubscribe` returning 404 for every valid token: the token lookup ran at Payload's default depth, so `emailId` came back as a populated document rather than an ID and the follow-up lookup always failed. The lookup now runs at depth 0.
- Resume `queued` email rows left behind by a crash between create and send, rather than treating "a row exists" as "the email was delivered". Resumed rows reuse their stored HTML and key so the payload is byte-identical across attempts
- Write the unsubscribe token record when resuming a queued row, if the previous attempt ended before creating one, so the link in the already-rendered HTML resolves.
- Throw `EmailSendError` from the Resend adapter carrying the HTTP status and a `retryable` flag. Non-retryable failures (400 `invalid_idempotency_key`, 409 `invalid_idempotent_request`, 422) mark the email `failed` instead of burning three retries; 429 and 5xx still retry, and 409 responses are logged as errors
- Add `failed` to the email activity types so permanently failed sends can be recorded
- Include the broadcast's `replyTo` and `previewText` in test sends, matching a real send
