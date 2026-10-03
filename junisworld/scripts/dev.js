// Starts API server and Vite dev server together.
import { spawn } from 'node:child_process'

const procs = [
  spawn('npm', ['run', 'dev:server'], { stdio: 'inherit', shell: process.platform === 'win32' }),
  spawn('npm', ['run', 'dev:client'], { stdio: 'inherit', shell: process.platform === 'win32' }),
]
const stop = () => procs.forEach((p) => p.kill())
process.on('SIGINT', stop)
process.on('SIGTERM', stop)
procs.forEach((p) => p.on('exit', (code) => { if (code) stop() }))
