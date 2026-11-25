import { getResponseStatus, setResponseHeader } from 'h3'
import { defineNitroPlugin } from 'nitropack/runtime'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('beforeResponse', (event, response) => {
    const body = response.body
    if (body instanceof Response) {
      if (body.status < 400) return
      const privateResponse = new Response(body.body, body)
      privateResponse.headers.set('cache-control', 'private, no-store')
      response.body = privateResponse
      return
    }
    if (getResponseStatus(event) >= 400) {
      setResponseHeader(event, 'cache-control', 'private, no-store')
    }
  })
})
