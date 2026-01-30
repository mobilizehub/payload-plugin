---
"@mobilizehub/payload-plugin": minor
---

feat: add petition and petition signatures collections with signing endpoint

- Add petitions collection for creating and managing petitions with target, ask, and signature goals
- Add petition signatures collection to track petition signers
- Add public `POST /api/petitions.createSignature` endpoint for frontend petition signing
- Add `processPetitionSignature` beforeChange hook to create/update contacts and apply petition tags
- Add `sendAutoresponse` afterChange hook to send automatic confirmation emails when enabled
- Add `signPetition` React utility with `onRedirect` and `onMessage` callbacks
- Export `signPetition` from `@mobilizehub/payload-plugin/react`
- Add `petitionsOverrides` and `petitionSignaturesOverrides` configuration options
