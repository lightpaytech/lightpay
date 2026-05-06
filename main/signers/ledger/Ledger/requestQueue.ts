import log from 'electron-log'

export interface Request {
  execute: () => Promise<any>
  type: string
}

/** Maximum number of requests allowed in the queue at one time. */
const MAX_QUEUE_SIZE = 100

const noRequest = {
  type: 'emptyQueue',
  execute: () => Promise.resolve()
}

export class RequestQueue {
  private running = false
  private requestQueue: Array<Request> = []
  private requestPoller = setTimeout(() => {})
  private totalProcessed = 0

  add(request: Request) {
    if (this.requestQueue.length >= MAX_QUEUE_SIZE) {
      log.warn(
        `RequestQueue: queue size limit (${MAX_QUEUE_SIZE}) reached, dropping request of type "${request.type}"`
      )
      return
    }
    this.requestQueue.push(request)
  }

  pollRequest() {
    // each request must return a promise
    const request = this.requestQueue.length === 0 ? noRequest : this.requestQueue.splice(0, 1)[0]

    if (request !== noRequest) {
      this.totalProcessed++
    }

    request
      .execute()
      .catch((err) => log.warn('Ledger request queue caught unexpected error', err))
      .finally(() => {
        if (this.running) {
          this.requestPoller = setTimeout(this.pollRequest.bind(this), 200)
        }
      })
  }

  start() {
    this.running = true
    this.pollRequest()
  }

  stop() {
    this.running = false
    clearTimeout(this.requestPoller)
  }

  close() {
    this.stop()
    this.clear()
  }

  clear() {
    this.requestQueue = []
  }

  peekBack() {
    return this.requestQueue[this.requestQueue.length - 1]
  }

  /**
   * Returns a snapshot of the current queue state for diagnostics and monitoring.
   */
  getQueueStats(): { pending: number; running: boolean; totalProcessed: number; maxSize: number } {
    return {
      pending: this.requestQueue.length,
      running: this.running,
      totalProcessed: this.totalProcessed,
      maxSize: MAX_QUEUE_SIZE
    }
  }
}
