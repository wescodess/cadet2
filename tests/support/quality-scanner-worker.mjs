import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { EventEmitter } from 'node:events'
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import { join } from 'node:path'
import { clearTimeout, setTimeout } from 'node:timers'

const publications = new Map()
export function scannerPid(text) {
  if (typeof text !== 'string' || !/^[1-9][0-9]*$/.test(text))
    throw new Error('Invalid process identity syntax')
  const pid = JSON.parse(text)
  if (!Number.isSafeInteger(pid) || pid <= 1 || pid === process.pid)
    throw new Error('Invalid process identity range')
  return pid
}
export function scannerReadiness(text, expected) {
  if (typeof text !== 'string' || !text.length)
    throw new Error('Scanner readiness is not published')
  const record = JSON.parse(text)
  if (
    JSON.stringify(record) !== text ||
    !record ||
    Object.keys(record).sort().join() !== 'depth,nonce,parentPid,pid,role,version' ||
    record.version !== 1 ||
    record.nonce !== expected.nonce ||
    record.role !== expected.role ||
    record.depth !== expected.depth ||
    typeof record.pid !== 'number' ||
    typeof record.parentPid !== 'number' ||
    !Number.isSafeInteger(record.parentPid) ||
    record.parentPid <= 1
  )
    throw new Error('Scanner readiness identity mismatch')
  scannerPid(String(record.pid))
  if (expected.pid !== undefined && record.pid !== expected.pid)
    throw new Error('Foreign scanner identity')
  if (expected.parentPid !== undefined && record.parentPid !== expected.parentPid)
    throw new Error('Foreign scanner parent')
  return record
}
export function scannerReady(directory) {
  const state = publications.get(directory)
  if (!state) throw new Error('Unknown scanner publication ownership')
  const rows = []
  for (const depth of [0, 1, 2]) {
    const path = join(directory, depth + '.pid')
    const birth = state.births.get(depth)
    if (!existsSync(path) || !birth) return null
    const record = scannerReadiness(readFileSync(path, 'utf8'), {
      nonce: state.nonce,
      role: 'scanner',
      depth,
      pid: birth.pid,
      parentPid: depth ? rows[depth - 1].pid : birth.parentPid,
    })
    rows.push(record)
  }
  if (new Set(rows.map((row) => row.pid)).size !== 3)
    throw new Error('Duplicate scanner process identity')
  return rows
}
export function scannerSettled(directory) {
  const state = publications.get(directory)
  if (!state || state.births.size !== 3) throw new Error('Unknown scanner lifetime identities')
  return state.closed.size === 3
}
export function writeScannerWorker(directory) {
  const worker = join(directory, 'worker.mjs'),
    nonce = randomUUID()
  const socketPath = join(directory, 'birth.sock')
  const state = { nonce, births: new Map(), closed: new Set(), connections: new Set() }
  state.server = createServer((socket) => {
    state.connections.add(socket)
    let input = '',
      depth
    socket.on('data', (data) => {
      input += data
      if (input.length > 4096 || !input.includes('\n')) return
      try {
        const record = JSON.parse(input.trim())
        scannerReadiness(JSON.stringify(record), { nonce, role: 'scanner', depth: record.depth })
        if (![0, 1, 2].includes(record.depth) || state.births.has(record.depth))
          throw new Error('Duplicate/foreign birth')
        depth = record.depth
        state.births.set(depth, record)
      } catch {
        socket.destroy()
      }
    })
    socket.once('close', () => {
      if (depth !== undefined) state.closed.add(depth)
      state.connections.delete(socket)
    })
  })
  state.server.listen(socketPath)
  publications.set(directory, state)
  writeFileSync(
    worker,
    String.raw`
    import { spawn } from 'node:child_process';
    import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
    import { connect } from 'node:net';
    const [depth, directory] = process.argv.slice(2);
    const record = { version: 1, nonce: ${JSON.stringify(nonce)}, role: 'scanner', depth: JSON.parse(depth), pid: process.pid, parentPid: process.ppid };
    const path = directory + '/' + depth + '.pid', temporary = path + '.' + record.nonce + '.tmp';
    const owner = connect(${JSON.stringify(socketPath)}); let child;
    owner.on('connect', () => {
      writeFileSync(temporary, JSON.stringify(record), { flag: 'wx' }); renameSync(temporary, path);
      owner.write(JSON.stringify(record) + '\n');
      if (record.depth < 2) child = spawn(process.execPath, [${JSON.stringify(worker)}, String(record.depth + 1), directory], { stdio: 'inherit' });
    });
    async function ownerLost() {
      if (child && child.exitCode === null && child.signalCode === null) {
        const reaped = new Promise(resolve => child.once('exit', resolve)); child.kill('SIGKILL'); await reaped;
      }
      process.exit(1);
    }
    owner.on('end', ownerLost); owner.on('error', ownerLost);
    for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(signal, () => {});
    setInterval(() => {
      if (depth !== '0' || !existsSync(directory + '/finish')) return;
      const value = readFileSync(directory + '/finish', 'utf8');
      if (value === 'signal') process.kill(process.pid, 'SIGUSR2');
      else if (/^[0-9]+$/.test(value)) { console.log('scanner completion control'); process.exit(JSON.parse(value)); }
    }, 20);
  `,
  )
  return worker
}
function live(child) {
  return child.exitCode === null && child.signalCode === null
}
function timeout(promise, deadline) {
  let timer
  const expired = new Promise((_, reject) => {
    timer = setTimeout(
      () => reject(new Error('Owned process cleanup exceeded 2000ms')),
      Math.max(1, deadline - Date.now()),
    )
  })
  return Promise.race([promise, expired]).finally(() => clearTimeout(timer))
}
const scannerControllerSource = String.raw`(async function scannerTestController() {
  const { spawn } = await import('node:child_process')
  const { closeSync } = await import('node:fs')
  const request = JSON.parse(process.argv[1])
  if (process.pid <= 1 || !process.send) throw new Error('Missing private controller ownership')
  let finishing = false, nativeClosed = false
  const child = spawn(request.command, request.args, { stdio: ['ignore', 'inherit', 'inherit'] })
  const reaped = new Promise((resolve) => child.once('close', resolve))
  const send = (message) => { if (process.connected) process.send({ nonce: request.nonce, ...message }) }
  child.once('spawn', () => send({ type: 'ready', pid: child.pid, controllerPid: process.pid }))
  child.once('error', (error) => send({ type: 'error', error: error.message }))
  child.once('exit', (code, signal) => send({ type: 'exit', code, signal, reaped: true }))
  child.once('close', () => {
    nativeClosed = true
    for (const fd of [1, 2]) { try { closeSync(fd) } catch {} }
    send({ type: 'close' })
  })
  async function cleanup() {
    if (finishing) return
    finishing = true
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL')
    if (!nativeClosed) await reaped
    const finish = () => process.kill(-process.pid, 'SIGKILL')
    if (process.connected) process.send({ nonce: request.nonce, type: 'settled', reaped: true }, finish)
    else finish()
  }
  process.on('disconnect', cleanup)
  process.on('message', (message) => {
    if (message?.nonce !== request.nonce) return cleanup()
    if (message.type === 'stop') return cleanup()
    if (message.type !== 'signal' || !['SIGKILL', 'SIGTERM', 'SIGINT', 'SIGHUP'].includes(message.signal)) return cleanup()
    if (child.exitCode === null && child.signalCode === null) child.kill(message.signal)
  })
})()`

