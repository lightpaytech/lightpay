import { useEffect, useState } from 'react'

import svg from '../../../../../../resources/svg'
import { getAddress } from '../../../../../../resources/utils'

let copyTimeout = null

const Recipient = ({ address, ens, copyAddress, textSize = 16 }) => {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    return function () {
      if (copyTimeout) {
        clearTimeout(copyTimeout)
      }
    }
  }, [])

  const checkSummedAddress = getAddress(address)
  return (
    <>
      <div className='_flowDataVal'>
        {ens ? (
          <span className='_flowTo' style={{ fontSize: `${textSize}px` }}>
            {ens}
          </span>
        ) : (
          <span className='_flowTo'>
            {checkSummedAddress.substring(0, 8)}
            {svg.octicon('kebab-horizontal', { height: 15 })}
            {checkSummedAddress.substring(address.length - 6)}
          </span>
        )}
        {/* {req.decodedData && req.decodedData.contractName ? ( 
          <span className={'_flowDataMethod'}>{(() => {
            if (req.decodedData.contractName.length > 11) return `${req.decodedData.contractName.substr(0, 9)}..`
            return req.decodedData.contractName
          })()}</span>
        ) : null} */}
        <div
          className='_flowToFull'
          onClick={() => {
            copyAddress(checkSummedAddress)
            setCopied(true)
            setTimeout(() => setCopied(false), 1000)
          }}
        >
          {copied ? (
            <span>{'Address Copied'}</span>
          ) : (
            <span className='_flowToCode'>{checkSummedAddress}</span>
          )}
        </div>
      </div>
    </>
  )
}

export default Recipient
