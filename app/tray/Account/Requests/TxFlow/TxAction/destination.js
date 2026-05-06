import React from 'react'

const Destination = ({ chain, recipientType }) => {
  const formattedRecipient = recipientType === 'contract' ? 'contract' : 'account'

  return <div className='_flowTag'>{`to ${formattedRecipient} on ${chain}`}</div>
}

export default Destination
