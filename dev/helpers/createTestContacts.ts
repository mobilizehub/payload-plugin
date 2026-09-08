const DEFAULT_DOMAIN="mobilizehub.com"

export function createTestContacts(): Array<{
  email: string
  firstName: string
  lastName: string
}> {
  const people = [
    {
      email: `leslie.alexander@${DEFAULT_DOMAIN}`,
      firstName: 'Leslie',
      lastName: 'Alexander',
    },
  ]

  return people
}
