import { EventEmitter } from 'stream'
import Signer from './Signer'

/**
 * Validates that a signer adapter has the required structure and type string.
 * Throws if the adapter is missing required fields.
 */
export function validateSignerAdapter(adapter: SignerAdapter): void {
  if (!adapter) {
    throw new Error('SignerAdapter: adapter instance is required')
  }
  if (typeof adapter.adapterType !== 'string' || !adapter.adapterType) {
    throw new Error('SignerAdapter: adapterType must be a non-empty string')
  }
  if (typeof adapter.open !== 'function') {
    throw new Error(`SignerAdapter [${adapter.adapterType}]: open() method is required`)
  }
  if (typeof adapter.close !== 'function') {
    throw new Error(`SignerAdapter [${adapter.adapterType}]: close() method is required`)
  }
}

/**
 * Returns a brief description object for a given adapter, useful for
 * diagnostics and logging without exposing internal state.
 */
export function describeAdapter(adapter: SignerAdapter): { type: string; listenerCount: number } {
  return {
    type: adapter.adapterType,
    listenerCount: adapter.listenerCount('update')
  }
}

export class SignerAdapter extends EventEmitter {
  adapterType: string

  constructor(type: string) {
    super()

    this.adapterType = type
  }

  open() {}
  close() {}
  remove(signer: Signer) {}
  reload(signer: Signer) {}
}
