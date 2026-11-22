import { rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export function writeScannerWorker(directory) {
  const worker = join(directory, 'worker.mjs')
  writeFileSync(
    worker,
    `
    import { spawn } from 'node:child_process';
    import { existsSync, readFileSync, writeFileSync } from 'node:fs';
    const [depth, directory, detached] = process.argv.slice(2);
    writeFileSync(directory + '/' + depth + '.pid', String(process.pid));
    if (Number(depth) < 2) spawn(process.execPath, [${JSON.stringify(worker)}, String(Number(depth) + 1), directory, detached], { stdio: 'inherit', detached: detached === 'yes' });
    for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(signal, () => {});
    setInterval(() => {
      if (depth !== '0' || !existsSync(directory + '/finish')) return;
      const value = readFileSync(directory + '/finish', 'utf8');
      if (value === 'signal') process.kill(process.pid, 'SIGUSR2');
      else { console.log('scanner completion control'); process.exit(Number(value)); }
    }, 20);
  `,
  )
  return worker
}

export function scannerTestResources() {
  const temporary = [],
    owned = [],
    descendants = []
  function kill(pid) {
    try {
      process.kill(pid, 'SIGKILL')
    } catch (error) {
      if (error.code !== 'ESRCH') throw error
    }
  }
  function cleanup() {
    for (const pid of descendants.splice(0)) kill(pid)
    for (const child of owned.splice(0)) kill(-child.pid)
    for (const path of temporary.splice(0)) rmSync(path, { recursive: true, force: true })
  }
  return { temporary, owned, descendants, cleanup }
}
