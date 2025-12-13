# @mobilizehub/payload-plugin

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
