import store from '../../store'

import type { Permission } from '../../store/state'
import type { AccessRequest } from '..'

/**
 * Manages dapp-origin permissions for a single account address.
 *
 * All reads are performed against the live store so they always reflect the
 * most recent state without requiring a local cache.  Writes go through the
 * store's `setPermission` / `removePermission` helpers so they are
 * automatically persisted and broadcast to any store observers.
 */
export class PermissionManager {
  constructor(private readonly address: Address) {}

  // ---------------------------------------------------------------------------
  // Query helpers
  // ---------------------------------------------------------------------------

  /**
   * Check whether the given `origin` currently has the `provider` flag set to
   * `true` for this account.
   *
   * The `method` parameter is accepted for future granular method-level access
   * control but is not yet enforced by the store schema.
   */
  hasPermission(origin: string, _method: string): boolean {
    const permissions = this.fetchPermissions()

    return Object.values(permissions).some(
      (p) =>
        (p.origin || '').toLowerCase() === origin.toLowerCase() && p.provider === true
    )
  }

  /**
   * Return every permission currently stored for this account as a flat array.
   */
  getAllPermissions(): Permission[] {
    return Object.values(this.fetchPermissions())
  }

  /**
   * Return the raw permissions record keyed by `handlerId`.
   */
  getRawPermissions(): Record<string, Permission> {
    return this.fetchPermissions()
  }

  // ---------------------------------------------------------------------------
  // Mutation helpers
  // ---------------------------------------------------------------------------

  /**
   * Process an inbound access request: write the new permission to the store and
   * resolve the request.  The `resolveRequest` callback is supplied by the
   * Account so the manager stays decoupled from request-lifecycle logic.
   */
  setAccess(
    req: AccessRequest,
    access: boolean,
    resolveRequest: (req: AccessRequest) => void
  ) {
    const { handlerId, origin, account } = req

    if (account.toLowerCase() === this.address) {
      const { name } = store('main.origins', origin)
      store.setPermission(this.address, { handlerId, origin: name, provider: access })
    }

    resolveRequest(req)
  }

  /**
   * Grant provider access to the built-in Send dapp if no permission entry for
   * that origin exists yet.  Called once during account initialisation.
   */
  ensureSendDappPermission() {
    const existing = this.fetchPermissions()
    const alreadyGranted = Object.values(existing).some((p) =>
      (p.origin || '').toLowerCase().includes('send.lightpay.tech')
    )

    if (!alreadyGranted) {
      store.setPermission(this.address, {
        handlerId: 'send-dapp-native',
        origin: 'send.lightpay.tech',
        provider: true
      })
    }
  }

  /**
   * Revoke every permission currently held by this account.  This is
   * irreversible — callers should confirm intent before invoking.
   */
  revokeAllPermissions(): void {
    const current = this.fetchPermissions()

    Object.keys(current).forEach((handlerId) => {
      store.removePermission(this.address, handlerId)
    })
  }

  /**
   * Remove a single permission entry by its `handlerId`.
   */
  revokePermission(handlerId: string): void {
    store.removePermission(this.address, handlerId)
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private fetchPermissions(): Record<string, Permission> {
    return (store('main.permissions', this.address) || {}) as Record<string, Permission>
  }
}
