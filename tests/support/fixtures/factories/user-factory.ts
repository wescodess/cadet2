import { faker } from '@faker-js/faker'

export type TestUserRole = 'user' | 'admin' | 'moderator'

export type TestUser = {
  id: string
  email: string
  name: string
  password: string
  role: TestUserRole
  isActive: boolean
}

export type UserFactory = {
  create: (overrides?: Partial<TestUser>) => TestUser
  all: () => TestUser[]
  cleanup: (cleaner?: (user: TestUser) => Promise<void>) => Promise<void>
}

export function createUser(overrides: Partial<TestUser> = {}): TestUser {
  return {
    id: faker.string.uuid(),
    email: faker.internet.email(),
    name: faker.person.fullName(),
    password: faker.internet.password({ length: 20 }),
    role: 'user',
    isActive: true,
    ...overrides,
  }
}

export function createUserFactory(): UserFactory {
  const createdUsers: TestUser[] = []

  return {
    create(overrides: Partial<TestUser> = {}) {
      const user = createUser(overrides)
      createdUsers.push(user)
      return user
    },
    all() {
      return [...createdUsers]
    },
    async cleanup(cleaner?: (user: TestUser) => Promise<void>) {
      if (cleaner)
        await Promise.allSettled(createdUsers.map((user) => cleaner(user)))

      createdUsers.length = 0
    },
  }
}
