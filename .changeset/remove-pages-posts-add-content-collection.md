---
'@mobilizehub/payload-plugin': minor
---

feat!: replace built-in pages/posts/authors collections with a `createContentCollection` helper

- Remove the plugin's built-in `pages`, `posts`, and `authors` collections, along with the `pagesOverrides`, `postsOverrides`, and `authorsOverrides` config options
- Add `createContentCollection`, exported from `@mobilizehub/payload-plugin/collections`, so consumers can define their own content collections (e.g. pages, posts) with the same status/settings/content tab structure used by the plugin's petitions and forms collections
