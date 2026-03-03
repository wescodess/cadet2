import { faker } from '@faker-js/faker'

type WorkspaceRouteProbe = {
  workspacePath: string
  adminPath: string
  workspaceApiPath: string
}

type TamperedWorkspaceProbe = {
  attackerUserId: string
  tamperedWorkspaceApiPath: string
}

export function createWorkspaceRouteProbe(baseUrl: string): WorkspaceRouteProbe {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, '')

  return {
    workspacePath: `${normalizedBaseUrl}/workspace`,
    adminPath: `${normalizedBaseUrl}/admin/rag-phase0`,
    workspaceApiPath: `${normalizedBaseUrl}/api/workspace/me`,
  }
}

export function createTamperedWorkspaceProbe(baseUrl: string): TamperedWorkspaceProbe {
  const attackerUserId = faker.string.uuid()
  const workspaceProbe = createWorkspaceRouteProbe(baseUrl)

  return {
    attackerUserId,
    tamperedWorkspaceApiPath: `${workspaceProbe.workspaceApiPath}?userId=${attackerUserId}`,
  }
}
