import type { Field } from 'payload'

/**
 * Definitions for each contact field, including default required status and label.
 */
export const CONTACT_FIELD_DEFINITIONS = [
  { name: 'email', defaultLabel: 'Email', defaultRequired: true, label: 'Email' },
  {
    name: 'emailOptIn',
    defaultLabel: 'Receive emails',
    defaultRequired: false,
    label: 'Email Opt-In',
  },
  { name: 'firstName', defaultLabel: 'First Name', defaultRequired: false, label: 'First Name' },
  { name: 'lastName', defaultLabel: 'Last Name', defaultRequired: false, label: 'Last Name' },
  {
    name: 'mobileNumber',
    defaultLabel: 'Mobile Number',
    defaultRequired: false,
    label: 'Mobile Number',
  },
  {
    name: 'mobileOptIn',
    defaultLabel: 'Receive SMS',
    defaultRequired: false,
    label: 'Mobile Opt-In',
  },
  { name: 'address', defaultLabel: 'Address', defaultRequired: false, label: 'Address' },
  { name: 'city', defaultLabel: 'City', defaultRequired: false, label: 'City' },
  { name: 'state', defaultLabel: 'State', defaultRequired: false, label: 'State' },
  { name: 'zip', defaultLabel: 'Zip Code', defaultRequired: false, label: 'Zip Code' },
  { name: 'country', defaultLabel: 'Country', defaultRequired: false, label: 'Country' },
] as const

/**
 *  Creates the contact fields configuration for a Payload CMS collection.
 *  Each field can be customized with a label and whether it is required.
 */
export const createContactFieldsConfig = (): Field => {
  return {
    name: 'contactFields',
    type: 'blocks',
    admin: {
      description: 'Configure the fields to be included in the contact form.',
    },
    blocks: CONTACT_FIELD_DEFINITIONS.map((def) => ({
      slug: def.name,
      fields: [
        {
          name: 'label',
          type: 'text',
          admin: {
            placeholder: def.label,
          },
          defaultValue: def.defaultLabel,
        },
        {
          name: 'required',
          type: 'checkbox',
          defaultValue: def.defaultRequired,
        },
      ],
    })),
    defaultValue: [
      {
        blockType: 'email',
        label: 'Email',
        required: true,
      },
    ],
    filterOptions: ({ siblingData }) => {
      const blocks = (siblingData as any)?.contactFields as { blockType: string }[] | undefined
      if (!blocks || blocks.length === 0) {
        return CONTACT_FIELD_DEFINITIONS.map((def) => def.name)
      }
      const usedSlugs = blocks?.map((block) => block.blockType) || []
      return CONTACT_FIELD_DEFINITIONS.map((def) => def.name).filter(
        (slug) => !usedSlugs.includes(slug),
      )
    },
    label: 'Fields',
    labels: {
      plural: 'Fields',
      singular: 'Field',
    },
  }
}
