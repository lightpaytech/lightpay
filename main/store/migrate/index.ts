import log from 'electron-log'

import legacyMigrations from './migrations/legacy'
import migration38 from './migrations/38'
import migration39 from './migrations/39'
import migration40 from './migrations/40'
import migration41 from './migrations/41'

import type { Migration } from '../state'

const migrations: Migration[] = [
  ...legacyMigrations,
  migration38,
  migration39,
  migration40,
  migration41
].sort((m1, m2) => m1.version - m2.version)

// Validate that no two migrations share the same version number
const versionSet = new Set<number>()
for (const m of migrations) {
  if (versionSet.has(m.version)) {
    throw new Error(`Duplicate migration version detected: ${m.version}`)
  }
  versionSet.add(m.version)
}

// Version number of latest known migration
const latest = migrations[migrations.length - 1].version

/**
 * Returns the version number of the latest registered migration.
 * Useful for callers that need to know the current schema version
 * without importing the full migration list.
 */
function getMigrationVersion(): number {
  return latest
}

export default {
  /** Apply all pending migrations up to migrateToVersion */
  apply: (state: any, migrateToVersion = latest) => {
    state.main._version = state.main._version || 0

    migrations.forEach(({ version, migrate }) => {
      if (state.main._version < version && version <= migrateToVersion) {
        log.info(`Applying state migration: ${version}`)

        state = migrate(state)
        state.main._version = version
      }
    })

    return state
  },
  getMigrationVersion,
  latest
}
