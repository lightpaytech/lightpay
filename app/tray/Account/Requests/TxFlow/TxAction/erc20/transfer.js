import React from 'react'

const Transfer = ({ symbol, displayValue, rate }) => {
  return (
    <>
      <div className='_flowTransfer'>
        <div className='_flowTransferPart _flowTransferPartLg'>
          <span className='_flowTransferSymbol'>{symbol}</span>
          <span className='_flowTransferAmount'>{displayValue}</span>
        </div>
        <div className='_flowTransferPart'>
          <span className='_flowTransferEq'>{'≈'}</span>
          <span className='_flowTransferEqSym'>{'$'}</span>
          <span className='_flowTransferEqAmt'>{(displayValue * rate).toFixed(2)}</span>
        </div>
      </div>
    </>
  )
}

export default Transfer
