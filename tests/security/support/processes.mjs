import { spawn, execFile } from 'node:child_process'
import { once } from 'node:events'
import { createServer } from 'node:net'
import { setTimeout } from 'node:timers/promises'
import { promisify } from 'node:util'

const execute = promisify(execFile)

export async function command(file, args, options = {}) {
  try {
    return await execute(file, args, { maxBuffer: 8 * 1024 * 1024, ...options })
  } catch (error) {
    throw new Error(`${file} failed (${error.code}): ${error.stdout}\n${error.stderr}`, {
      cause: error,
    })
  }
}

export async function freePort() {
  const server = createServer()
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const { port } = server.address()
  await new Promise((resolve) => server.close(resolve))
  return port
}

export function start(file, args, options) {
  const child = spawn(file, args, { stdio: ['ignore', 'pipe', 'pipe'], ...options })
  let output = ''
  child.stdout.on('data', (chunk) => {
    output += chunk
  })
  child.stderr.on('data', (chunk) => {
    output += chunk
  })
  return { child, output: () => output }
}

export async function ready(url, process) {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    if (process.child.exitCode !== null) throw new Error(process.output())
    try {
      const response = await fetch(url)
      await response.arrayBuffer()
      if (response.ok) return
    } catch (error) {
      if (attempt === 199) throw error
    }
    await setTimeout(100)
  }
  throw new Error(`Server did not become ready: ${url}\n${process.output()}`)
}

export async function stop(process) {
  if (!process || process.child.exitCode !== null) return
  const exited = once(process.child, 'exit')
  process.child.kill('SIGTERM')
  const timer = setTimeout(5000).then(() => process.child.kill('SIGKILL'))
  await Promise.race([exited, timer])
}
