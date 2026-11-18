import { request } from 'node:http'

export const retiredDotPaths = [
  '/workspace/..',
  '/workspace/%2e%2e',
  '/workspace/.%2E',
  '/api/workspace/..',
  '/api/recommendations/runs/%2e%2e?runId=legacy-private-run',
  '/WORKSPACE/%2E.',
  '/%77orkspace/%2e%2e',
  '/workspace%2f%2e%2e',
  '/workspace/./history',
  '/api/intake/%2E',
  '/tasks/..',
  '/workspace\\..',
  '/workspace\\..\\..',
  '/api/workspace\\..',
  '/tasks\\..',
  '/workspace%5c..',
  '/workspace;x/..',
  '/workspace%00/..',
]

export function rawRequest(origin, path, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = request(new URL(origin), { path, headers }, (response) => {
      let body = ''
      response.setEncoding('utf8')
      response.on('data', (chunk) => {
        body += chunk
      })
      response.on('end', () =>
        resolve({ status: response.statusCode, headers: response.headers, body }),
      )
      response.on('error', reject)
    })
    req.on('error', reject)
    req.end()
  })
}
