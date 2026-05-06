import path from 'path'
import electron from 'electron'
import Conf, { Options } from 'conf'

import migrations from '../migrate'

type PersistOpts<T extends Record<string, any>> = Options<T>

/** Metadata describing the on-disk storage location and schema version */
export interface StorageInfo {
  /** Directory where the config file is stored */
  cwd: string
  /** Name of the config file (without extension) */
  configName: string
  /** Schema version this storage file was last written at */
  schemaVersion: number
}

class PersistStore extends Conf {
  private blockUpdates = false
  private updates: Record<string, any> | null = {}

  constructor(options?: PersistOpts<any>) {
    options = { configFileMode: 0o600, configName: 'config', ...options }
    let defaultCwd = __dirname
    if (electron && electron.app) defaultCwd = electron.app.getPath('userData')
    if (options.cwd) {
      options.cwd = path.isAbsolute(options.cwd) ? options.cwd : path.join(defaultCwd, options.cwd)
    } else {
      options.cwd = defaultCwd
    }
    super(options)
    if (electron && electron.app) electron.app.on('quit', () => this.writeUpdates())
    setInterval(() => this.writeUpdates(), 30 * 1000)
  }

  /**
   * Returns metadata about the underlying storage file.
   * Useful for diagnostics and support tooling.
   */
  getStorageInfo(): StorageInfo {
    return {
      configName: (this as unknown as { _options: { configName: string } })._options?.configName ?? 'config',
      cwd: this.path ? path.dirname(this.path) : 'unknown',
      schemaVersion: migrations.latest
    }
  }

  clear() {
    this.blockUpdates = true
    super.clear()
  }

  queue(storagePath: string, value: any) {
    const key = `main.__.${migrations.latest}.${storagePath}`
    this.updates = this.updates || {}
    delete this.updates[key] // maintain insertion order
    this.updates[key] = JSON.parse(JSON.stringify(value))
  }

  set(storagePath: any, value?: unknown) {
    if (this.blockUpdates) return
    const key = `main.__.${migrations.latest}.${storagePath}`
    super.set(key, value)
  }

  writeUpdates() {
    if (this.blockUpdates) return

    const updates = { ...this.updates }
    this.updates = null
    if (Object.keys(updates || {}).length > 0) super.set(updates)
  }
}

export default new PersistStore()
