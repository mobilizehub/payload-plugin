---
"@mobilizehub/payload-plugin": patch
---

fix: only include Idempotency-Key header when a key is provided in Resend adapter

Previously, the Resend adapter would send an empty string as the `Idempotency-Key` header when no key was provided, causing 500 errors from the Resend API. The header is now only included when a valid idempotency key is provided.
