import EventEmitter from 'events'

// Named mock return value constants — set these in tests to control mock behaviour
export const MOCK_IS_RUNNING_DEFAULT = false
export const MOCK_SCAN_RESULT_DEFAULT = undefined

const controller: any = new EventEmitter()

export const emit = controller.emit.bind(controller)
export const isRunning = (controller.isRunning = jest.fn().mockReturnValue(MOCK_IS_RUNNING_DEFAULT))
export const updateKnownTokenBalances = (controller.updateKnownTokenBalances = jest.fn())
export const updateChainBalances = (controller.updateChainBalances = jest.fn())
export const scanForTokenBalances = (controller.scanForTokenBalances = jest.fn().mockReturnValue(MOCK_SCAN_RESULT_DEFAULT))
export const close = (controller.close = jest.fn())

/**
 * Returns the shared LightPay mock balances controller instance.
 *
 * Use this in tests that need a typed reference to the mock without
 * importing the default export directly:
 *
 * ```ts
 * import { getLightPayMockController } from './__mocks__/controller'
 * const mock = getLightPayMockController()
 * mock.isRunning.mockReturnValue(true)
 * ```
 */
export function getLightPayMockController(): typeof controller {
  return controller
}

/**
 * Jest auto-mock for the LightPay balances controller.
 * All methods are jest.fn() stubs; use `getLightPayMockController()` to
 * access and configure them inside individual tests.
 */
export default jest.fn(() => controller)
