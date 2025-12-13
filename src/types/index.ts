import type { CollectionConfig, Field } from 'payload'

export type FieldsOverride = (args: { defaultFields: Field[] }) => Field[]

export type CollectionOverride = { fields?: FieldsOverride } & Partial<
  Omit<CollectionConfig, 'fields'>
>
export type MobilizehubPluginConfig = {
  contactsOverrides?: CollectionOverride
  disabled?: boolean
  tagsOverrides?: CollectionOverride
}
