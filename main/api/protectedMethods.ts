// Methods that require explicit user interaction or wallet access.
// Requests matching these method names are gated through the approval flow
// rather than being forwarded directly to the connected node.

// Named string constants for each protected method
const METHOD_ETH_ACCOUNTS = 'eth_accounts'
const METHOD_ETH_COINBASE = 'eth_coinbase'
const METHOD_ETH_REQUEST_ACCOUNTS = 'eth_requestAccounts'
const METHOD_ETH_SEND_RAW_TRANSACTION = 'eth_sendRawTransaction'
const METHOD_ETH_SEND_TRANSACTION = 'eth_sendTransaction'
const METHOD_ETH_SIGN = 'eth_sign'
const METHOD_ETH_SIGN_TYPED_DATA = 'eth_signTypedData'
const METHOD_ETH_SIGN_TYPED_DATA_V1 = 'eth_signTypedData_v1'
const METHOD_ETH_SIGN_TYPED_DATA_V3 = 'eth_signTypedData_v3'
const METHOD_ETH_SIGN_TYPED_DATA_V4 = 'eth_signTypedData_v4'
const METHOD_PERSONAL_EC_RECOVER = 'personal_ecRecover'
const METHOD_PERSONAL_SIGN = 'personal_sign'
const METHOD_WALLET_ADD_ETHEREUM_CHAIN = 'wallet_addEthereumChain'
const METHOD_WALLET_GET_ASSETS = 'wallet_getAssets'
const METHOD_WALLET_GET_ETHEREUM_CHAINS = 'wallet_getEthereumChains'
const METHOD_WALLET_WATCH_ASSET = 'wallet_watchAsset'

/** Account-read methods that expose the user's addresses */
const accountMethods = [
  METHOD_ETH_ACCOUNTS,
  METHOD_ETH_COINBASE,
  METHOD_ETH_REQUEST_ACCOUNTS
] as const

/** Methods that broadcast or sign transactions on behalf of the user */
const transactionMethods = [
  METHOD_ETH_SEND_RAW_TRANSACTION,
  METHOD_ETH_SEND_TRANSACTION
] as const

/** Personal and typed-data signature methods */
const signatureMethods = [
  METHOD_ETH_SIGN,
  METHOD_ETH_SIGN_TYPED_DATA,
  METHOD_ETH_SIGN_TYPED_DATA_V1,
  METHOD_ETH_SIGN_TYPED_DATA_V3,
  METHOD_ETH_SIGN_TYPED_DATA_V4,
  METHOD_PERSONAL_EC_RECOVER,
  METHOD_PERSONAL_SIGN
] as const

/** Wallet-namespace methods for chain and asset management */
const walletMethods = [
  METHOD_WALLET_ADD_ETHEREUM_CHAIN,
  METHOD_WALLET_GET_ASSETS,
  METHOD_WALLET_GET_ETHEREUM_CHAINS,
  METHOD_WALLET_WATCH_ASSET
] as const

const protectedMethods: string[] = [
  ...accountMethods,
  ...transactionMethods,
  ...signatureMethods,
  ...walletMethods
]

export default protectedMethods
