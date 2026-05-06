import React from 'react'
import Restore from 'react-restore'
import svg from '../../../resources/svg'
import link from '../../../resources/link'

import BigNumber from 'bignumber.js'
import { usesBaseFee } from '../../../resources/domain/transaction'

import Confirm from '../../../resources/Components/Confirm'
import AddToken from './AddToken'
import lightPayIcon from '../../../asset/LightPayIcon.png'

const FEE_WARNING_THRESHOLD_USD = 50
const capitalize = (s) => s[0].toUpperCase() + s.slice(1)

class Notify extends React.Component {
  betaDisclosure() {
    return (
      <div className='alertWrap' onMouseDown={(e) => e.stopPropagation()}>
        <div className='alertBoxSlide'>
          <div className='alertBox'>
            <div className='alertAppLogo'>
              <img src={lightPayIcon} />
            </div>
            <div className='alertTitle'>LightPay v0.5-beta</div>
            <div className='alertBody'>
              <div className='alertBodyBlock alertBodyBlockLarge'>
                We are excited to welcome you to the next iteration of LightPay!
              </div>
              <div className='alertBodyBlock'>
                Be advised, this version of LightPay is currently in &quot;beta&quot; and will update on a beta
                track
              </div>
              <div className='alertBodyBlock'>
                Use hardware signers for high value accounts and verify all transaction and account details on
                your signing device
              </div>
              <div className='alertBodyBlock'>
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
              <div className='alertBodyBlock alertBodyBlockLarge'>
                <div>Please give us your feedback!</div>
                <div
                  className='alertLink'
                  style={{ marginTop: '20px' }}
                  onMouseDown={() => {
                    link.send('tray:openExternal', 'https://lightpay.canny.io')
                  }}
                >
                  feedback.lightpay.tech
                </div>
              </div>
            </div>
            <div className='alertActions'>
              <div
                className='alertActionBtn alertActionSingle'
                onMouseDown={() => {
                  link.send('tray:action', 'muteBetaDisclosure')
                  link.send('tray:action', 'backDash')
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
                link.send('tray:action', 'backDash')
              }}
            >
              <div className='alertActionBtnText'>Cancel</div>
            </div>
            <div
              className='alertActionBtn alertActionProceed'
              onMouseDown={() => {
                link.rpc('approveRequest', req, () => {})
                link.send('tray:action', 'backDash')
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
                link.send('tray:action', 'backDash')
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
                link.send('tray:action', 'backDash')
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
                link.send('tray:action', 'backDash')
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
                  link.send('tray:action', 'navDash', {
                    view: 'notify',
                    data: {
                      notify: 'gasFeeWarning',
                      notifyData: { req, feeUSD: this.toDisplayUSD(maxFeeUSD), currentSymbol }
                    }
                  })
                } else {
                  link.rpc('approveRequest', req, () => {})
                  link.send('tray:action', 'backDash')
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
                link.send('tray:action', 'backDash')
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
                link.send('tray:action', 'backDash')
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
                link.send('tray:action', 'backDash')
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
                link.send('tray:action', 'backDash')
              }}
            >
              <div className='alertActionBtnText'>Cancel</div>
            </div>
            <div
              className='alertActionBtn alertActionProceed'
              onMouseDown={() => {
                link.send('tray:openExternal', url)
                link.send('tray:action', 'backDash')
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
    return (
      <div className='alertWrap' onMouseDown={(e) => e.stopPropagation()}>
        <div className='alertBox'>
          <div className='alertTitle'>Open Block Explorer</div>
          <div className='alertBody'>
            <div className='alertBodyLine'>
              LightPay will open a block explorer in your browser for transaction:
            </div>
            <div className='alertBodyHash'>{hash}</div>
          </div>
          <div className='alertActions'>
            <div
              className='alertActionBtn alertActionDeny'
              onMouseDown={() => {
                link.send('tray:action', 'backDash')
              }}
            >
              <div className='alertActionBtnText'>Cancel</div>
            </div>
            <div
              className='alertActionBtn alertActionProceed'
              onMouseDown={() => {
                link.send('tray:openExplorer', chain, hash)
                link.send('tray:action', 'backDash')
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
    const { notify, notifyData } = this.props.data
    if (notify === 'mainnet') {
      return (
        <div className='notify vaultCardShow' onMouseDown={() => link.send('tray:action', 'backDash')}>
          {this.mainnet()}
        </div>
      )
    } else if (notify === 'betaDisclosure') {
      return <div className='notify vaultCardShow'>{this.betaDisclosure()}</div>
    } else if (notify === 'gasFeeWarning') {
      return <div className='notify vaultCardShow'>{this.gasFeeWarning(notifyData)}</div>
    } else if (notify === 'noSignerWarning') {
      return <div className='notify vaultCardShow'>{this.noSignerWarning(notifyData)}</div>
    } else if (notify === 'signerUnavailableWarning') {
      return <div className='notify vaultCardShow'>{this.signerUnavailableWarning(notifyData)}</div>
    } else if (notify === 'signerCompatibilityWarning') {
      return <div className='notify vaultCardShow'>{this.signerCompatibilityWarning(notifyData)}</div>
    } else if (notify === 'contractData') {
      return <div className='notify vaultCardShow'>{this.contractData()}</div>
    } else if (notify === 'hotAccountWarning') {
      return <div className='notify vaultCardShow'>{this.hotAccountWarning()}</div>
    } else if (notify === 'hotSignerMismatch') {
      return <div className='notify vaultCardShow'>{this.hotSignerMismatch()}</div>
    } else if (notify === 'confirmRemoveChain') {
      const { chain } = notifyData

      const onAccept = () => {
        link.send('tray:action', 'removeNetwork', chain)

        // if accepted, go back twice to get back to the main chains panel
        link.send('tray:action', 'backDash', 2)
      }

      const onDecline = () => {
        link.send('tray:action', 'backDash')
      }

      return (
        <div className='notify vaultCardShow'>
          <div className='alertWrap' onMouseDown={(e) => e.stopPropagation()}>
            <div className='alertBoxSlide'>
              <Confirm
                prompt='Are you sure you want to remove this chain?'
                onAccept={onAccept}
                onDecline={onDecline}
              />
            </div>
          </div>
        </div>
      )
    } else if (notify === 'openExternal') {
      return <div className='notify vaultCardShow'>{this.openExternal(notifyData)}</div>
    } else if (notify === 'openExplorer') {
      return <div className='notify vaultCardShow'>{this.openExplorer(notifyData)}</div>
    } else if (notify === 'addAsset') {
      return (
        <div className='notify vaultCardShow'>
          <div className='alertWrap' onMouseDown={(e) => e.stopPropagation()}>
            <div className='alertBoxSlide'>
              <AddToken {...notifyData} />
            </div>
          </div>
        </div>
      )
    } else {
      return null
    }
  }
}

export default Restore.connect(Notify)
