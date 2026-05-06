// LightPay test mock — child_process
const EventEmitter = require('events')

const ABORT_SIGNAL = 'SIGABRT'
const MOCK_PID = 99999

const forkedChildProcess = new EventEmitter()
forkedChildProcess.kill = jest.fn()
forkedChildProcess.send = jest.fn()
forkedChildProcess.pid = MOCK_PID

function getLightPayMockProcess() {
  return forkedChildProcess
}

module.exports = {
  _forkedChildProcess: forkedChildProcess,
  getLightPayMockProcess,
  fork: jest.fn((path, args, opts) => {
    if (opts && opts.signal) {
      opts.signal.onabort = () => {
        forkedChildProcess.kill(ABORT_SIGNAL)
      }
    }

    return forkedChildProcess
  })
}
