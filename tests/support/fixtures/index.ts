import { mergeTests, test as base } from '@playwright/test'
import { setAuthProvider } from '@seontechnologies/playwright-utils/auth-session'
import { test as apiRequestFixture } from '@seontechnologies/playwright-utils/api-request/fixtures'
import { createAuthFixtures } from '@seontechnologies/playwright-utils/auth-session/fixtures'
import { test as networkErrorMonitorFixture } from '@seontechnologies/playwright-utils/network-error-monitor/fixtures'

import authProvider from '../helpers/auth-provider'
import { getBaseUrl, getTestEnvironment } from '../helpers/env'
import { test as customFixtures } from './custom-fixtures'

setAuthProvider(authProvider)

const authSessionFixture = base.extend(createAuthFixtures())
const authDefaultsFixture = base.extend({
  authOptions: [
    {
      environment: getTestEnvironment(),
      baseUrl: getBaseUrl(),
    },
    { option: true },
  ],
  authSessionEnabled: [false, { option: true }],
})

export const test = mergeTests(
  apiRequestFixture,
  authSessionFixture,
  authDefaultsFixture,
  networkErrorMonitorFixture,
  customFixtures,
)

export { expect } from '@playwright/test'
