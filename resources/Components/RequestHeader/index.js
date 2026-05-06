import React from 'react'

const RequestHeader = ({ chain, children, chainColor }) => (
  <div className='_flowDesc'>
    {children}
    <div className='_flowDescTag' style={{ color: `var(--${chainColor})` }}>
      {`on ${chain}`}
    </div>
  </div>
)

export default RequestHeader
