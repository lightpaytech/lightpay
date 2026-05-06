import React from 'react'
import Restore from 'react-restore'

import svg from '../../../resources/svg'
import link from '../../../resources/link'

import Default from './EmptyState'

import Activity from './History'
import Chains from './NetworkList'
import Balances from './Assets'
import Gas from '../../../resources/Components/Monitor'
import Inventory from './Collection'
import Permissions from './AccessList'
import Requests from './Requests'
import Settings from './Preferences'
import Signer from './KeyDevice'

import {
  SignatureRequest,
  SignTypedDataRequest,
  SignPermitRequest,
  TransactionRequest,
  ProviderRequest,
  ChainRequest,
  AddTokenRequest
} from '../Requests'
import { isHardwareSigner } from '../../../resources/domain/signer'
import { accountViewTitles } from '../../../resources/domain/request'
import Watchlist from '../Watchlist'
import PortfolioChart from './Portfolio'

const requests = {
  sign: SignatureRequest,
  signTypedData: SignTypedDataRequest,
  signErc20Permit: SignPermitRequest,
  transaction: TransactionRequest,
  access: ProviderRequest,
  addNetwork: ChainRequest,
  addAsset: AddTokenRequest
}

const modules = {
  gas: Gas,
  requests: Requests,
  portfolio: PortfolioChart,
  chains: Chains,
  activity: Activity,
  inventory: Inventory,
  permissions: Permissions,
  balances: Balances,
  signer: Signer,
  settings: Settings,
  watchlist: Watchlist
}

class _AccountModule extends React.Component {
  getModule(moduleId, account, expanded, expandedData, filter) {
    const Module = modules[moduleId] || Default

    return (
      <Module
        account={account}
        expanded={expanded}
        expandedData={expandedData}
        filter={filter}
        moduleId={moduleId}
      />
    )
  }

  render() {
    const { id, module, top, index, expanded, expandedData, account, filter } = this.props
    let hidden = false
    let style = {
      transform: `translateY(${top}px)`,
      zIndex: 9999 - index,
      height: module.height,
      opacity: 1
    }

    if (hidden) {
      style = {
        transform: `translateY(${top}px)`,
        zIndex: 9999 - index,
        height: 0,
        opacity: 0,
        overflow: 'hidden'
      }
    }

    if (expanded) {
      return this.getModule(id, account, expanded, expandedData, filter)
    } else {
      return (
        <div className={'walletModule'} ref={this.moduleRef} style={style}>
          <div className='walletModuleInner vaultCardShow'>
            <div className='walletModuleCard'>
              {this.getModule(id, account, expanded, expandedData, filter)}
            </div>
          </div>
        </div>
      )
    }
  }
}

const AccountModule = Restore.connect(_AccountModule)

// account module is position absolute and with a translateX
class _AccountMain extends React.Component {
  constructor(...args) {
    super(...args)
    this.state = {
      expandedModule: ''
    }
  }
  renderAccountFilter() {
    return (
      <div className='walletSearchBar'>
        <div className='walletSearchIcon'>{svg.search(12)}</div>
        <div className='walletSearchInput'>
          <input
            tabIndex='-1'
            type='text'
            spellCheck='false'
            onChange={(e) => {
              const value = e.target.value
              this.setState({ walletFilter: value })
            }}
            value={this.state.walletFilter}
          />
        </div>
        {this.state.walletFilter ? (
          <div
            className='walletSearchClear'
            onClick={() => {
              this.setState({ walletFilter: '' })
            }}
          >
            {svg.close(12)}
          </div>
        ) : null}
      </div>
    )
  }

  render() {
    const walletModules = this.store('panel.account.modules')
    const accountModuleOrder = this.store('panel.account.moduleOrder')
    let slideHeight = 0
    const modules = accountModuleOrder.map((id, i) => {
      const module = walletModules[id] || { height: 0 }
      slideHeight += module.height + 12
      return (
        <AccountModule
          key={id}
          id={id}
          account={this.props.id}
          module={module}
          top={slideHeight - module.height - 12}
          index={i}
          filter={this.state.walletFilter}
        />
      )
    })
    const footerHeight = this.store('windows.panel.footer.height')
    return (
      <div className='walletMain' style={{ bottom: footerHeight + 'px' }}>
        <div className='walletMainScroll'>
          {this.renderAccountFilter()}
          <div className='walletMainSlide' style={{ height: slideHeight + 'px' }}>
            {modules}
          </div>
        </div>
      </div>
    )
  }
}

