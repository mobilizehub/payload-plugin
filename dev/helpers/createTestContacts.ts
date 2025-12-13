export function createTestContacts(): Array<{
  email: string
  firstName: string
  lastName: string
}> {
  const people = [
    {
      email: 'leslie.alexander@example.com',
      firstName: 'Leslie',
      lastName: 'Alexander',
    },
    {
      email: 'michael.foster@example.com',
      firstName: 'Michael',
      lastName: 'Foster',
    },
    {
      email: 'dries.vincent@example.com',
      firstName: 'Dries',
      lastName: 'Vincent',
    },
    {
      email: 'lindsay.walton@example.com',
      firstName: 'Lindsay',
      lastName: 'Walton',
    },
    {
      email: 'courtney.henry@example.com',
      firstName: 'Courtney',
      lastName: 'Henry',
    },
    {
      email: 'tom.cook@example.com',
      firstName: 'Tom',
      lastName: 'Cook',
    },
  ]

  return people
}
