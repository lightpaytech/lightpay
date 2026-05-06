import log from 'electron-log'
import { fork, _forkedChildProcess as childProcess } from 'child_process'

import WorkerProcess from '../../../main/worker/process'

jest.mock('child_process')

beforeAll(() => {
  log.transports.console.level = false
})

afterAll(() => {
  log.transports.console.level = 'debug'
})

// Shared worker configuration fixtures
const defaultWorkerConfig = {
  name: 'lightpay-test-worker',
  modulePath: './test.js'
}

let worker

describe('initializing', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should create a forked process using the provided module', () => {
    worker = new WorkerProcess({
      name: 'lightpay-test-worker',
      modulePath: './test.js',
      args: ['--someFlag', '-t'],
      env: {
        MY_VAR: 'true'
      }
    })

    expect(fork).toHaveBeenCalledWith('./test.js', ['--someFlag', '-t'], {
      signal: expect.anything(),
      env: { MY_VAR: 'true' }
    })
  })

  it('kills the process after the provided timeout', () => {
    jest.useFakeTimers()

    worker = new WorkerProcess({
      name: 'lightpay-test-worker',
      timeout: 60000
    })

    jest.advanceTimersByTime(60000)

    expect(childProcess.kill).toHaveBeenCalledWith('SIGABRT')

    jest.useRealTimers()
  })
})

describe('events', () => {
  beforeEach(() => {
    worker = new WorkerProcess(defaultWorkerConfig)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('emits an event when a message is received from the LightPay worker', () => {
    let emittedData = ''

    worker.once('update', (data) => (emittedData = data))

    childProcess.emit('message', { event: 'update', payload: 'hello, world!' })

    expect(emittedData).toBe('hello, world!')
  })

  it('exits if an error event is received', () => {
    let exitEmitted = false

    worker.once('exit', () => (exitEmitted = true))

    childProcess.emit('error')

    expect(childProcess.kill).toHaveBeenCalled()
    expect(exitEmitted).toBe(true)
  })

  it('exits if an exit event is received', () => {
    let exitEmitted = false

    worker.once('exit', () => (exitEmitted = true))

    childProcess.emit('exit')

    expect(childProcess.kill).toHaveBeenCalled()
    expect(exitEmitted).toBe(true)
  })
})

describe('api', () => {
  beforeEach(() => {
    worker = new WorkerProcess(defaultWorkerConfig)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('#send', () => {
    it('sends a command and args to the worker process', () => {
      worker.send('testCommand', { fruit: 'orange' }, 'metadata')

      expect(childProcess.send).toHaveBeenCalledWith({
        command: 'testCommand',
        args: [{ fruit: 'orange' }, 'metadata']
      })
    })
  })

  describe('#kill', () => {
    it('emits an exit event', () => {
      let exitEmitted = false

      worker.once('exit', () => (exitEmitted = true))
      worker.kill()

      expect(exitEmitted).toBe(true)
    })

    it('kills the worker process with the given signal', () => {
      worker.kill('SIGHUP')

      expect(childProcess.kill).toHaveBeenCalledWith('SIGHUP')
    })

    it('removes listeners after emitting the exit event', () => {
      let numExitEvents = 0

      worker.on('exit', () => (numExitEvents += 1))
      worker.kill()
      worker.kill()

      expect(numExitEvents).toBe(1)
    })
  })
})
