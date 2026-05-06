export enum ApprovalType {
  OtherChainApproval = 'approveOtherChain',
  GasLimitApproval = 'approveGasLimit'
}

const NETWORK_PRESETS = {
  ethereum: {
    default: {
      local: 'direct'
    },
    1: {
      pylon: 'wss://ethereum.publicnode.com'
    },
    10: {
      pylon: 'wss://optimism.publicnode.com'
    },
    137: {
      pylon: 'wss://polygon-bor-rpc.publicnode.com'
    },
    8453: {
      pylon: 'wss://base-rpc.publicnode.com'
    },
    42161: {
      pylon: 'wss://arbitrum-one-rpc.publicnode.com'
    },
    84532: {
      pylon: 'wss://base-sepolia-rpc.publicnode.com'
    },
    11155111: {
      pylon: 'wss://ethereum-sepolia-rpc.publicnode.com'
    },
    11155420: {
      pylon: 'wss://optimism-sepolia-rpc.publicnode.com'
    }
  }
}

const ADDRESS_DISPLAY_CHARS = 8
const NATIVE_CURRENCY = '0x0000000000000000000000000000000000000000'
const MAX_HEX = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'

export { NETWORK_PRESETS, ADDRESS_DISPLAY_CHARS, NATIVE_CURRENCY, MAX_HEX }
