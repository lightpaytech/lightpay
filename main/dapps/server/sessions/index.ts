// Named constant for session max age (ms) — sessions older than this are considered expired
const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000 // 24 hours

export interface SessionConfig {
  maxAge: number
}

const sessions: Record<string, string[]> = {}
const timers: Record<string, NodeJS.Timeout> = {}

// Returns the total number of currently tracked sessions across all apps
function getSessionCount(): number {
  return Object.values(sessions).reduce((total, list) => total + list.length, 0)
}

// Returns true when the session's createdAt timestamp exceeds SESSION_MAX_AGE_MS
function isSessionExpired(session: { createdAt: number }): boolean {
  return Date.now() - session.createdAt > SESSION_MAX_AGE_MS
}

export default {
  add: (app: string, session: string) => {
    app = app.replaceAll('.', '-')
    sessions[app] = sessions[app] || []
    sessions[app].push(session)
  },
  verify: (app: string, session: string) => {
    app = app.replaceAll('.', '-')
    clearTimeout(timers[session])
    return sessions[app] && sessions[app].indexOf(session) > -1
  },
  remove: (app: string, session: string) => {
    app = app.replaceAll('.', '-')
    sessions[app].splice(sessions[app].indexOf(session), 1)
    if (sessions[app].length === 0) delete sessions[app]
  }
}

export { SESSION_MAX_AGE_MS, getSessionCount, isSessionExpired }
