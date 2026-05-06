// LightPay RPC Method Registry — maps method names to handler categories

export type MethodCategory = 'account' | 'chain' | 'signature' | 'transaction' | 'wallet' | 'internal' | 'debug'

const METHOD_CATEGORIES: Record<string, MethodCategory> = {
  eth_accounts: 'account',
  eth_requestAccounts: 'account',
  eth_coinbase: 'account',
  eth_sendTransaction: 'transaction',
  eth_signTransaction: 'transaction',
  eth_sign: 'signature',
  personal_sign: 'signature',
  eth_signTypedData: 'signature',
  eth_signTypedData_v3: 'signature',
  eth_signTypedData_v4: 'signature',
  eth_chainId: 'chain',
  eth_blockNumber: 'chain',
  net_version: 'chain',
  wallet_addEthereumChain: 'wallet',
  wallet_switchEthereumChain: 'wallet',
  wallet_getPermissions: 'wallet',
  wallet_requestPermissions: 'wallet',
  lightpay_summon: 'internal',
  lightpay_dismiss: 'internal',
}

export function getMethodCategory(method: string): MethodCategory {
  return METHOD_CATEGORIES[method] || 'internal'
}

export function isAccountMethod(method: string): boolean {
  return getMethodCategory(method) === 'account'
}

export function isTransactionMethod(method: string): boolean {
  return getMethodCategory(method) === 'transaction'
}

export function isSignatureMethod(method: string): boolean {
  return getMethodCategory(method) === 'signature'
}

export function getAllMethodsInCategory(category: MethodCategory): string[] {
  return Object.entries(METHOD_CATEGORIES)
    .filter(([, cat]) => cat === category)
    .map(([method]) => method)
}
