import type { CollectionConfig, Field } from 'payload'

import iso from 'i18n-iso-countries'

import type { MobilizehubPluginConfig } from '../../types/index.js'

import { authenticated } from '../../access/authenticated.js'

/**
 * Generates country options for the country select field.
 */
const countryOptions = Object.entries(iso.getNames('en', { select: 'official' })).map(
  ([code, name]) => ({
    label: name,
    value: code,
  }),
)

/**
 * Generates the contacts collection configuration.
 * @param contactsConfig
 * @returns CollectionConfig
 *
 * @example
 * ```ts
 * import { generateContactsCollection } from 'path/to/generateContactsCollection';
 *
 * const contactsCollection = generateContactsCollection({
 *   contactsOverrides: {
 *     slug: 'my-contacts',
 *     admin: {
 *       useAsTitle: 'firstName',
 *     },
 *   },
 * });
 * ```
 */
export const generateContactsCollection = (
  contactsConfig: Pick<MobilizehubPluginConfig, 'contactsOverrides'>,
): CollectionConfig => {
  const defaultFields: Field[] = [
    {
      name: 'tags',
      type: 'relationship',
      admin: {
        position: 'sidebar',
      },
      hasMany: true,
      relationTo: 'tags',
    },
    {
      type: 'tabs',
      tabs: [
        {
          fields: [
            {
              name: 'email',
              type: 'email',
              required: true,
            },
            {
              name: 'emailOptIn',
              type: 'checkbox',
              defaultValue: false,
              label: 'Receive emails',
            },
            {
              name: 'firstName',
              type: 'text',
            },
            {
              name: 'lastName',
              type: 'text',
            },
            {
              name: 'mobileNumber',
              type: 'text',
            },
            {
              name: 'mobileOptIn',
              type: 'checkbox',
              defaultValue: false,
              label: 'Receive sms',
            },
          ],
          label: 'Details',
        },
        {
          fields: [
            {
              name: 'address',
              type: 'text',
            },
            {
              name: 'city',
              type: 'text',
            },
            {
              name: 'state',
              type: 'text',
            },
            {
              name: 'zip',
              type: 'text',
            },
            {
              name: 'country',
              type: 'select',
              options: countryOptions,
            },
          ],
          label: 'Location',
        },
        {
          fields: [
            {
              name: 'formSubmissions',
              type: 'join',
              admin: {
                description: 'Form submissions made by this contact',
              },
              collection: 'formSubmissions',
              on: 'contact',
            },
          ],
          label: 'Submissions',
        },
        /**
         * @todo Enable transactions relationship when transactions collection is available.
         */
        // {
        //   fields: [
        //     {
        //       name: 'transactions',
        //       type: 'join',
        //       admin: {
        //         description: 'Transactions made by this contact',
        //       },
        //       collection: 'transactions',
        //       on: 'contact',
        //     },
        //   ],
        //   label: 'Transactions',
        // },
      ],
    },
  ]

  const config: CollectionConfig = {
    ...(contactsConfig?.contactsOverrides || {}),
    slug: contactsConfig.contactsOverrides?.slug || 'contacts',
    access: {
      read: authenticated,
      ...(contactsConfig?.contactsOverrides?.access || {}),
    },
    admin: {
      useAsTitle: contactsConfig?.contactsOverrides?.admin?.useAsTitle || 'email',
      ...(contactsConfig?.contactsOverrides?.admin || {}),
    },
    fields: contactsConfig.contactsOverrides?.fields
      ? contactsConfig.contactsOverrides.fields({ defaultFields })
      : defaultFields,
  }
  return config
}
