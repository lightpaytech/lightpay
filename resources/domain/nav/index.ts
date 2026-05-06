import Signer from '../../../main/signers/Signer'
import type { Breadcrumb } from '../../../main/windows/nav/breadcrumb'

// ─── Breadcrumb factories ─────────────────────────────────────────────────────

/**
 * Build a breadcrumb that navigates to the expanded signer panel for the
 * given signer.
 *
 * @param signer - Signer whose panel should be displayed
 */
export function signerPanelCrumb({ id }: Signer): Breadcrumb {
  return { view: 'expandedSigner', data: { signer: id } }
}

/**
 * Build a breadcrumb that navigates back to the accounts list panel.
 */
export function accountPanelCrumb(): Breadcrumb {
  return { view: 'accounts', data: {} }
}

// ─── Navigation helpers ───────────────────────────────────────────────────────

/**
 * Build an arbitrary breadcrumb given a view name and optional data payload.
 * Use this for one-off navigation targets that don't warrant their own factory.
 *
 * @param view - Name of the view to navigate to
 * @param data - Optional data payload passed to the view
 */
export function makeCrumb(view: string, data: Record<string, unknown> = {}): Breadcrumb {
  if (!view) throw new TypeError('makeCrumb: view must be a non-empty string')
  return { view, data }
}

/**
 * Return true when two breadcrumbs point to the same view and carry identical
 * data (shallow JSON comparison).
 *
 * @param a - First breadcrumb
 * @param b - Second breadcrumb
 */
export function isSameCrumb(a: Breadcrumb, b: Breadcrumb): boolean {
  return a.view === b.view && JSON.stringify(a.data) === JSON.stringify(b.data)
}
