import { matchFilter, getAddress } from '../../../resources/utils'
import { formatGwei, weiToGwei } from '../../../resources/utils/numbers'

// ── Fixtures ─────────────────────────────────────────────────────────────────

const SAMPLE_ADDRESS_LOWER   = '0x81aa3e376ea6e4b238a213324220c1a515031d12'
const SAMPLE_ADDRESS_CHECKSUMMED = '0x81aA3e376ea6e4b238a213324220c1A515031D12'
const SAMPLE_ADDRESS_BAD_CHECKSUM = '0x81aa3e376ea6e4b238a213324220C1a515031D12'

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('#matchFilter', () => {
  describe('whole-filter matching', () => {
    it('matches when the entire filter string matches a single property', () => {
      const matched = matchFilter('one two', ['one two', 'a', 'b'])
      expect(matched).toBe(true)
    })
  })

  describe('split-token matching', () => {
    it('matches when every split token matches any property', () => {
      const matched = matchFilter('one two', ['one', 'two', 'c', 'd'])
      expect(matched).toBe(true)
    })

    it('does not match when only one split token matches', () => {
      const matched = matchFilter('one two', ['one', 'b', 'c', 'd'])
      expect(matched).toBe(false)
    })

    it('matches when every split token partially matches any property', () => {
      const matched = matchFilter('one two three', ['zero one', 'two', 'three four five'])
      expect(matched).toBe(true)
    })

    it('does not match when no properties match the filter', () => {
      const matched = matchFilter('one', ['a', 'b', 'c', 'd'])
      expect(matched).toBe(false)
    })
  })

  describe('falsy/empty filter edge cases', () => {
    it('matches when the filter is an empty string', () => {
      const matched = matchFilter('', ['zero one', 'two', 'three four five'])
      expect(matched).toBe(true)
    })

    it('matches when the filter is undefined', () => {
      const matched = matchFilter(undefined, ['zero one', 'two', 'three four five'])
      expect(matched).toBe(true)
    })
  })

  describe('falsy property handling', () => {
    it('does not match against undefined properties', () => {
      const matched = matchFilter('zero', [undefined])
      expect(matched).toBe(false)
    })

    it('matches when at least one non-falsy property satisfies the filter', () => {
      const matched = matchFilter('zero', [undefined, 'zeroth'])
      expect(matched).toBe(true)
    })
  })
})

describe('#getAddress', () => {
  describe('address checksumming', () => {
    it('returns a properly checksummed address from a lowercase input', () => {
      expect(getAddress(SAMPLE_ADDRESS_LOWER)).toBe(SAMPLE_ADDRESS_CHECKSUMMED)
    })

    it('corrects an address with an invalid checksum', () => {
      expect(getAddress(SAMPLE_ADDRESS_BAD_CHECKSUM)).toBe(SAMPLE_ADDRESS_CHECKSUMMED)
    })
  })
})

describe('#formatGwei', () => {
  describe('converting wei bigints to Gwei strings', () => {
    it('formats 1e9 wei as "1" Gwei', () => {
      expect(formatGwei(1_000_000_000n)).toBe('1')
    })

    it('formats 1.5e9 wei as "1.5" Gwei', () => {
      expect(formatGwei(1_500_000_000n)).toBe('1.5')
    })

    it('formats 0 wei as "0"', () => {
      expect(formatGwei(0n)).toBe('0')
    })

    it('throws on negative wei', () => {
      expect(() => formatGwei(-1n)).toThrow(RangeError)
    })
  })
})

describe('#weiToGwei', () => {
  describe('converting decimal/hex wei strings to Gwei numbers', () => {
    it('converts a decimal wei string', () => {
      expect(weiToGwei('2000000000')).toBe(2)
    })

    it('converts a hex wei string', () => {
      expect(weiToGwei('0x77359400')).toBe(2)
    })

    it('throws on an empty string', () => {
      expect(() => weiToGwei('')).toThrow(TypeError)
    })

    it('throws on a non-numeric string', () => {
      expect(() => weiToGwei('not-a-number')).toThrow(RangeError)
    })
  })
})
