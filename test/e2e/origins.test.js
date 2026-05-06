import provider from 'eth-provider'

jest.mock('../../main/store/persist')

let lightpay

beforeEach((done) => {
  lightpay = provider('lightpay', { origin: 'frame.test' })
  lightpay.once('connect', () => {
    lightpay.request({ method: 'eth_accounts', params: [] }).then(() => done())
  })
})

afterEach(() => {
  lightpay.removeAllListeners('chainChanged')
  lightpay.close()
})

it(
  'should be able to change the chain for a given origin',
  async () => {
    const [chains, currentChainId] = await Promise.all([
      lightpay.request({ method: 'wallet_getEthereumChains' }),
      lightpay.request({ method: 'eth_chainId' })
    ])

    const targetChain = chains.find((c) => c.chainId !== parseInt(currentChainId))

    if (!targetChain) throw new Error('no available chains to switch to!')

    return new Promise((resolve, reject) => {
      lightpay.on('chainChanged', async (updatedChainId) => {
        try {
          expect(parseInt(updatedChainId)).toBe(targetChain.chainId)

          const chainId = await lightpay.request({ method: 'eth_chainId' })
          expect(parseInt(chainId)).toBe(targetChain.chainId)
          resolve()
        } catch (e) {
          reject(e)
        }
      })

      lightpay.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: targetChain.chainId }]
      })
    })
  },
  5 * 1000
)
