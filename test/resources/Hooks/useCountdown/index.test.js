import { render, screen, act, cleanup } from '../../../componentSetup'
import useCountdown from '../../../../resources/Hooks/useCountdown'

// ── Fixtures ─────────────────────────────────────────────────────────────────

const START_DATE = new Date('2023-01-01')
const NEXT_DAY   = new Date('2023-01-02')

const ONE_SECOND  = 1_000
const ONE_MINUTE  = 1_000 * 60
const ONE_HOUR    = 1_000 * 60 * 60
const ONE_DAY_MS  = 1_000 * 60 * 60 * 24

// ── Test component ────────────────────────────────────────────────────────────

const TimerDisplay = ({ end }) => {
  const ttl = useCountdown(end)
  return <div role='timer'>{ttl}</div>
}

// ── Setup / teardown ──────────────────────────────────────────────────────────

beforeEach(() => {
  jest.setSystemTime(START_DATE)
})

afterEach(() => cleanup())

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useCountdown', () => {
  describe('initial countdown value', () => {
    it('correctly sets the initial countdown time', () => {
      render(<TimerDisplay end={NEXT_DAY.getTime()} />)
      expect(screen.getByRole('timer').textContent).toBe('24h')
    })
  })

  describe('time unit labels', () => {
    it('uses the correct label for seconds', () => {
      render(<TimerDisplay end={START_DATE.getTime() + ONE_SECOND} />)
      expect(screen.getByRole('timer').textContent).toBe('1s')
    })

    it('uses the correct label for minutes', () => {
      render(<TimerDisplay end={START_DATE.getTime() + ONE_MINUTE} />)
      expect(screen.getByRole('timer').textContent).toBe('1m')
    })

    it('uses the correct label for hours', () => {
      render(<TimerDisplay end={START_DATE.getTime() + ONE_HOUR} />)
      expect(screen.getByRole('timer').textContent).toBe('1h')
    })
  })

  describe('countdown progression', () => {
    it('updates the countdown time after one second has elapsed', () => {
      render(<TimerDisplay end={NEXT_DAY.getTime()} />)

      act(() => {
        jest.advanceTimersByTime(ONE_SECOND)
      })

      expect(screen.getByRole('timer').textContent).toBe('23h 59m 59s')
    })
  })

  describe('expired countdown', () => {
    it('shows EXPIRED when the full countdown duration has elapsed', () => {
      render(<TimerDisplay end={NEXT_DAY.getTime()} />)

      act(() => {
        jest.advanceTimersByTime(ONE_DAY_MS)
      })

      expect(screen.getByRole('timer').textContent).toBe('EXPIRED')
    })

    it('shows EXPIRED immediately when a past date is provided', () => {
      render(<TimerDisplay end={START_DATE.getDate() - 1} />)
      expect(screen.getByRole('timer').textContent).toBe('EXPIRED')
    })
  })
})
