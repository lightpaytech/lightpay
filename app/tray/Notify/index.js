import React from 'react'
import Restore from 'react-restore'
import BigNumber from 'bignumber.js'

import svg from '../../../resources/svg'
import link from '../../../resources/link'
import { usesBaseFee } from '../../../resources/domain/transaction'
import { capitalize } from '../../../resources/utils'
import lightPayIcon from '../../../asset/LightPayIcon.png'
import ExtensionConnectNotification from './ExtensionConnect'

const FEE_WARNING_THRESHOLD_USD = 50

class Notify extends React.Component {
  mainnet() {
    return (
      <div className='alertWrap' onMouseDown={(e) => e.stopPropagation()}>
        <div className='alertBox'>
          <div className='alertAppLogo'>
            <img src={lightPayIcon} />
          </div>
          <div className='alertTitle'>Welcome to LightPay!</div>
          <div className='alertSubtitle'>System-wide web3</div>
          <div className='alertBody'>
            <div className='alertBodyLine'>
              Please read{' '}
              <span
                onMouseDown={() => {
                  link.send('tray:openExternal', 'https://github.com/lightpay-labs/lightpay/blob/master/LICENSE')
                }}
              >
                our license
              </span>
              , use at your own risk and verify transactions and account details on a signing device whenever
              possible.
            </div>
          </div>
          <div className='alertActions'>
            <div
              className='alertActionBtn alertActionSingle'
              onMouseDown={() => {
                link.send('tray:action', 'muteWelcomeWarning')
                this.store.notify()
              }}
            >
              <div className='alertActionBtnText'>Let&apos;s go!</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  betaDisclosure() {
    return (
      <div className='alertWrap' onMouseDown={(e) => e.stopPropagation()}>
        <div className='alertBoxSlide'>
          <div className='alertBox'>
            <div className='alertAppLogo'>
              <img src={lightPayIcon} />
            </div>
            <div className='alertTitle'>LightPay v0.5</div>
            <div className='alertBody'>
              <div className='alertBodyBlock'>
                <div className='alertSection'>Use hardware signers for high value accounts</div>
                <div className='alertSection'>
                  <span>Read</span>
                  <span
                    className='alertLink'
                    onMouseDown={() => {
                      link.send('tray:openExternal', 'https://github.com/lightpay-labs/lightpay/blob/master/LICENSE')
                    }}
                  >
                    our license
                  </span>
                  <span>and use LightPay at your own risk</span>
                </div>
                <div className='alertSection'>
                  <span>Please give us your feedback! </span>
                  <span
                    className='alertLink'
                    onMouseDown={() => {
                      link.send('tray:openExternal', 'https://lightpay.canny.io')
                    }}
                  >
                    feedback.lightpay.tech
                  </span>
                </div>
              </div>
            </div>
            <div className='alertActions'>
              <div
                className='alertActionBtn alertActionSingle'
                onMouseDown={() => {
                  link.send('tray:action', 'muteBetaDisclosure')
                  this.store.notify()
                }}
              >
                <div className='alertActionBtnText alertGoBtn'>Let&apos;s go!</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  gasFeeWarning({ req = {}, feeUSD = '0.00', currentSymbol = 'ETH' }) {
    return (
      <div className='alertWrap' onMouseDown={(e) => e.stopPropagation()}>
        <div className='alertBox'>
          <div className='alertTitle'>Gas Fee Warning</div>
          <div className='alertBody'>
            {feeUSD !== '0.00' ? (
              <>
                <div className='alertBodyLine'>The max fee for this transaction is:</div>
                <div className='alertBodyLine alertBodyPrice'>{`≈ $${feeUSD} in ${currentSymbol}`}</div>
              </>
            ) : (
              <div className='alertBodyLine'>
                We were unable to determine this transaction&apos;s fee in USD.
              </div>
            )}
            <div className='alertBodyQuestion'>Are you sure you want to proceed?</div>
          </div>
          <div className='alertActions'>
            <div
              className='alertActionBtn alertActionDeny'
              onMouseDown={() => {
                this.store.notify()
              }}
            >
              <div className='alertActionBtnText'>Cancel</div>
            </div>
            <div
              className='alertActionBtn alertActionProceed'
              onMouseDown={() => {
                link.rpc('approveRequest', req, () => {})
                this.store.notify()
              }}
            >
              <div className='alertActionBtnText'>Proceed</div>
            </div>
          </div>
          <div className='alertCheckRow' onMouseDown={() => link.send('tray:action', 'toggleGasFeeWarning')}>
            <div className='alertCheckbox'>
              {this.store('main.mute.gasFeeWarning') ? svg.octicon('check', { height: 26 }) : null}
            </div>
            <div className='alertCheckLabel'>{"Don't show this warning again"}</div>
          </div>
        </div>
      </div>
    )
  }

  signerUnavailableWarning() {
    return (
      <div className='alertWrap' onMouseDown={(e) => e.stopPropagation()}>
        <div className='alertBox'>
          <div className='alertTitle'>Signer unavailable for signing!</div>
          <div className='alertBody'>
            <div className='alertBodyQuestion'>Please check the signer for this account and try again</div>
          </div>
          <div className='alertActions'>
            <div
              className='alertActionBtn alertActionSingle'
              onMouseDown={() => {
                this.store.notify()
              }}
            >
              <div className='alertActionBtnText'>OK</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  noSignerWarning() {
    return (
      <div className='alertWrap' onMouseDown={(e) => e.stopPropagation()}>
        <div className='alertBox'>
          <div className='alertTitle'>No Signer Attached!</div>
          <div className='alertBody'>
            <div className='alertBodyLine'>No signer attached for this account</div>
            <div className='alertBodyQuestion'>Please attach a signer that can sign for this account</div>
          </div>
          <div className='alertActions'>
            <div
              className='alertActionBtn alertActionSingle'
              onMouseDown={() => {
                this.store.notify()
              }}
            >
              <div className='alertActionBtnText'>OK</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  toDisplayUSD(bn) {
    return bn.toFixed(2, BigNumber.ROUND_UP).toString()
  }

  signerCompatibilityWarning({ req = {}, compatibility = {}, chain = {} }) {
    const { signer, tx } = compatibility

    return (
      <div className='alertWrap' onMouseDown={(e) => e.stopPropagation()}>
        <div className='alertBox'>
          <div className='alertTitle'>Signer Compatibility</div>
          <div className='alertBody'>
            <div className='alertBodyLine'>
              {`Your ${capitalize(signer)} is not compatible with ${capitalize(tx)} ${
                tx === 'london' ? '(EIP-1559) ' : ''
              }transactions. Your transaction will be converted to a legacy transaction before signing.`}
            </div>
            {['lattice', 'ledger'].includes(signer) ? (
              <div className='alertBodyUpdate'>
                {`Update your ${capitalize(signer)} to enable compatibility`}
              </div>
            ) : null}
            <div className='alertBodyQuestion'>Do you want to proceed?</div>
          </div>
          <div className='alertActions'>
            <div
              className='alertActionBtn alertActionDeny'
              onMouseDown={() => {
                this.store.notify()
              }}
            >
              <div className='alertActionBtnText'>Cancel</div>
            </div>
            <div
              className='alertActionBtn alertActionProceed'
              onMouseDown={() => {
                // TODO: Transacionns need a better flow to respond to mutiple notifications after hitting sign
                const isTestnet = this.store('main.networks', chain.type, chain.id, 'isTestnet')
                const {
                  nativeCurrency,
                  nativeCurrency: { symbol: currentSymbol = '?' }
                } = this.store('main.networksMeta', chain.type, chain.id)
                const nativeUSD =
                  nativeCurrency && nativeCurrency.usd && !isTestnet ? nativeCurrency.usd.price : 0

                let maxFeePerGas, maxFee, maxFeeUSD

                if (usesBaseFee(req.data)) {
                  const gasLimit = BigNumber(req.data.gasLimit, 16)
                  maxFeePerGas = BigNumber(req.data.maxFeePerGas, 16)
                  maxFee = maxFeePerGas.multipliedBy(gasLimit)
                  maxFeeUSD = maxFee.shiftedBy(-18).multipliedBy(nativeUSD)
                } else {
                  const gasLimit = BigNumber(req.data.gasLimit, 16)
                  maxFeePerGas = BigNumber(req.data.gasPrice, 16)
                  maxFee = maxFeePerGas.multipliedBy(gasLimit)
                  maxFeeUSD = maxFee.shiftedBy(-18).multipliedBy(nativeUSD)
                }

                if (
                  (maxFeeUSD.toNumber() > FEE_WARNING_THRESHOLD_USD ||
                    this.toDisplayUSD(maxFeeUSD) === '0.00') &&
                  !this.store('main.mute.gasFeeWarning')
                ) {
                  this.store.notify('gasFeeWarning', {
                    req,
                    feeUSD: this.toDisplayUSD(maxFeeUSD),
                    currentSymbol
                  })
                } else {
                  link.rpc('approveRequest', req, () => {})
                  this.store.notify()
                }
              }}
            >
              <div className='alertActionBtnText'>Proceed</div>
            </div>
          </div>
          <div
            className='alertCheckRow'
            onMouseDown={() => link.send('tray:action', 'toggleSignerCompatibilityWarning')}
          >
            <div className='alertCheckbox'>
              {this.store('main.mute.signerCompatibilityWarning')
                ? svg.octicon('check', { height: 26 })
                : null}
            </div>
            <div className='alertCheckLabel'>{"Don't show this warning again"}</div>
          </div>
        </div>
      </div>
    )
  }

  contractData() {
    return (
      <div
        className='alertWrap'
        onMouseDown={(e) => e.stopPropagation()}
        style={
          this.store('view.notify') === 'contractData' ? { transform: 'translateX(calc(-100% - 100px))' } : {}
        }
      >
        <div className='alertBox'>
          <div className='alertTitle'>
            <div>Contract Data</div>
            <div>Not Allowed</div>
          </div>
          <div className='alertBody'>
            <div className='alertBodyLine'>
              Your Ledger currently doesn&apos;t allow signing of contract data.
            </div>
            <div className='alertBodyLine'>
              <span>To change this settings go to</span>
              <br />
              <span style={{ fontWeight: 'bold' }}>{'Settings > Contract Data'}</span>
              <br />
              <span>on your Ledger and select</span>
              <br />
              <span style={{ fontWeight: 'bold' }}>Yes</span>
            </div>
          </div>
          <div className='alertActions'>
            <div
              className='alertActionBtn alertActionSingle'
              onMouseDown={() => {
                this.store.notify()
              }}
            >
              <div className='alertActionBtnText'>OK</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  hotAccountWarning() {
    return (
      <div
        className='alertWrap'
        onMouseDown={(e) => e.stopPropagation()}
        style={
          this.store('view.notify') === 'hotAccountWarning'
            ? { transform: 'translateX(calc(-100% - 100px))' }
            : {}
        }
      >
        <div className='alertBox'>
          <div className='alertTitle'>
            <div>Hot Signer Alpha</div>
          </div>
          <div className='alertBody'>
            <div className='alertBodyLine'>
              LightPay hot signers are in alpha! Do not use them with high value accounts and verify your backups
              are valid. Only proceed if you understand and accept these risks.
            </div>
          </div>
          <div className='alertActions'>
            <div
              className='alertActionBtn alertActionSingle'
              onMouseDown={() => {
                this.store.notify()
              }}
            >
              <div className='alertActionBtnText'>OK</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  hotSignerMismatch() {
    return (
      <div
        className='alertWrap'
        onMouseDown={(e) => e.stopPropagation()}
        style={
          this.store('view.notify') === 'hotSignerMismatch'
            ? { transform: 'translateX(calc(-100% - 100px))' }
            : {}
        }
      >
        <div className='alertBox'>
          <div className='alertTitle'>
            <div>Hot Signer Address Mismatch</div>
          </div>
          <div className='alertBody'>
            <div className='alertBodyLine'>
              The unlocked hot signer did not match the address shown in LightPay and has been relocked.
            </div>
          </div>
          <div className='alertActions'>
            <div
              className='alertActionBtn alertActionSingle'
              onMouseDown={() => {
                this.store.notify()
              }}
            >
              <div className='alertActionBtnText'>OK</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  openExternal({ url }) {
    return (
      <div className='alertWrap' onMouseDown={(e) => e.stopPropagation()}>
        <div className='alertBox'>
          <div className='alertTitle'>Open External Link</div>
          <div className='alertBody'>
            <div className='notifyBodyLineUrl'>{url}</div>
            <div className='alertBodyLine'>{'Open Link in Browser?'}</div>
          </div>
          <div className='alertActions'>
            <div
              className='alertActionBtn alertActionDeny'
              onMouseDown={() => {
                this.store.notify()
              }}
            >
              <div className='alertActionBtnText'>Cancel</div>
            </div>
            <div
              className='alertActionBtn alertActionProceed'
              onMouseDown={() => {
                link.send('tray:openExternal', url)
                this.store.notify()
              }}
            >
              <div className='alertActionBtnText'>Proceed</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  openExplorer({ hash, chain }) {
    const { name: networkName, explorer: explorerUrl } = this.store('main.networks', chain.type, chain.id)
    return (
      <div className='alertWrap' onMouseDown={(e) => e.stopPropagation()}>
        <div className='alertBox'>
          <div className='alertTitle'>Open Block Explorer</div>
          {hash ? (
            <div className='alertBody'>
              <div className='alertBodyLine'>
                {'LightPay will open a block explorer in your browser for transaction:'}
              </div>
              <div className='alertBodyHash'>{hash}</div>
            </div>
          ) : (
            <div className='alertBody'>
              <div className='alertBodyLine'>{`LightPay will open the ${networkName}`}</div>
              <div className='alertBodyLine'>{`block explorer in your browser:`}</div>
              <div className='alertBodyHash'>{explorerUrl}</div>
            </div>
          )}

          <div className='alertActions'>
            <div
              className='alertActionBtn alertActionDeny'
              onMouseDown={() => {
                this.store.notify()
              }}
            >
              <div className='alertActionBtnText'>Cancel</div>
            </div>
            <div
              className='alertActionBtn alertActionProceed'
              onMouseDown={() => {
                link.send('tray:openExplorer', chain, hash)
                this.store.notify()
              }}
            >
              <div className='alertActionBtnText'>Proceed</div>
            </div>
          </div>
          <div
            className='alertCheckRow'
            onMouseDown={() => {
              link.send('tray:action', 'toggleExplorerWarning')
            }}
          >
            <div className='alertCheckbox'>
              {this.store('main.mute.explorerWarning') ? svg.octicon('check', { height: 26 }) : null}
            </div>
            <div className='alertCheckLabel'>{"Don't show this warning again"}</div>
          </div>
        </div>
      </div>
    )
  }

  render() {
    const notify = this.store('view.notify')

    if (notify === 'mainnet') {
      return (
        <div className='notify vaultCardShow' onMouseDown={() => this.store.notify()}>
          {/* <div className='alertCloseBtn' onMouseDown={() => this.store.notify()}>
            {'close'}
          </div> */}
          {this.mainnet()}
        </div>
      )
    } else if (notify === 'betaDisclosure') {
      return <div className='notify vaultCardShow'>{this.betaDisclosure()}</div>
    } else if (notify === 'updateOriginChain') {
      return (
        <div className='notify vaultCardShow' onMouseDown={() => this.store.notify()}>
          {/* <div className='alertCloseBtn' onMouseDown={() => this.store.notify()}>
            {'close'}
          </div> */}
          {this.updateOriginChain(this.store('view.notifyData'))}
        </div>
      )
    } else if (notify === 'gasFeeWarning') {
      return (
        <div className='notify vaultCardShow' onMouseDown={() => this.store.notify()}>
          {/* <div className='alertCloseBtn' onMouseDown={() => this.store.notify()}>
            {'close'}
          </div> */}
          {this.gasFeeWarning(this.store('view.notifyData'))}
        </div>
      )
    } else if (notify === 'noSignerWarning') {
      return (
        <div className='notify vaultCardShow' onMouseDown={() => this.store.notify()}>
          {/* <div className='alertCloseBtn' onMouseDown={() => this.store.notify()}>
            {'close'}
          </div> */}
          {this.noSignerWarning(this.store('view.notifyData'))}
        </div>
      )
    } else if (notify === 'signerUnavailableWarning') {
      return (
        <div className='notify vaultCardShow' onMouseDown={() => this.store.notify()}>
          {/* <div className='alertCloseBtn' onMouseDown={() => this.store.notify()}>
            {'close'}
          </div> */}
          {this.signerUnavailableWarning(this.store('view.notifyData'))}
        </div>
      )
    } else if (notify === 'signerCompatibilityWarning') {
      return (
        <div className='notify vaultCardShow' onMouseDown={() => this.store.notify()}>
          {/* <div className='alertCloseBtn' onMouseDown={() => this.store.notify()}>
            {'close'}
          </div> */}
          {this.signerCompatibilityWarning(this.store('view.notifyData'))}
        </div>
      )
    } else if (notify === 'contractData') {
      return (
        <div className='notify vaultCardShow' onMouseDown={() => this.store.notify()}>
          {/* <div className='alertCloseBtn' onMouseDown={() => this.store.notify()}>
            {'close'}
          </div> */}
          {this.contractData()}
        </div>
      )
    } else if (notify === 'hotAccountWarning') {
      return (
        <div className='notify vaultCardShow' onMouseDown={() => this.store.notify()}>
          {/* <div className='alertCloseBtn' onMouseDown={() => this.store.notify()}>
            {'close'}
          </div> */}
          {this.hotAccountWarning()}
        </div>
      )
    } else if (notify === 'hotSignerMismatch') {
      return (
        <div className='notify vaultCardShow' onMouseDown={() => this.store.notify()}>
          {/* <div className='alertCloseBtn' onMouseDown={() => this.store.notify()}>
            {'close'}
          </div> */}
          {this.hotSignerMismatch()}
        </div>
      )
    } else if (notify === 'openExternal') {
      return (
        <div className='notify vaultCardShow' onMouseDown={() => this.store.notify()}>
          {/* <div className='alertCloseBtn' onMouseDown={() => this.store.notify()}>
            {'close'}
          </div> */}
          {this.openExternal(this.store('view.notifyData'))}
        </div>
      )
    } else if (notify === 'openExplorer') {
      return (
        <div className='notify vaultCardShow' onMouseDown={() => this.store.notify()}>
          {/* <div className='alertCloseBtn' onMouseDown={() => this.store.notify()}>
            {'close'}
          </div> */}
          {this.openExplorer(this.store('view.notifyData'))}
        </div>
      )
    } else if (notify === 'extensionConnect') {
      const { browser, id } = this.store('view.notifyData')

      return <ExtensionConnectNotification browser={browser} id={id} onClose={() => this.store.notify()} />
    } else {
      return null
    }
  }
}

// Notification Cycle for Testing

// intro
// contractData
// mainnet
// rinkeby
// ipfsAlreadyRunning
// parityAlreadyRunning
// gasFeeWarning
// contractData
// hotAccountWarning

// let notifications = [
//   {
//     name: 'intro',
//     data: {}
//   },
//   {
//     name: 'mainnet',
//     data: {}
//   },
//
//   {
//     name: 'rinkeby',
//     data: {}
//   },
//   {
//     name: 'ipfsAlreadyRunning',
//     data: {}
//   },
//   {
//     name: 'parityAlreadyRunning',
//     data: {}
//   },
//   {
//     name: 'gasFeeWarning',
//     data: {
//       req: {
//         handlerId: 'c9a46b23-dced-45a3-a961-cbc5b7873de5',
//         type: 'transaction',
//         data: {
//           value: '0x11e42f05714a67',
//           to: '0x355587247da36c3130da888d9f608ccf0d2351ce',
//           from: '0x355587247da36c3130da888d9f608ccf0d2351ce',
//           gasPrice: '0x3b9aca00',
//           gas: '0x5208',
//           networkId: '0x4'
//         },
//         payload: {
//           jsonrpc: '2.0',
//           id: 3416,
//           method: 'eth_sendTransaction',
//           params: [],
//           account: '0x355587247DA36C3130dA888d9F608ccF0D2351ce'
//         }
//       },
//       feeUSD: 200
//     }
//   },
//   {
//     name: 'contractData',
//     data: {}
//   },
//   {
//     name: 'openExternal',
//     data: {
//       url: 'https://lightpay.tech'
//     }
//   },
//   {
//     name: 'openExplorer',
//     data: {
//       hash: '0x1234'
//     }
//   },
//   {
//     name: 'hotAccountWarning',
//     data: {}
//   }
// ]
//
//
// let i = -1
// const checkKey = (e) => {
//   if ((e || window.event).key === 'ArrowRight') {
//     i++
//     if (!notifications[i]) i = 0
//     console.log(notifications[i].name, notifications[i].data)
//     store.notify(notifications[i].name, notifications[i].data)
//   } else if ((e || window.event).key === 'ArrowLeft') {
//     i--
//     if (!notifications[i]) i = notifications.length - 1
//     console.log(notifications[i].name, notifications[i].data)
//     store.notify(notifications[i].name, notifications[i].data)
//   }
// }

// window.addEventListener('keyup', checkKey, true)

export default Restore.connect(Notify)
