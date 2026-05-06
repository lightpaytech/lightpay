import React from 'react'
import Restore from 'react-restore'
import link from '../../resources/link'
import svg from '../../resources/svg'
import Native from '../../resources/Native'

// LightPay dApp container — shown when a dApp frame is open
// The actual dApp content loads via webview; this is the loading/empty state

class App extends React.Component {
  constructor(...args) {
    super(...args)
    this.state = {
      toAddress: '',
      amount: '',
      error: '',
      sending: false
    }
  }

  isValidAddress(addr) {
    return /^0x[0-9a-fA-F]{40}$/.test((addr || '').trim())
  }

  isValidAmount(amt) {
    const n = parseFloat(amt)
    return !isNaN(n) && n > 0
  }

  handleSend() {
    const { toAddress, amount } = this.state
    if (!this.isValidAddress(toAddress)) {
      this.setState({ error: 'Enter a valid 0x address' })
      return
    }
    if (!this.isValidAmount(amount)) {
      this.setState({ error: 'Enter a valid ETH amount' })
      return
    }
    this.setState({ sending: true, error: '' })
    const weiAmount = '0x' + Math.floor(parseFloat(amount) * 1e18).toString(16)
    link.rpc('sendTransaction', { to: toAddress.trim(), value: weiAmount, data: '0x' }, (err) => {
      if (err) {
        this.setState({ error: err.message || 'Transaction failed', sending: false })
      } else {
        this.setState({ toAddress: '', amount: '', sending: false, error: '' })
      }
    })
  }

  render() {
    const accounts = this.store('main.accounts') || {}
    const hasAccount = Object.keys(accounts).length > 0
    const current = this.store('selected.current')
    const currentAccount = current ? accounts[current] : null
    const { toAddress, amount, error, sending } = this.state
    const canSend = this.isValidAddress(toAddress) && this.isValidAmount(amount) && !sending

    return (
      <div className='lpDappWindow'>
        <Native />

        <div className='lpDappWindowContent'>
          {!hasAccount ? (
            /* No accounts added yet */
            <div className='lpDappNoAccount'>
              <div className='lpDappNoAccountIcon'>
                {svg.walletIcon(32)}
              </div>
              <div className='lpDappNoAccountTitle'>No Account Connected</div>
              <div className='lpDappNoAccountSubtitle'>
                Add a wallet in LightPay to get started
              </div>
              <div
                className='lpDappNoAccountBtn'
                onClick={() => {
                  link.send('tray:action', 'navDash', { view: 'accounts', data: { showAddAccounts: true } })
                }}
              >
                Add Account
              </div>
            </div>
          ) : (
            /* Quick Send form */
            <div className='lpDappSend'>
              <div className='lpDappSendHeader'>
                <div className='lpDappSendTitle'>Quick Send</div>
                {currentAccount && (
                  <div className='lpDappSendFrom'>
                    <div className='lpDappSendFromDot' />
                    <div className='lpDappSendFromName'>{currentAccount.name || 'Account'}</div>
                  </div>
                )}
              </div>

              <div className='lpDappSendBody'>
                <div className='lpDappSendField'>
                  <div className='lpDappSendLabel'>Recipient</div>
                  <input
                    className='lpDappSendInput lpDappSendInputMono'
                    type='text'
                    placeholder='0x address…'
                    value={toAddress}
                    onChange={(e) => this.setState({ toAddress: e.target.value, error: '' })}
                    spellCheck={false}
                  />
                </div>

                <div className='lpDappSendField'>
                  <div className='lpDappSendLabel'>Amount</div>
                  <div className='lpDappSendAmountRow'>
                    <input
                      className='lpDappSendInput lpDappSendInputAmount'
                      type='number'
                      placeholder='0.0'
                      min='0'
                      step='0.001'
                      value={amount}
                      onChange={(e) => this.setState({ amount: e.target.value, error: '' })}
                    />
                    <div className='lpDappSendCurrency'>ETH</div>
                  </div>
                </div>

                {error && <div className='lpDappSendError'>{error}</div>}

                <div
                  className={canSend ? 'lpDappSendBtn lpDappSendBtnReady' : 'lpDappSendBtn'}
                  onClick={() => canSend && this.handleSend()}
                >
                  {sending ? 'Sending…' : 'Send ETH'}
                </div>
              </div>

              <div className='lpDappSendNetwork'>
                <div className='lpDappSendNetworkDot' />
                <div className='lpDappSendNetworkName'>Ethereum Mainnet</div>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }
}

export default Restore.connect(App)
