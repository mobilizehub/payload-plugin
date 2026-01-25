import iso from 'i18n-iso-countries'

/**
 * Array of country options with ISO country codes and official names.
 * Can be used to populate country select inputs on the frontend.
 *
 * @example
 * ```tsx
 * import { countries } from '@mobilizehub/payload-plugin/helpers'
 *
 * <select>
 *   {countries.map((country) => (
 *     <option key={country.value} value={country.value}>
 *       {country.label}
 *     </option>
 *   ))}
 * </select>
 * ```
 */
export const countries = Object.entries(iso.getNames('en', { select: 'official' })).map(
  ([code, name]) => ({
    label: name,
    value: code,
  }),
)

export type Country = (typeof countries)[number]
