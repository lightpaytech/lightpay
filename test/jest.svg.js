import { forwardRef } from 'react'

// SVGs are mocked in tests because Jest/jsdom cannot process binary SVG imports.
// Replacing them with a lightweight React component avoids transform errors and
// keeps snapshot output stable across environments.
export const LIGHTPAY_SVG_MOCK_NAME = 'LightPaySvgMock'

const Component = (props = {}, ref = {}) => <svg ref={ref} {...props} />

const ReactComponent = forwardRef(Component)

exports = {
  ReactComponent,
  default: 'file.svg'
}
