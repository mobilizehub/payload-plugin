---
'@mobilizehub/payload-plugin': minor
---

Add webhook endpoint for email providers at `/webhooks/email`. This endpoint receives webhook events from email providers (e.g., Resend) and delegates processing to the configured email adapter's webhookHandler.
