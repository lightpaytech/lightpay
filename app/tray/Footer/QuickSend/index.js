import React from 'react'
import Restore from 'react-restore'
import link from '../../../../resources/link'
import svg from '../../../../resources/svg'

class QuickSend extends React.Component {
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
        this.setState({ error: err.message || 'Send failed', sending: false })
      } else {
        this.setState({ toAddress: '', amount: '', sending: false })
        this.props.onClose && this.props.onClose()
      }
    })
  }

  renderNoAccount() {
    return (
      <div className='quickSendPanel'>
        <div className='quickSendHeader'>
          <div className='quickSendTitle'>Quick Send</div>
          <div className='quickSendClose' onClick={this.props.onClose}>
            {svg.close(12)}
          </div>
        </div>
        <div className='quickSendNoAccount'>
          <div className='quickSendNoAccountIcon'>
            {svg.walletIcon ? svg.walletIcon(22) : svg.accounts(22)}
          </div>
          <div className='quickSendNoAccountText'>No account connected</div>
          <div className='quickSendNoAccountSub'>Add a wallet to start sending</div>
          <div className='quickSendNoAccountActions'>
            <div
              className='quickSendNoAccountBtn quickSendNoAccountBtnPrimary'
              onClick={() => {
                link.send('tray:action', 'navDash', {
                  view: 'accounts',
                  data: { showAddAccounts: true }
                })
                link.send('tray:action', 'setDash', { showing: true })
                this.props.onClose && this.props.onClose()
              }}
            >
              {svg.plus ? svg.plus(12) : null}
              <span>Add Account</span>
            </div>
            <div
              className='quickSendNoAccountBtn quickSendNoAccountBtnSecondary'
              onClick={() => {
                link.send('tray:action', 'navDash', {
                  view: 'accounts',
                  data: {}
                })
                link.send('tray:action', 'setDash', { showing: true })
                this.props.onClose && this.props.onClose()
              }}
            >
              <span>Open Settings</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  render() {
    const accounts = this.store('main.accounts') || {}
    const current = this.store('selected.current')
    const hasAccount = Object.keys(accounts).length > 0
    const currentAccount = current ? accounts[current] : null

    // Show "add account" UI when no accounts exist
    if (!hasAccount) {
      return this.renderNoAccount()
    }

    const { toAddress, amount, error, sending } = this.state
    const canSend = this.isValidAddress(toAddress) && this.isValidAmount(amount) && !sending

    return (
      <div className='quickSendPanel'>
        <div className='quickSendHeader'>
          <div className='quickSendTitle'>Quick Send</div>
          {currentAccount && (
            <div className='quickSendFromAccount'>
              <div className='quickSendFromDot' />
              <div className='quickSendFromName'>{currentAccount.name || 'Account'}</div>
            </div>
          )}
          <div className='quickSendClose' onClick={this.props.onClose}>
            {svg.close(12)}
          </div>
        </div>

        <div className='quickSendBody'>
          <div className='quickSendField'>
            <div className='quickSendLabel'>To</div>
            <input
              className='quickSendInput quickSendInputMono'
              type='text'
              placeholder='0x recipient address'
              value={toAddress}
              onChange={(e) => this.setState({ toAddress: e.target.value, error: '' })}
              spellCheck={false}
            />
          </div>

          <div className='quickSendField'>
            <div className='quickSendLabel'>Amount</div>
            <div className='quickSendAmountRow'>
              <input
                className='quickSendInput quickSendInputAmount'
                type='number'
                placeholder='0.0'
                min='0'
                step='0.001'
                value={amount}
                onChange={(e) => this.setState({ amount: e.target.value, error: '' })}
              />
              <div className='quickSendCurrency'>ETH</div>
            </div>
          </div>

          {error && <div className='quickSendError'>{error}</div>}

          <div
            className={'quickSendSubmit' + (canSend ? ' quickSendSubmitReady' : '')}
            onClick={() => canSend && this.handleSend()}
          >
            {sending ? 'Sending…' : 'Send ETH'}
          </div>
        </div>
      </div>
    )
  }
}

export default Restore.connect(QuickSend)
