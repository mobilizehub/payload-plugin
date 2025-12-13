import type { AccessArgs, User } from 'payload'

type IsAuthenticated = (args: AccessArgs<User>) => boolean

export const authenticated: IsAuthenticated = ({ req: { user } }) => {
  return Boolean(user)
}
