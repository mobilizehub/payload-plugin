---
'@mobilizehub/payload-plugin': minor
---

Add letter campaigns. A `letters` collection holds the campaign: who the letter is addressed to, the
address it goes to, a subject, and a plain-text body the contact may optionally edit when
`editable` is set. Each submission lands in `letterSubmissions` and is emailed to the target as a
single message, with the contact's name appended to the body, sent from the organisation's
configured address with the contact's address in `Reply-To`. The delivery is recorded in `emails`,
so letters get the same status tracking and bounce handling as broadcasts.

New public API: the `POST /api/letters.createSubmission` endpoint, the `sendLetter` React helper,
and the `lettersOverrides`, `letterSubmissionsOverrides` and `letterConfig` plugin options. The
`emails` collection gains an optional `letterSubmission` relationship.
