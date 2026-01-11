---
"@mobilizehub/payload-plugin": minor
---

feat: add form submission endpoint, hook, and React utility

- Add public `POST /api/forms.createSubmission` endpoint for frontend form submissions
- Add `processFormSubmission` beforeChange hook to create/update contacts and apply form tags
- Add `sendAutoresponse` afterChange hook to send automatic confirmation emails when enabled
- Add `submitForm` React utility with `onRedirect` and `onMessage` callbacks
- Export `submitForm` from `@mobilizehub/payload-plugin/react`
