import React from 'react'
import Restore from 'react-restore'

// Generates a smooth SVG sparkline path from an array of values
function buildSparklinePath(values, width, height, padding = 6) {
  if (!values || values.length < 2) return ''

  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const w = width - padding * 2
  const h = height - padding * 2

  const points = values.map((v, i) => ({
    x: padding + (i / (values.length - 1)) * w,
    y: padding + h - ((v - min) / range) * h
  }))

  // Smooth bezier path
  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 1; i < points.length; i++) {
    const cp1x = points[i - 1].x + (points[i].x - points[i - 1].x) / 3
    const cp1y = points[i - 1].y
    const cp2x = points[i].x - (points[i].x - points[i - 1].x) / 3
    const cp2y = points[i].y
    d += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${points[i].x} ${points[i].y}`
  }

  // Area fill path
  const fillD = d +
    ` L ${points[points.length - 1].x} ${height}` +
    ` L ${points[0].x} ${height}` +
    ' Z'

  return { linePath: d, fillPath: fillD, points, lastPoint: points[points.length - 1] }
}

// Generate mock historical data from current balance (placeholder until real data)
function generateTrendData(currentValue, count = 14) {
  if (!currentValue || currentValue <= 0) return []
  const data = []
  let v = currentValue * 0.85
  for (let i = 0; i < count; i++) {
    v = v + (Math.random() - 0.45) * currentValue * 0.08
    v = Math.max(currentValue * 0.6, v)
    data.push(v)
  }
  data.push(currentValue)
  return data
}

class PortfolioChart extends React.Component {
  render() {
    const rates = this.store('main.rates') || {}
    const balances = this.store('main.balances') || {}
    const accountId = this.props.account
    const accountBalances = balances[accountId] || {}

    // Calculate total portfolio value in USD
    let totalUSD = 0
    Object.entries(accountBalances).forEach(([address, balance]) => {
      const rate = rates[address]?.usd || 0
      const amount = parseFloat(balance?.balance || '0') / 1e18
      totalUSD += amount * rate
    })

    const chartW = 340
    const chartH = 72
    const trendData = generateTrendData(totalUSD)
    const chart = buildSparklinePath(trendData, chartW, chartH)

    const isUp = trendData.length > 1 && trendData[trendData.length - 1] >= trendData[0]
    const lineColor = isUp ? 'rgba(16,185,129,0.9)' : 'rgba(244,63,94,0.9)'
    const fillColor = isUp ? 'rgba(16,185,129,0.08)' : 'rgba(244,63,94,0.06)'
    const changeColor = isUp ? 'var(--good)' : 'var(--bad)'
    const changeSign = isUp ? '▲' : '▼'

    if (totalUSD === 0) return null

    const changePercent = trendData.length > 1
      ? (((trendData[trendData.length - 1] - trendData[0]) / trendData[0]) * 100).toFixed(2)
      : '0.00'

    return (
      <div className='portfolioChart'>
        <div className='portfolioChartHeader'>
          <div className='portfolioChartLabel'>Portfolio</div>
          <div className='portfolioChartChange' style={{ color: changeColor }}>
            {changeSign} {Math.abs(changePercent)}%
          </div>
        </div>
        <div className='portfolioChartValue'>
          {'$' + totalUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        {chart && (
          <div className='portfolioChartSvgWrap'>
            <svg
              width={chartW}
              height={chartH}
              viewBox={`0 0 ${chartW} ${chartH}`}
              xmlns='http://www.w3.org/2000/svg'
              style={{ display: 'block', width: '100%', height: `${chartH}px` }}
            >
              <defs>
                <linearGradient id='chartGrad' x1='0' y1='0' x2='0' y2='1'>
                  <stop offset='0%' stopColor={lineColor} stopOpacity='0.15' />
                  <stop offset='100%' stopColor={lineColor} stopOpacity='0' />
                </linearGradient>
              </defs>
              <path d={chart.fillPath} fill='url(#chartGrad)' />
              <path d={chart.linePath} fill='none' stroke={lineColor} strokeWidth='1.75' strokeLinecap='round' strokeLinejoin='round' />
              {chart.lastPoint && (
                <circle
                  cx={chart.lastPoint.x}
                  cy={chart.lastPoint.y}
                  r='3.5'
                  fill={lineColor}
                  opacity='0.9'
                />
              )}
            </svg>
          </div>
        )}
      </div>
    )
  }
}

export default Restore.connect(PortfolioChart)
