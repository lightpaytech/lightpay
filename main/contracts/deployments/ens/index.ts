import { BigNumber } from 'ethers'
import { Fragment, Interface } from 'ethers/lib/utils'

import { registrar as registrarAbi, registrarController as registrarControllerAbi } from './abi'
import store from '../../../store'

import type {
  ApproveAction as EnsApprovalAction,
  TransferAction as EnsTransferAction,
  RegisterAction as EnsRegistrationAction,
  RenewAction as EnsRenewalAction
} from '../../../transaction/actions/ens'

import type { JsonFragment } from '@ethersproject/abi'
import type { DecodableContract } from '../../../transaction/actions'

// Named constants
const DEFAULT_REGISTRAR_NAME = 'ENS Registrar'
const DEFAULT_REGISTRAR_CONTROLLER_NAME = 'ENS Registrar Controller'
const MAINNET_REGISTRAR_NAME = '.eth Permanent Registrar'
const MAINNET_REGISTRAR_ADDRESS = '0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85'
const MAINNET_REGISTRAR_CONTROLLER_NAME = 'ETHRegistrarController'
const MAINNET_REGISTRAR_CONTROLLER_ADDRESS = '0x283Af0B28c62C092C9727F1Ee09c02CA627EB7F5'
const MAINNET_CHAIN_ID = 1
const ETH_DOMAIN_SUFFIX = '.eth'
const STORE_ENS_INVENTORY_PATH = 'main.inventory'
const STORE_ENS_INVENTORY_KEY = 'ens'
const TRANSFER_METHODS = ['transferfrom', 'safetransferfrom']
const APPROVE_METHOD = 'approve'
const COMMIT_METHOD = 'commit'
const REGISTER_METHODS = ['register', 'registerwithconfig']
const RENEW_METHOD = 'renew'

// TODO: fix typing on contract types
type EnsContract = DecodableContract<unknown>

declare module ENS {
  export type Register = {
    name: string
    owner: string
    duration: BigNumber // seconds
    resolver?: string
  }

  export type Renew = {
    name: string
    duration: BigNumber // seconds
  }

  export type Transfer = {
    from: string
    to: string
    tokenId: BigNumber
  }

  export type Approval = {
    to: string
    tokenId: BigNumber
  }
}

type DeploymentLocation = {
  name?: string
  address: Address
  chainId: number
}

function decode(abi: ReadonlyArray<Fragment | JsonFragment | string>, calldata: string) {
  const contractApi = new Interface(abi)
  return contractApi.parseTransaction({ data: calldata })
}

function getNameForTokenId(account: string, tokenId: string) {
  const ensInventory: InventoryCollection = store(STORE_ENS_INVENTORY_PATH, account, STORE_ENS_INVENTORY_KEY) || {}
  const items = ensInventory.items || {}

  const record = Object.values(items).find((ens) => ens.tokenId === tokenId) || { name: '' }

  return record.name
}

function ethName(name: string) {
  // assumes all names will be registered in the .eth domain, in the future this may not be the case
  return name.includes(ETH_DOMAIN_SUFFIX) ? name : `${name}${ETH_DOMAIN_SUFFIX}`
}

const registrar = ({ name = DEFAULT_REGISTRAR_NAME, address, chainId }: DeploymentLocation): EnsContract => {
  return {
    name,
    chainId,
    address,
    decode: (calldata: string, { account } = {}) => {
      const { name, args } = decode(registrarAbi, calldata)

      if (TRANSFER_METHODS.includes(name.toLowerCase())) {
        const { from, to, tokenId } = args as unknown as ENS.Transfer
        const token = tokenId.toString()
        const name = (account && getNameForTokenId(account, token)) || ''

        return {
          id: 'ens:transfer',
          data: {
            name: name,
            from,
            to,
            tokenId: token
          }
        } as EnsTransferAction
      }

      if (name === APPROVE_METHOD) {
        const { to, tokenId } = args as unknown as ENS.Approval
        const token = tokenId.toString()
        const name = (account && getNameForTokenId(account, token)) || ''

        return {
          id: 'ens:approve',
          data: { name, operator: to, tokenId: token }
        } as EnsApprovalAction
      }
    }
  }
}

const registarController = ({
  name = DEFAULT_REGISTRAR_CONTROLLER_NAME,
  address,
  chainId
}: DeploymentLocation): EnsContract => {
  return {
    name,
    chainId,
    address,
    decode: (calldata: string) => {
      const { name, args } = decode(registrarControllerAbi, calldata)

      if (name === COMMIT_METHOD) {
        return {
          id: 'ens:commit'
        }
      }

      if (REGISTER_METHODS.includes(name.toLowerCase())) {
        const { owner, name, duration } = args as unknown as ENS.Register

        return {
          id: 'ens:register',
          data: { address: owner, name: ethName(name), duration: duration.toNumber() }
        } as EnsRegistrationAction
      }

      if (name === RENEW_METHOD) {
        const { name, duration } = args as unknown as ENS.Renew

        return {
          id: 'ens:renew',
          data: { name: ethName(name), duration: duration.toNumber() }
        } as EnsRenewalAction
      }
    }
  }
}

const mainnetRegistrar = registrar({
  name: MAINNET_REGISTRAR_NAME,
  address: MAINNET_REGISTRAR_ADDRESS,
  chainId: MAINNET_CHAIN_ID
})

const mainnetRegistrarController = registarController({
  name: MAINNET_REGISTRAR_CONTROLLER_NAME,
  address: MAINNET_REGISTRAR_CONTROLLER_ADDRESS,
  chainId: MAINNET_CHAIN_ID
})

// TODO: in the future the addresses for these contracts can be discovered in real time
export default [mainnetRegistrar, mainnetRegistrarController]
