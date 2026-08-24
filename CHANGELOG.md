# @mobilizehub/payload-plugin

## 0.10.0

### Minor Changes

- 5feff4a: feat: add posts and authors collections
  - Add a `posts` collection for publishing articles and updates, with status, name, slug, publishedAt, headline, author, and rich text content
  - Add an `authors` collection so posts can share the same author
  - Add `postsOverrides` and `authorsOverrides` configuration options

## 0.9.0

### Minor Changes

- 7c62fd4: feat: export field creators (name, publishedAt, slug, status) via `@mobilizehub/payload-plugin/fields`

  Added a new `./fields` export path that exposes `createNameField`, `createPublishedAtField`, `createSlugField`, and `createStatusField`. This allows users to reuse the same field definitions when building their own collections.

## 0.8.0

### Minor Changes

- b517b68: feat: add petition and petition signatures collections with signing endpoint
  - Add petitions collection for creating and managing petitions with target, ask, and signature goals
  - Add petition signatures collection to track petition signers
  - Add public `POST /api/petitions.createSignature` endpoint for frontend petition signing
  - Add `processPetitionSignature` beforeChange hook to create/update contacts and apply petition tags
  - Add `sendAutoresponse` afterChange hook to send automatic confirmation emails when enabled
  - Add `signPetition` React utility with `onRedirect` and `onMessage` callbacks
  - Export `signPetition` from `@mobilizehub/payload-plugin/react`
  - Add `petitionsOverrides` and `petitionSignaturesOverrides` configuration options

## 0.7.0

### Minor Changes

- cdf8ec7: Add `countries` array export via new `@mobilizehub/payload-plugin/helpers` entry point for use in frontend country select inputs

## 0.6.2

### Patch Changes

- 348d4c0: fix: only include Idempotency-Key header when a key is provided in Resend adapter

  Previously, the Resend adapter would send an empty string as the `Idempotency-Key` header when no key was provided, causing 500 errors from the Resend API. The header is now only included when a valid idempotency key is provided.

## 0.6.1

### Patch Changes

- 30c599b: Fix Resend email adapter idempotency key header handling

## 0.6.0

### Minor Changes

- 4d3107e: feat: add form submission endpoint, hook, and React utility
  - Add public `POST /api/forms.createSubmission` endpoint for frontend form submissions
  - Add `processFormSubmission` beforeChange hook to create/update contacts and apply form tags
  - Add `sendAutoresponse` afterChange hook to send automatic confirmation emails when enabled
  - Add `submitForm` React utility with `onRedirect` and `onMessage` callbacks
  - Export `submitForm` from `@mobilizehub/payload-plugin/react`

## 0.5.3

### Patch Changes

- 7f7e4a4: Fix pages blocks override being incorrectly spread into collection config

## 0.5.2

### Patch Changes

- 280b8af: Fix bug where collection overrides were being overwritten instead of merged. Changed assignment operator (`=`) to logical OR (`||`) in spread operators for `formSubmissionsOverrides`, `formsOverrides`, and `pagesOverrides`. This ensures user-provided hooks, access rules, and other configuration are properly applied.

## 0.5.1

### Patch Changes

- 6e865c2: Improve contact fields filterOptions to use Set for better duplicate detection and add validation ensuring email field is required
- 055aec0: Update Payload dependencies to v3.70.0

## 0.5.0

### Minor Changes

- 4766c32: Add webhook endpoint for email providers at `/webhooks/email`. This endpoint receives webhook events from email providers (e.g., Resend) and delegates processing to the configured email adapter's webhookHandler.

### Patch Changes

- 9f71271: Fix emailQueueName config option not being used in sendBroadcastsTask

## 0.4.1

### Patch Changes

- fa1ed3d: Fix email collection status field default value from 'draft' to 'queued' to match available options.

## 0.4.0

### Minor Changes

- 6e8e428: Add forms and form submissions collections with contact integration
  - Added forms collection for creating and managing forms
  - Added form submissions collection to track form responses
  - Enabled form submissions relationship field in contacts collection
  - Added formsOverrides and formSubmissionsOverrides configuration options

## 0.3.2

### Patch Changes

- ac4c371: fix: add pages collection to plugin exports

## 0.3.1

### Patch Changes

- a160cfb: Update README with comprehensive documentation including features, installation, development setup, and project details

## 0.3.0

### Minor Changes

- 7681c6b: Add pages collection with customizable blocks and fields

## 0.2.0

### Minor Changes

- 8eab80b: Add broadcast email system
  - Add broadcasts collection for managing email campaigns
  - Add emails collection for tracking sent emails with delivery status
  - Add unsubscribe tokens collection for email opt-out management
  - Add Resend email adapter for sending emails
  - Add API endpoints for sending broadcasts and handling unsubscribes
  - Add background tasks for batch email sending
  - Add React hooks and UI components for broadcast management
  - Add email activity tracking and metrics display

## 0.1.0

### Minor Changes

- 4dd4511: Add contacts and tags collections with authentication

  This release introduces two new collections to the Mobilizehub plugin:
  - **Contacts Collection**: A comprehensive contact management system with fields for email, name, phone, address, and opt-in preferences for email and SMS communication. Includes support for tagging contacts and country selection with all ISO countries.
  - **Tags Collection**: A simple tagging system to organize and categorize contacts.

  Both collections are protected with authenticated access control and support customization through plugin configuration options (contactsOverrides and tagsOverrides).

  Breaking changes: None - this is an additive change that doesn't affect existing functionality.

## 0.0.1

### Patch Changes

- 561acfe: Strip example code to create base plugin structure. Removes boilerplate dashboard components, custom endpoints, and plugin collection. Simplifies plugin to minimal configuration ready for actual implementation.
