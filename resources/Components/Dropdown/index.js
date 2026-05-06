import { useState, useEffect, createRef } from 'react'

// ─── Constants ────────────────────────────────────────────────────────────────

/** Height of a single dropdown item row in pixels */
const ITEM_HEIGHT_PX = 28

/** Maximum number of words shown per option label before truncation */
const LABEL_MAX_WORDS = 3

// ─── Helpers ──────────────────────────────────────────────────────────────────

function findIndex(options, value) {
  const index = options.findIndex((option) => option.value === value)
  return index >= 0 ? index : undefined
}

/**
 * Truncate option label text to at most {@link LABEL_MAX_WORDS} words,
 * shortening each word proportionally when the list is at maximum length.
 */
function truncateLabel(text) {
  const words = text.split(' ').slice(0, LABEL_MAX_WORDS)
  const length = words.length === LABEL_MAX_WORDS ? 1 : words.length === 2 ? 3 : 10
  return words.map((w) => w.substr(0, length)).join(' ')
}

// ─── Component ────────────────────────────────────────────────────────────────

const Dropdown = ({
  options,
  syncValue,
  initialValue,
  style,
  className = '',
  onChange
}) => {
  const [selectedIndex, setSelectedIndex] = useState(
    findIndex(options, syncValue || initialValue) || options[0]
  )
  const [expanded, setExpanded] = useState(false)
  const ref = createRef()

  const clickHandler = (e) => {
    if (!e.composedPath().includes(ref.current) && expanded) {
      setExpanded(false)
    }
  }

  // On mount → register listener for document clicks to detect outside clicks
  useEffect(() => {
    document.addEventListener('click', clickHandler)
    return () => document.removeEventListener('click', clickHandler)
  // clickHandler is recreated each render; omitting it here is intentional
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded])

  // Handle new sync value arriving from parent
  const syncIndex = findIndex(options, syncValue)
  if (syncIndex !== selectedIndex) {
    setSelectedIndex(syncIndex)
  }

  // Handle item selected by user interaction
  const handleSelect = (option, index) => {
    // Only trigger when a different item is chosen
    if (index !== selectedIndex) {
      onChange(option.value)
      setSelectedIndex(index)
    }
  }

  const buildIndicatorClass = (option) => {
    let indicatorClass = 'dropdownItemIndicator'
    if (option.indicator === 'good') indicatorClass += ' dropdownItemIndicatorGood'
    if (option.indicator === 'bad') indicatorClass += ' dropdownItemIndicatorBad'
    return indicatorClass
  }

  const indicator = (option) => <div className={buildIndicatorClass(option)} />

  const height = `${options.length * ITEM_HEIGHT_PX}px`
  const marginTop = `${-ITEM_HEIGHT_PX * selectedIndex}px`

  return (
    <div className='dropdownWrap' ref={ref}>
      <div
        className={expanded ? `dropdown dropdownExpanded ${className}` : `dropdown ${className}`}
        style={expanded ? { ...style, height } : { ...style }}
        onClick={() => setExpanded(!expanded)}
      >
        <div className='dropdownItems' role='listbox' style={expanded ? {} : { marginTop }}>
          {options.map((option, index) => {
            const text = truncateLabel(option.text)
            const ariaSelected = index === selectedIndex ? 'true' : 'false'

            return (
              <div
                key={option.text + index}
                className='dropdownItem'
                role='option'
                style={option.style}
                aria-selected={ariaSelected}
                value={option.value}
                onMouseDown={() => handleSelect(option, index)}
              >
                {text}
                {indicator(option)}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

Dropdown.displayName = 'Dropdown'

export default Dropdown