const AccountMain = Restore.connect(_AccountMain)

// AccountView is a reusable template that provides the option to nav back to main
class _AccountView extends React.Component {
  render() {
    const accountOpen = this.store('selected.open')
    const footerHeight = this.store('windows.panel.footer.height')
    return (
      <div
        className='walletView'
        style={{ top: accountOpen ? '140px' : '80px', bottom: footerHeight + 'px' }}
      >
        <div className='walletViewMenu vaultCardShow'>
          <div className='walletViewBack' onClick={() => this.props.back()}>
            {svg.chevronLeft(16)}
          </div>
          <div className='walletViewTitle'>
            <div className='accountViewIcon'>{this.props.accountViewIcon}</div>
            <div className='accountViewText'>{this.props.walletViewTitle}</div>
          </div>
        </div>
        <div className='walletViewMain vaultCardShow'>{this.props.children}</div>
      </div>
    )
  }
}

const AccountView = Restore.connect(_AccountView)

class _AccountBody extends React.Component {
  constructor(...args) {
    super(...args)
    this.state = {
      view: 'request'
    }
  }

  getRequestComponent({ type }) {
    return requests[type]
  }

  getChainData(req) {
    if (req.type !== 'signErc20Permit') return {}
    const networkId = req.typedMessage.data.domain.networkId
    const networkName = this.store('main.networks.ethereum', networkId, 'name')
    const { primaryColor: chainColor, icon } = this.store('main.networksMeta.ethereum', networkId)

    return { networkId, networkName, chainColor, icon }
  }

  renderRequest(req, data = {}) {
    const Request = this.getRequestComponent(req)
    if (!Request) return null

    const { handlerId } = req
    const { step } = data

    const activeAccount = this.store('main.accounts', this.props.id)
    const originName = this.store('main.origins', req.origin, 'name')
    const networkData = this.getChainData(req)

    const signingDelay = isHardwareSigner(activeAccount.lastSignerType) ? 200 : 1500

    return (
      <Request
        key={handlerId}
        req={req}
        step={step}
        signingDelay={signingDelay}
        networkId={networkData.networkId}
        originName={originName}
        networkData={networkData}
      />
    )
  }

  getAccountViewTitle({ type }) {
    return accountViewTitles[type]
  }

  render() {
    const crumb = this.store('windows.panel.nav')[0] || {}

    if (crumb.view === 'requestView') {
      const { accountId, requestId } = crumb.data
      const req = this.store('main.accounts', accountId, 'requests', requestId)
      const walletViewTitle = (req && this.getAccountViewTitle(req)) || ''

      return (
        <AccountView
          back={() => {
            link.send('nav:back', 'panel')
          }}
          {...this.props}
          walletViewTitle={walletViewTitle}
        >
          {req && this.renderRequest(req, crumb.data)}
        </AccountView>
      )
    } else if (crumb.view === 'expandedModule') {
      return (
        <AccountView
          back={() => {
            link.send('nav:back', 'panel')
          }}
          {...this.props}
          walletViewTitle={crumb.data.id}
        >
          <div
            className='walletModulesExpand vaultCardShow'
            onMouseDown={() => this.setState({ expandedModule: false })}
          >
            <div
              className='moduleExpanded'
              onMouseDown={(e) => {
                e.stopPropagation()
              }}
            >
              <AccountModule
                id={crumb.data.id}
                account={crumb.data.account}
                module={{ height: 'auto' }}
                top={0}
                index={0}
                expanded={true}
                expandedData={crumb.data}
              />
            </div>
          </div>
        </AccountView>
      )
    } else {
      return <AccountMain {...this.props} />
    }
  }
}

const AccountBody = Restore.connect(_AccountBody)

class Account extends React.Component {
  render() {
    const minimized = this.store('selected.minimized')

    return (
      <AccountBody
        id={this.props.id}
        addresses={this.props.addresses}
        minimized={minimized}
        status={this.props.status}
        signer={this.props.signer}
      />
    )
  }
}

export default Restore.connect(Account)
