---
"@mobilizehub/payload-plugin": patch
---

Fix bug where collection overrides were being overwritten instead of merged. Changed assignment operator (`=`) to logical OR (`||`) in spread operators for `formSubmissionsOverrides`, `formsOverrides`, and `pagesOverrides`. This ensures user-provided hooks, access rules, and other configuration are properly applied.
