# MobilizeHub Payload Plugin

A comprehensive email advocacy and contact management plugin for [Payload CMS](https://payloadcms.com). Build powerful advocacy campaigns, manage contacts, send targeted email broadcasts, and track engagement—all within your Payload admin.

[![npm version](https://img.shields.io/npm/v/@mobilizehub/payload-plugin.svg)](https://www.npmjs.com/package/@mobilizehub/payload-plugin)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Alpha Release**: This plugin is currently in alpha. Expect breaking changes between releases until we reach a stable 1.0 version.

## Features

- Contact database with tag-based segmentation and opt-in management
- Email broadcast campaigns with draft-to-sent workflow and audience targeting
- Background task processing for scalable email delivery
- Webhook integration for delivery status tracking (delivered, bounced, opened, clicked)
- Secure unsubscribe tokens with HMAC-SHA256 signing
- Pluggable email adapter system with built-in Resend support
- Customizable pages collection with content blocks

## Installation

```bash
npm install @mobilizehub/payload-plugin
# or
yarn add @mobilizehub/payload-plugin
# or
pnpm add @mobilizehub/payload-plugin
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
