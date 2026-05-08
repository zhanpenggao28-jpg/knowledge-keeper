import { ChildProcess, spawn } from 'child_process'
import path from 'path'
import http from 'http'

export class SidecarManager {
  private process: ChildProcess | null = null
  private port: number = 0
  private backendDir: string
  private storagePath: string
  private status: 'stopped' | 'starting' | 'running' | 'error' = 'stopped'
  private restartCount = 0
  private maxRestarts = 3

  constructor(backendDir: string, storagePath: string) {
    this.backendDir = backendDir
    this.storagePath = storagePath
  }

  getPort(): number {
    return this.port
  }

  getStatus(): string {
    return this.status
  }

  async start(): Promise<void> {
    if (this.status === 'running' || this.status === 'starting') return

    this.status = 'starting'
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3'

    this.process = spawn(pythonCmd, ['-m', 'uvicorn', 'main:app', '--host', '127.0.0.1', '--port', '0'], {
      cwd: this.backendDir,
      env: { ...process.env, PYTHONUNBUFFERED: '1', KK_DATA_DIR: this.storagePath },
      stdio: ['pipe', 'pipe', 'pipe']
    })

    this.port = await this.readPortFromStdout()

    await this.waitForHealth()

    this.status = 'running'
    this.restartCount = 0
  }

  private readPortFromStdout(): Promise<number> {
    return new Promise((resolve, reject) => {
      if (!this.process || !this.process.stdout) {
        reject(new Error('Process not started'))
        return
      }

      const timeout = setTimeout(() => reject(new Error('Timeout waiting for port')), 30000)

      this.process.stdout.on('data', (data: Buffer) => {
        const output = data.toString()
        const match = output.match(/Uvicorn running on http:\/\/127\.0\.0\.1:(\d+)/)
        if (match) {
          clearTimeout(timeout)
          resolve(parseInt(match[1], 10))
        }
      })

      this.process.stderr?.on('data', (data: Buffer) => {
        const output = data.toString()
        const match = output.match(/Uvicorn running on http:\/\/127\.0\.0\.1:(\d+)/)
        if (match) {
          clearTimeout(timeout)
          resolve(parseInt(match[1], 10))
        }
      })
    })
  }

  private waitForHealth(): Promise<void> {
    return new Promise((resolve, reject) => {
      const maxAttempts = 30
      let attempts = 0

      const check = () => {
        if (attempts >= maxAttempts) {
          reject(new Error('Sidecar health check failed'))
          return
        }
        attempts++

        const req = http.get(`http://127.0.0.1:${this.port}/health`, (res) => {
          if (res.statusCode === 200) {
            resolve()
          } else {
            setTimeout(check, 500)
          }
        })
        req.on('error', () => setTimeout(check, 200))
        req.setTimeout(2000, () => {
          req.destroy()
          setTimeout(check, 200)
        })
      }

      check()
    })
  }

  async stop(): Promise<void> {
    if (this.process) {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', String(this.process.pid), '/f', '/t'])
      } else {
        this.process.kill('SIGTERM')
      }
      this.process = null
    }
    this.status = 'stopped'
    this.port = 0
  }

  async restart(): Promise<void> {
    await this.stop()
    if (this.restartCount < this.maxRestarts) {
      this.restartCount++
      await this.start()
    } else {
      this.status = 'error'
    }
  }
}
