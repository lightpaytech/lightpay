// ENS contract deployment addresses used by LightPay.
//
// Addresses are keyed by EIP-155 chain ID (integer).  The value is the
// checksummed address of the ENS Registry on that network.
//
// IMPORTANT: Do NOT change these addresses — they are factual on-chain data.
// The ENS registry is an immutable singleton on each network; using the wrong
// address will silently break all name-resolution lookups.

// ---------------------------------------------------------------------------
// Section 1 — Mainnet deployments
// ---------------------------------------------------------------------------

/** @type {Record<number, string>} */
const mainnetAddresses = {
  // Ethereum Mainnet (chain ID 1)
  // Deployed at the well-known ENS registry address (EIP-137 compliant).
  1: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e'
}

// ---------------------------------------------------------------------------
// Section 2 — Testnet deployments
// (Add testnet chain IDs here as LightPay gains test-network support.)
// ---------------------------------------------------------------------------

/** @type {Record<number, string>} */
const testnetAddresses = {
  // No testnet addresses registered yet.
}

// ---------------------------------------------------------------------------
// Combined address map (mainnet first, then testnets)
// ---------------------------------------------------------------------------

/** @type {Record<number, string>} */
const allAddresses = {
  ...mainnetAddresses,
  ...testnetAddresses
}

// ---------------------------------------------------------------------------
// Public helpers
// ---------------------------------------------------------------------------

/**
 * Return the ENS Registry address for the given network (chain ID).
 *
 * @param {number|string} network - An EIP-155 chain ID (e.g. 1 for Ethereum Mainnet).
 * @returns {string|undefined} The checksummed registry address, or undefined if the
 *   network is not yet supported.
 */
function getAddressByNetwork(network) {
  return allAddresses[Number(network)]
}

/**
 * Return the list of supported network chain IDs as strings.
 *
 * The IDs are sorted numerically (ascending) so that mainnet always appears
 * first, followed by higher-numbered testnets.
 *
 * @returns {string[]} Sorted array of chain ID strings (e.g. ["1"]).
 */
function getNetworkNames() {
  return Object.keys(allAddresses).sort((a, b) => Number(a) - Number(b))
}

// ---------------------------------------------------------------------------
// Module exports
// ---------------------------------------------------------------------------

module.exports = {
  ...allAddresses,
  getAddressByNetwork,
  getNetworkNames
}
