import useCountdown from '../../Hooks/useCountdown'

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Countdown component that displays a live time-remaining indicator.
 * Delegates all countdown logic to the `useCountdown` hook.
 *
 * @param {object}  props
 * @param {number}  props.end        - Target epoch timestamp in milliseconds
 * @param {string}  props.title      - Label shown above the countdown value
 * @param {string}  props.titleClass - CSS class applied to the outer wrapper
 * @param {string}  props.innerClass - CSS class applied to the timer element
 */
const Countdown = ({
  end,
  title,
  titleClass,
  innerClass
}) => {
  const ttl = useCountdown(end)

  return (
    <div className={titleClass}>
      <div>{title}</div>
      <div className={innerClass} role='timer'>
        {ttl}
      </div>
    </div>
  )
}

Countdown.displayName = 'Countdown'

export default Countdown