export function scannerTestResources() {
  const temporary = [],
    owned = new Map(),
    controllers = new Set()
  let cleaning
  function ownSpawn(command, args, options = {}) {
    if (cleaning) throw new Error('Process resources are settling')
    const nonce = randomUUID()
    const request = JSON.stringify({ nonce, command, args })
    const stdio =
      options.stdio === 'ignore'
        ? ['ignore', 'ignore', 'ignore', 'ipc']
        : ['ignore', 'pipe', 'pipe', 'ipc']
    const controller = spawn(process.execPath, ['-e', scannerControllerSource, request], {
      cwd: options.cwd,
      env: options.env,
      detached: true,
      stdio,
    })
    const child = new EventEmitter()
    const lease = {
      nonce,
      controller,
      pid: controller.pid,
      nativePid: null,
      code: null,
      signal: null,
      nativeExited: false,
      nativeClosed: false,
      acknowledged: false,
      failure: null,
    }
    child.stdout = controller.stdout
    child.stderr = controller.stderr
    for (const [name, get] of Object.entries({
      pid: () => lease.nativePid,
      exitCode: () => lease.code,
      signalCode: () => lease.signal,
    }))
      Object.defineProperty(child, name, { get })
    let spawned,
      closed,
      emittedClose = false
    const ended = { stdout: !controller.stdout, stderr: !controller.stderr }
    function closeWhenDrained() {
      if (emittedClose || !lease.nativeClosed || !ended.stdout || !ended.stderr) return
      emittedClose = true
      closed()
      child.emit('close', lease.code, lease.signal)
    }
    for (const name of ['stdout', 'stderr'])
      controller[name]?.once('end', () => {
        ended[name] = true
        closeWhenDrained()
      })
    child.spawned = new Promise((resolve) => {
      spawned = resolve
    })
    lease.closed = new Promise((resolve) => {
      closed = resolve
    })
    lease.reaped = new Promise((resolve) =>
      controller.once('close', (code, signal) => resolve({ code, signal })),
    )
    controller.on('error', (error) => {
      lease.failure = error
    })
    controller.on('message', (message) => {
      if (message?.nonce !== nonce) {
        lease.failure = new Error('Foreign controller readiness')
        return
      }
      if (message.type === 'ready') {
        scannerPid(String(message.pid))
        if (message.controllerPid !== controller.pid) {
          lease.failure = new Error('Mismatched live controller identity')
          return
        }
        lease.nativePid = message.pid
        spawned(message)
      } else if (message.type === 'exit' && message.reaped === true) {
        lease.nativeExited = true
        lease.code = message.code
        lease.signal = message.signal
        child.emit('exit', message.code, message.signal)
      } else if (message.type === 'close') {
        lease.nativeClosed = true
        closeWhenDrained()
      } else if (message.type === 'settled' && message.reaped === true) lease.acknowledged = true
      else lease.failure = new Error(message.error ?? 'Malformed private controller receipt')
    })
    child.kill = (signal = 'SIGTERM') => {
      requireOwned(child)
      if (!['SIGKILL', 'SIGTERM', 'SIGINT', 'SIGHUP'].includes(signal))
        throw new Error('Invalid owned process signal')
      if (lease.nativeExited) return false
      controller.send({ nonce, type: 'signal', signal })
      return true
    }
    owned.set(child, lease)
    return child
  }
  function requireOwned(child) {
    const lease = owned.get(child)
    if (!lease || lease.pid !== lease.controller.pid)
      throw new Error('Unknown child handle ownership')
    scannerPid(String(lease.pid))
    return lease
  }
  async function stop(child, deadline = Date.now() + 2000) {
    const lease = requireOwned(child)
    if (lease.stopping) return lease.stopping
    lease.stopping = (async () => {
      if (!live(lease.controller) || !lease.controller.connected)
        throw new Error('Unknown live controller ownership; no numeric cleanup attempted')
      lease.controller.send({ nonce: lease.nonce, type: 'stop' })
      await timeout(lease.closed, deadline)
      await timeout(lease.reaped, deadline)
      if (!lease.nativeExited || !lease.acknowledged || lease.failure)
        throw lease.failure ?? new Error('Unacknowledged child/controller reaping')
      return {
        nonce: lease.nonce,
        nativePid: lease.nativePid,
        controllerPid: lease.pid,
        code: lease.code,
        signal: lease.signal,
        reaped: true,
      }
    })()
    return lease.stopping
  }
  async function escape(directory, closedStdio = false) {
    const nonce = randomUUID(),
      socketPath = join(directory, 'control.sock')
    const connections = new Set()
    let settleReady, settleDone
    const pending = new Map()
    const ready = new Promise((resolve) => {
      settleReady = resolve
    })
    const done = new Promise((resolve) => {
      settleDone = resolve
    })
    const server = createServer((socket) => {
      connections.add(socket)
      let input = ''
      socket.on('data', (data) => {
        input += data
        if (input.length > 4096) return socket.destroy()
        while (input.includes('\n')) {
          const end = input.indexOf('\n'),
            line = input.slice(0, end)
          input = input.slice(end + 1)
          let record
          try {
            record = JSON.parse(line)
          } catch {
            socket.destroy()
            return
          }
          if (record.nonce !== nonce) {
            socket.destroy()
            return
          }
          if (record.event === 'ready') {
            scannerPid(String(record.pid))
            scannerPid(String(record.childPid))
            settleReady(record)
          } else if (record.event === 'reaped' && record.reaped === true) settleDone(record)
          else if (record.event === 'alive' && pending.has(record.challenge)) {
            pending.get(record.challenge)(record.alive === true)
            pending.delete(record.challenge)
          } else socket.destroy()
        }
      })
      socket.once('close', () => connections.delete(socket))
    })
    await new Promise((resolve, reject) => {
      server.once('error', reject)
      server.listen(socketPath, resolve)
    })
    const controller = join(directory, 'controller.mjs'),
      worker = join(directory, 'escape-worker.mjs')
    writeFileSync(
      controller,
      String.raw`
      import { spawn } from 'node:child_process'; import { connect } from 'node:net';
      const nonce = ${JSON.stringify(nonce)}, owner = connect(${JSON.stringify(socketPath)});
      const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'inherit' });
      const reaped = new Promise(resolve => child.once('exit', () => resolve())); let finishing = false;
      async function cleanup() {
        if (finishing) return; finishing = true;
        if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
        await reaped; owner.end(JSON.stringify({nonce,event:'reaped',reaped:true})+'\n');
        clearTimeout(watchdog); owner.unref();
      }
      const watchdog = setTimeout(cleanup, 12000);
      owner.on('connect', () => owner.write(JSON.stringify({nonce,event:'ready',pid:process.pid,childPid:child.pid})+'\n'));
      let input = '';
      owner.on('data', data => {
        input += data;
        if (input.length > 4096) { cleanup(); return; }
        while (input.includes('\n')) {
          const end = input.indexOf('\n'), line = input.slice(0, end); input = input.slice(end + 1);
          if (line === nonce) cleanup();
          else if (line.startsWith(nonce + ':ping:')) owner.write(JSON.stringify({nonce,event:'alive',challenge:line.slice(nonce.length+6),alive:child.exitCode===null&&child.signalCode===null})+'\n');
          else cleanup();
        }
      });
      owner.on('end', cleanup); owner.on('error', cleanup);
    `,
    )
    writeFileSync(
      worker,
      `
      import { spawn } from 'node:child_process';
      const controller = spawn(process.execPath, [${JSON.stringify(controller)}], { detached: true, stdio: ${closedStdio ? "'ignore'" : "'inherit'"} });
      controller.unref(); setTimeout(() => process.exit(0), 200);
    `,
    )
    const handle = {
      worker,
      ready: timeout(ready, Date.now() + 4000),
      done,
      async alive() {
        const challenge = randomUUID()
        const answer = new Promise((resolve) => pending.set(challenge, resolve))
        for (const socket of connections) socket.write(nonce + ':ping:' + challenge + '\n')
        return timeout(answer, Date.now() + 1000)
      },
      async cleanup(deadline) {
        for (const socket of connections) socket.write(nonce + '\n')
        const result = await timeout(done, deadline)
        for (const socket of connections) socket.destroy()
        await timeout(new Promise((resolve) => server.close(resolve)), deadline)
        return result
      },
    }
    controllers.add(handle)
    return handle
  }
  async function cleanup() {
    if (cleaning) return cleaning
    cleaning = (async () => {
      const deadline = Date.now() + 2000
      const results = await Promise.allSettled(
        [...controllers].map((controller) => controller.cleanup(deadline)),
      )
      results.push(
        ...(await Promise.allSettled([...owned.keys()].map((child) => stop(child, deadline)))),
      )
      const failures = results.filter((result) => result.status === 'rejected')
      if (failures.length)
        throw new AggregateError(
          failures.map((result) => result.reason),
          'Unknown or unsettled test process ownership',
        )
      owned.clear()
      controllers.clear()
      for (const path of temporary.splice(0)) {
        const publication = publications.get(path)
        if (publication) {
          for (const socket of publication.connections) socket.end()
          await timeout(new Promise((resolve) => publication.server.close(resolve)), deadline)
        }
        publications.delete(path)
        rmSync(path, { recursive: true, force: true })
      }
      return results.map((result) => result.value)
    })().finally(() => {
      cleaning = null
    })
    return cleaning
  }
  const descendants = {
    push() {
      throw new Error(
        'Numeric PID records do not establish process ownership; retain a child handle/controller',
      )
    },
  }
  return {
    temporary,
    spawn: ownSpawn,
    stop,
    escape,
    cleanup,
    descendants,
    isLive(child) {
      const lease = requireOwned(child)
      return live(lease.controller) && !lease.nativeExited && lease.nativePid !== null
    },
  }
}
