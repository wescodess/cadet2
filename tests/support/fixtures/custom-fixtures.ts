import { test as base } from '@playwright/test'

import { getBaseUrl } from '../helpers/env'
import { createUserFactory, type UserFactory } from './factories/user-factory'

type CleanupTask = () => Promise<void> | void

type CustomFixtures = {
  appBaseUrl: string
  registerCleanup: (task: CleanupTask) => void
  userFactory: UserFactory
}

export const test = base.extend<CustomFixtures>({
  appBaseUrl: async ({}, use) => {
    await use(getBaseUrl())
  },
  registerCleanup: async ({}, use) => {
    const cleanupTasks: CleanupTask[] = []

    await use((task) => {
      cleanupTasks.push(task)
    })

    const results = await Promise.allSettled(cleanupTasks.map(async (task) => task()))
    const failedTasks = results.filter((result) => result.status === 'rejected')

    if (failedTasks.length > 0)
      throw new Error(`Cleanup failed for ${failedTasks.length} task(s).`)
  },
  userFactory: async ({ registerCleanup }, use) => {
    const userFactory = createUserFactory()

    registerCleanup(() => userFactory.cleanup())

    await use(userFactory)
  },
})

export { expect } from '@playwright/test'
