export type User = {
  id: string
  name: string
}

export const USERS: readonly User[] = [
  { id: 'usr-doug', name: 'Doug' },
  { id: 'usr-daniel', name: 'Daniel' },
  { id: 'usr-mary', name: 'Mary' },
  { id: 'usr-adam', name: 'Adam' },
  { id: 'usr-jabbar', name: 'Jabbar' },
]

export function findUser(userId: string | null): User | null {
  return USERS.find((user) => user.id === userId) ?? null
}
