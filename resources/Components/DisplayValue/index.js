import { displayValueData } from '../../utils/displayValue'
import { MAX_HEX } from '../../constants'

import BigNumber from 'bignumber.js'

// ─── Constants ────────────────────────────────────────────────────────────────

/** Sentinel display value shown when the user approved an unlimited allowance */
const UNLIMITED_DISPLAY_VALUE = 'Unlimited'

/** Default currency symbol position within the rendered display value */
const DEFAULT_SYMBOL_POSITION = 'first'

/** Default value type rendered when no `type` prop is supplied */
const DEFAULT_VALUE_TYPE = 'ether'

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Returns true when `obj` is already a fully-formed `DisplayValueData` object
 * (i.e. produced by `displayValueData()`), meaning we can skip re-computation.
 */
function isDisplayValueData(obj) {
  return obj?.fiat && obj?.ether && obj?.gwei && obj?.wei && BigNumber.isBigNumber(obj.bn)
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const ApproximateValue = ({ approximationSymbol }) => (
  <span className='displayValueApprox'>{approximationSymbol}</span>
)
ApproximateValue.displayName = 'DisplayValue__ApproximateValue'

const FiatSymbol = ({ fiatSymbol }) => (
  <span className='displayValueFiat'>{fiatSymbol}</span>
)
FiatSymbol.displayName = 'DisplayValue__FiatSymbol'

const Symbol = ({ currencySymbol }) => (
  <span className='displayValueSymbol'>{currencySymbol.toUpperCase()}</span>
)
Symbol.displayName = 'DisplayValue__Symbol'

const Main = ({ displayValue }) => (
  <span className='displayValueMain'>{displayValue}</span>
)
Main.displayName = 'DisplayValue__Main'

const Unit = ({ displayUnit }) => (
  <span className='displayValueUnit'>{displayUnit.shortName}</span>
)
Unit.displayName = 'DisplayValue__Unit'

// ─── Exported helper components ───────────────────────────────────────────────

export const DisplayCoinBalance = ({ amount, symbol, decimals }) => (
  <DisplayValue
    type='ether'
    value={amount}
    currencySymbol={symbol}
    currencySymbolPosition='last'
    valueDataParams={{ decimals }}
  />
)
DisplayCoinBalance.displayName = 'DisplayCoinBalance'

export const DisplayFiatPrice = ({ decimals, currencyRate, isTestnet }) => (
  <DisplayValue
    type='fiat'
    value={`1e${decimals}`}
    valueDataParams={{ decimals, currencyRate, isTestnet, displayFullValue: true }}
    currencySymbol='$'
  />
)
DisplayFiatPrice.displayName = 'DisplayFiatPrice'

// ─── Main component ───────────────────────────────────────────────────────────

export const DisplayValue = ({
  value,
  valueDataParams,
  currencySymbol,
  type = DEFAULT_VALUE_TYPE,
  displayDecimals = true,
  currencySymbolPosition = DEFAULT_SYMBOL_POSITION
}) => {
  const data = isDisplayValueData(value) ? value : displayValueData(value, valueDataParams)

  const {
    approximationSymbol = '',
    displayValue,
    displayUnit = ''
  } = value === MAX_HEX ? { displayValue: UNLIMITED_DISPLAY_VALUE } : data[type]({ displayDecimals })

  return (
    <div className='displayValue' data-testid='display-value'>
      {type === 'fiat' ? (
        <>
          {approximationSymbol && <ApproximateValue approximationSymbol={approximationSymbol} />}
          {currencySymbol && <FiatSymbol fiatSymbol={currencySymbol} />}
        </>
      ) : (
        <>
          {currencySymbol && currencySymbolPosition === 'first' && <Symbol currencySymbol={currencySymbol} />}
          {approximationSymbol && <ApproximateValue approximationSymbol={approximationSymbol} />}
        </>
      )}
      <Main displayValue={displayValue} />
      {displayUnit && <Unit displayUnit={displayUnit} />}
      {currencySymbol && currencySymbolPosition === 'last' && <Symbol currencySymbol={currencySymbol} />}
    </div>
  )
}
DisplayValue.displayName = 'DisplayValue'
