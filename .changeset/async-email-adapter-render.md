---
'@mobilizehub/payload-plugin': minor
---

Allow the email adapter's `render` function to be async. It can now return either a `string` or a
`Promise<string>`, so template libraries that render asynchronously (react-email, MJML) can be used
without a synchronous wrapper. Existing synchronous `render` implementations are unaffected.
