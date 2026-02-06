---
"@mobilizehub/payload-plugin": minor
---

feat: export field creators (name, publishedAt, slug, status) via `@mobilizehub/payload-plugin/fields`

Added a new `./fields` export path that exposes `createNameField`, `createPublishedAtField`, `createSlugField`, and `createStatusField`. This allows users to reuse the same field definitions when building their own collections.
