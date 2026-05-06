import React from 'react'

const timeFormat = new Intl.DateTimeFormat('en', { dateStyle: 'medium' })

function formatTime(amount, unit) {
  return `for ${amount} ${unit}${amount > 1 ? 's' : ''}`
}

function formatDuration(duration) {
  if (duration < 60) return 'for < 1 minute'
  if (duration < 3600) return formatTime(Math.floor(duration / 60), 'minute')
  if (duration < 3600 * 24) return formatTime(Math.floor(duration / 3600), 'hour')

  const endDate = new Date()
  endDate.setSeconds(endDate.getSeconds() + duration)

  return `until ${timeFormat.format(endDate)}`
}

const EnsOverview = ({ type, data }) => {
  if (type === 'commit') {
    return (
      <>
        <div className='_flowEnsLine'>Submitting ENS Commitment</div>
      </>
    )
  }

  if (type === 'register') {
    return (
      <>
        <div className='_flowEnsLine'>Registering ENS Name</div>
        <div className='_flowEnsLine _flowEnsHeadline'>{data.name}</div>
        <div className='_flowEnsLine'>{`${formatDuration(data.duration)}`}</div>
      </>
    )
  }

  if (type === 'renew') {
    return (
      <>
        <div className='_flowEnsLine'>Renewing ENS Name</div>
        <div className='_flowEnsLine _flowEnsHeadline'>{data.name}</div>
        <div className='_flowEnsLine'>{`for ${formatDuration(data.duration)}`}</div>
      </>
    )
  }

  if (type === 'transfer') {
    const { name, tokenId, from, to } = data
    const display = name || tokenId

    return (
      <>
        <div className='_flowEnsLine'>{`Transferring ENS Name${
          name ? '' : ' with token id'
        }`}</div>
        <div className='_flowEnsLine _flowEnsHeadline'>{display}</div>
        <div className='_flowEnsLine'>from</div>
        <div className='_flowEnsLine _flowEnsMidline'>{from}</div>
        <div className='_flowEnsLine'>to</div>
        <div className='_flowEnsLine _flowEnsMidline'>{to}</div>
      </>
    )
  }

  if (type === 'approve') {
    const { operator, name } = data

    return (
      <>
        <div className='_flowEnsLine'>Granting approval to</div>
        <div className='_flowEnsLine _flowEnsMidline'>{operator}</div>
        <div className='_flowEnsLine'>as an approved operator for</div>
        <div className='_flowEnsLine _flowEnsHeadline'>{name}</div>
      </>
    )
  }
}

export default EnsOverview
