import { render, screen, cleanup } from '../../../componentSetup'
import { DisplayValue } from '../../../../resources/Components/DisplayValue'
import { displayValueData } from '../../../../resources/utils/displayValue'
import { MAX_HEX } from '../../../../resources/constants'

// ── Fixtures ─────────────────────────────────────────────────────────────────

const CURRENCY_SYMBOL = 'LPT'
const FIAT_SYMBOL     = '$'
const ETH_SYMBOL      = 'ETH'
const FIAT_RATE_PARAMS = { currencyRate: { price: 1.5 } }

// ── Teardown ──────────────────────────────────────────────────────────────────

afterEach(() => cleanup())

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('<DisplayValue />', () => {
  describe('rendering with valueData object', () => {
    it('renders the expected content when given a pre-built valueData', () => {
      const valueData = new displayValueData(356e28)
      render(<DisplayValue value={valueData} />)

      expect(screen.getByTestId('display-value').textContent).toBe('3.56T')
    })

    it('renders the expected content when given a value and valueDataParams', () => {
      render(<DisplayValue value={356e24} valueDataParams={{ decimals: 12 }} />)

      expect(screen.getByTestId('display-value').textContent).toBe('356T')
    })
  })

  describe('currency symbol positioning', () => {
    it('renders a currency symbol before the value by default', () => {
      render(<DisplayValue value={356e18} currencySymbol={CURRENCY_SYMBOL} />)

      expect(screen.getByTestId('display-value').textContent).toBe(`${CURRENCY_SYMBOL}356`)
    })

    it('renders a currency symbol after the value when currencySymbolPosition is "last"', () => {
      render(
        <DisplayValue value={356e18} currencySymbol={CURRENCY_SYMBOL} currencySymbolPosition='last' />
      )

      expect(screen.getByTestId('display-value').textContent).toBe(`356${CURRENCY_SYMBOL}`)
    })
  })

  describe('fiat value rendering', () => {
    it('renders a fiat value', () => {
      render(
        <DisplayValue
          value={356e28}
          valueDataParams={FIAT_RATE_PARAMS}
          type='fiat'
          currencySymbol={FIAT_SYMBOL}
        />
      )

      expect(screen.getByTestId('display-value').textContent).toBe('$5.34T')
    })

    it('does not display decimals on a small fiat value when displayDecimals is false', () => {
      render(
        <DisplayValue
          value={356e16}
          displayDecimals={false}
          valueDataParams={FIAT_RATE_PARAMS}
          type='fiat'
          currencySymbol={FIAT_SYMBOL}
        />
      )

      expect(screen.getByTestId('display-value').textContent).toBe('$5')
    })

    it('renders the full value without shorthand unit when displayFullValue is set', () => {
      render(
        <DisplayValue
          value={356e28}
          valueDataParams={{ displayFullValue: true, ...FIAT_RATE_PARAMS }}
          type='fiat'
          currencySymbol={FIAT_SYMBOL}
        />
      )

      expect(screen.getByTestId('display-value').textContent).toBe('$5,340,000,000,000.00')
    })
  })

  describe('ether value rendering', () => {
    it('renders an ether value', () => {
      render(<DisplayValue value={356e28} type='ether' currencySymbol={ETH_SYMBOL} />)

      expect(screen.getByTestId('display-value').textContent).toBe('ETH3.56T')
    })

    it('does not display decimals on a small ether value when displayDecimals is false', () => {
      render(<DisplayValue value={356e16} displayDecimals={false} type='ether' currencySymbol={ETH_SYMBOL} />)

      expect(screen.getByTestId('display-value').textContent).toBe('ETH3')
    })

    it('renders the full ether value without shorthand when displayFullValue is set', () => {
      render(
        <DisplayValue
          value={356e28}
          valueDataParams={{ displayFullValue: true }}
          type='ether'
          currencySymbol={ETH_SYMBOL}
        />
      )

      expect(screen.getByTestId('display-value').textContent).toBe('ETH3,560,000,000,000')
    })
  })

  describe('unlimited value', () => {
    it('renders "Unlimited" for a MAX_HEX value', () => {
      render(<DisplayValue value={MAX_HEX} currencySymbol={ETH_SYMBOL} currencySymbolPosition='last' />)

      expect(screen.getByTestId('display-value').textContent).toBe('UnlimitedETH')
    })
  })
})
