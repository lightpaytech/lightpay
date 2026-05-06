import { MessageTypeProperty } from '@metamask/eth-sig-util'

// Named constants
const PERMIT_TYPE_NAME = 'Permit'
const DOMAIN_FILTER_EIP2612 = ['chainId', 'verifyingContract']
const SIGNATURE_KEY_ERC20_PERMIT = 'signErc20Permit'

interface LabelledSignatureType {
  domainFilter: string[]
  types: { [key: string]: MessageTypeProperty[] }
}

// EIP-2612 permit fields
const eip2612PermitFields: MessageTypeProperty[] = [
  { name: 'owner', type: 'address' },
  { name: 'spender', type: 'address' },
  { name: 'value', type: 'uint256' },
  { name: 'nonce', type: 'uint256' },
  { name: 'deadline', type: 'uint256' }
]

const eip2612Permit: LabelledSignatureType = {
  types: {
    [PERMIT_TYPE_NAME]: eip2612PermitFields
  },
  domainFilter: DOMAIN_FILTER_EIP2612
}

const signatureTypes: { [key: string]: LabelledSignatureType } = {
  [SIGNATURE_KEY_ERC20_PERMIT]: eip2612Permit
}

export default signatureTypes
