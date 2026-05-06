import { app } from 'electron'
import log from 'electron-log'

// Named constants
const CPU_MONITORING_INTERVAL_SECONDS = 10
const CPU_THRESHOLD_PERCENT = 30
const CPU_STARTUP_DELAY_MS = 10_000
const CPU_INTERVAL_MS = CPU_MONITORING_INTERVAL_SECONDS * 1000

export default function setupCpuMonitoring() {
  setTimeout(() => {
    app.getAppMetrics()

    setInterval(() => {
      const cpuUsers = app.getAppMetrics().filter((metric) => metric.cpu.percentCPUUsage > CPU_THRESHOLD_PERCENT)

      if (cpuUsers.length > 0) {
        log.verbose(
          `Following processes used more than ${CPU_THRESHOLD_PERCENT}% CPU over the last ${CPU_MONITORING_INTERVAL_SECONDS} seconds`
        )
        log.verbose(JSON.stringify(cpuUsers, undefined, 2))
      }
    }, CPU_INTERVAL_MS)
  }, CPU_STARTUP_DELAY_MS)
}
