import BigNumber from 'bignumber.js'

import { isUnlimited } from '../../../../../resources/utils/numbers'
import svg from '../../../../../resources/svg'
import link from '../../../../../resources/link'
import { ClusterBox, Cluster, ClusterRow, ClusterValue } from '../../../../../resources/Components/Cluster'
import Countdown from '../../../../../resources/Components/Countdown'
import RequestHeader from '../../../../../resources/Components/RequestHeader'
import RequestItem from '../../../../../resources/Components/RequestItem'
import EditTokenSpend from '../../../../../resources/Components/EditTokenSpend'
import { SimpleTypedData as TypedSignatureOverview } from '../../../../../resources/Components/SimpleTypedData'
import { getSignatureRequestClass } from '../../../../../resources/domain/request'
import useCopiedMessage from '../../../../../resources/Hooks/useCopiedMessage'

const PermitOverview = ({ req, networkData, originName }) => {
  const { chainColor, networkName, icon } = networkData
  const {
    permit: { spender, value, deadline },
    tokenData,
    handlerId
  } = req

  const [showCopiedMessage, copySpender] = useCopiedMessage(spender.address)

  const amountDisplay = isUnlimited(value)
    ? '~UNLIMITED'
    : tokenData.decimals
    ? new BigNumber(value).shiftedBy(-tokenData.decimals)
    : 'UNKNOWN AMOUNT'

  const amountSuffix = tokenData.symbol || 'UNKNOWN TOKEN'

  return (
    <div className='approveRequest'>
      <div className='approveTransactionPayload'>
        <div className='_flowBody'>
          <ClusterBox animationSlot={1}>
            <RequestItem
              key={`signErc20Permit:${handlerId}`}
              req={req}
              i={0}
              title={`${networkName} Token Permit`}
              color={chainColor ? `var(--${chainColor})` : ''}
              img={icon}
              headerMode={true}
            >
              <Cluster>
                <ClusterRow>
                  <ClusterValue
                    onClick={() => {
                      link.send('nav:update', 'panel', {
                        data: { step: 'viewRaw' }
                      })
                    }}
                  >
                    <div className='_flowDescription'>
                      <RequestHeader chain={networkName} chainColor={chainColor}>
                        <div className='requestItemTitleSub'>
                          <div className='requestItemTitleSubIcon'>{svg.window(10)}</div>
                          <div className='requestItemTitleSubText'>{originName}</div>
                        </div>
                        <div className='_flowDescMain'>{`Permit to Spend ${
                          tokenData.symbol || 'Unknown Token'
                        }`}</div>
                      </RequestHeader>
                    </div>
                  </ClusterValue>
                </ClusterRow>
              </Cluster>
            </RequestItem>
          </ClusterBox>
          <ClusterBox title={'Token Permit'} animationSlot={2}>
            <Cluster>
              {tokenData && (
                <>
                  <ClusterRow>
                    <ClusterValue pointerEvents={true} onClick={() => copySpender()}>
                      <div className='dataGroupAddr'>
                        <span className='dataGroupAddrTo'>
                          {spender.ens || (
                            <>
                              {spender.address.substring(0, 8)}
                              {svg.octicon('kebab-horizontal', { height: 15 })}
                              {spender.address.substring(spender.address.length - 6)}
                            </>
                          )}
                        </span>
                        <div className='dataGroupAddrFull'>
                          {showCopiedMessage ? (
                            <span>{'Address Copied'}</span>
                          ) : (
                            <span className='dataGroupCode'>{spender.address}</span>
                          )}
                        </div>
                      </div>
                    </ClusterValue>
                  </ClusterRow>
                  <ClusterRow>
                    <ClusterValue>
                      <div
                        className='dataGroupTag'
                        style={{ color: 'var(--bad)' }}
                      >{`is requesting permission to spend`}</div>
                    </ClusterValue>
                  </ClusterRow>
                  <ClusterRow>
                    <ClusterValue
                      onClick={
                        tokenData.decimals &&
                        (() => {
                          link.send('nav:update', 'panel', {
                            data: {
                              step: 'adjustPermit',
                              tokenData
                            }
                          })
                        })
                      }
                    >
                      <div className='dataGroupFocus'>
                        <div className='clusterFocusHighlight'>{`${amountDisplay} ${amountSuffix}`}</div>
                      </div>
                    </ClusterValue>
                  </ClusterRow>

                  <ClusterRow>
                    <ClusterValue>
                      <div className='dataGroupTag'>Permit Expires In</div>
                    </ClusterValue>
                  </ClusterRow>

                  <ClusterRow>
                    <ClusterValue>
                      <Countdown
                        end={deadline * 1000}
                        innerClass='clusterFocusHighlight'
                        titleClass='dataGroupFocus'
                      />
                    </ClusterValue>
                  </ClusterRow>
                </>
              )}
            </Cluster>
          </ClusterBox>
        </div>
      </div>
    </div>
  )
}

const EditPermit = ({ req }) => {
  const { typedMessage, permit, tokenData } = req

  const { verifyingContract: contract, spender, value: amount, deadline: deadlineInSeconds } = permit

  const updateRequest = (newAmt) => {
    const updated = {
      ...typedMessage,
      data: {
        ...typedMessage.data,
        message: {
          ...typedMessage.data.message,
          value: newAmt
        }
      }
    }

    link.rpc(
      'updateRequest',
      req.handlerId,
      {
        typedMessage: updated,
        permit: {
          ...permit,
          value: newAmt
        },
        tokenData
      },
      null,
      () => {}
    )
  }
  const deadline = deadlineInSeconds * 1000

  const requestedAmount = BigNumber(req.payload.params[1].message.value)

  const data = {
    ...tokenData,
    contract,
    spender,
    amount
  }

  return (
    <EditTokenSpend
      {...{
        data,
        requestedAmount,
        updateRequest,
        deadline
      }}
    />
  )
}

const PermitRequest = ({ req, originName, step, networkData }) => {
  const requestClass = getSignatureRequestClass(req)

  const renderStep = () => {
    switch (step) {
      case 'adjustPermit':
        return <EditPermit req={req} />
      case 'viewRaw':
        return <TypedSignatureOverview originName={originName} req={req} />
      default:
        return <PermitOverview originName={originName} req={req} networkData={networkData} />
    }
  }

  return (
    <div key={req.id || req.handlerId} className={requestClass}>
      {renderStep()}
    </div>
  )
}

export default PermitRequest
