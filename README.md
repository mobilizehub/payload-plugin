# MobilizeHub Payload Plugin

A comprehensive email advocacy and contact management plugin for [Payload CMS](https://payloadcms.com). Build powerful advocacy campaigns, manage contacts, send targeted email broadcasts, and track engagement—all within your Payload admin.

[![npm version](https://img.shields.io/npm/v/@mobilizehub/payload-plugin.svg)](https://www.npmjs.com/package/@mobilizehub/payload-plugin)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Alpha Release**: This plugin is currently in alpha. Expect breaking changes between releases until we reach a stable 1.0 version.

## Features

- Contact database with tag-based segmentation and opt-in management
- Email broadcast campaigns with draft-to-sent workflow and audience targeting
- Forms and form submissions for collecting and managing user responses
- Background task processing for scalable email delivery
- Webhook integration for delivery status tracking (delivered, bounced, opened, clicked)
- Secure unsubscribe tokens with HMAC-SHA256 signing
- Pluggable email adapter system with built-in Resend support
- `createContentCollection` helper for defining your own content collections with a consistent status/settings/content structure

## Installation

```bash
npm install @mobilizehub/payload-plugin
# or
yarn add @mobilizehub/payload-plugin
# or
pnpm add @mobilizehub/payload-plugin
```

## Overriding the emails collection

`emailsOverrides.fields` replaces the whole field set, so any override must keep the fields the
send-email task depends on:

| Field                | Type            | Purpose                                                                                               |
| -------------------- | --------------- | ----------------------------------------------------------------------------------------------------- |
| `idempotencyKey`     | `text` (unique) | The key sent to the provider. Generated once per email row so retries replay rather than double-send. |
| `unsubscribeTokenId` | `text`          | Lets a resumed send rebuild the same unsubscribe token instead of minting a new one.                  |
| `replyTo`            | `text`          | The broadcast's reply-to, captured at send time so every retry sends an identical payload.            |

The emails collection also declares a unique compound index on `(broadcast, contact)`, which is what
guarantees one email per contact per broadcast even when two workers race on the same job.

```ts
mobilizehubPlugin({
  emailsOverrides: {
    fields: ({ defaultFields }) => [...defaultFields, myExtraField],
  },
})
```

Extending `defaultFields` is the safe pattern. If you build the list from scratch, copy all three
fields across verbatim.

### Preview text

`previewText` is not a provider field — it reaches the inbox as a preheader inside the HTML. The
plugin passes it to your `render` function; emit it there if you want it:

```ts
render: ({ html, previewText }) =>
  `<div style="display:none;max-height:0;overflow:hidden">${previewText ?? ''}</div>${html}`
```

## Development

### Setup

```bash
# Clone the repository
git clone https://github.com/mobilizehub/payload-plugin.git
cd payload-plugin

# Install dependencies
pnpm install

# Create environment file
cp dev/.env.example dev/.env
# Edit dev/.env with your configuration

# Start development server
pnpm dev
```

### Testing

```bash
# Run all tests
pnpm test

# Run integration tests
pnpm test:int

# Run E2E tests
pnpm test:e2e
```

### Building

```bash
# Build the plugin
pnpm build
```

## Requirements

- Node.js: `^18.20.2 || >=20.9.0`
- Payload CMS: `^3.68.5`
- pnpm: `^9 || ^10`

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT © MobilizeHub

## Support

For issues, questions, or feature requests, please [open an issue](https://github.com/mobilizehub/payload-plugin/issues) on GitHub.

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for version history and release notes.
