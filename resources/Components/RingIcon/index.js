import React from 'react'
import Restore from 'react-restore'
import svg from '../../../resources/svg'

// ─── Constants ────────────────────────────────────────────────────────────────

/** Icon size (px) used for the default / large ring icon variant */
const DEFAULT_SVG_SIZE = 16

/** Icon size (px) used for the small ring icon variant */
const SMALL_SVG_SIZE = 13

/** Icon size (px) used for the large ring icon variant */
const LARGE_SVG_SIZE = 18

/** Ethereum-compatible chain names that should render the ETH icon */
const ETH_CHAIN_NAMES = ['mainnet', 'görli', 'sepolia', 'ropsten', 'rinkeby', 'kovan']

// ─── Internal sub-component ───────────────────────────────────────────────────

const Icon = ({ svgName, alt = '', svgSize = DEFAULT_SVG_SIZE, img, small }) => {
  if (img) {
    return <img src={`https://proxy.pylon.link?type=icon&target=${encodeURIComponent(img)}`} alt={alt} />
  }

  if (svgName) {
    const iconName = svgName.toLowerCase()
    if (ETH_CHAIN_NAMES.includes(iconName)) {
      return svg.eth(small ? SMALL_SVG_SIZE : LARGE_SVG_SIZE)
    }

    const svgIcon = svg[iconName]
    return svgIcon ? svgIcon(svgSize) : null
  }

  return svg.eth(small ? SMALL_SVG_SIZE : LARGE_SVG_SIZE)
}

Icon.displayName = 'RingIcon__Icon'

// ─── Main component ───────────────────────────────────────────────────────────

class RingIcon extends React.Component {
  constructor(...args) {
    super(...args)
    this.state = {}
  }

  render() {
    const {
      color,
      svgName,
      svgSize,
      img,
      small,
      block,
      noRing,
      alt
    } = this.props

    let ringIconClass = 'ringIcon'
    if (small) ringIconClass += ' ringIconSmall'
    if (block) ringIconClass += ' ringIconBlock'
    if (noRing) ringIconClass += ' ringIconNoRing'

    return (
      <div
        className={ringIconClass}
        style={{ borderColor: color }}
      >
        <div className='ringIconInner' style={block ? { color } : { background: color }}>
          <Icon svgName={svgName} svgSize={svgSize} img={img} alt={alt} small={small} />
        </div>
      </div>
    )
  }
}

RingIcon.displayName = 'RingIcon'

export default Restore.connect(RingIcon)
