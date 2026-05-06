import * as Sentry from '@sentry/electron'
import { createRoot } from 'react-dom/client'
import Restore from 'react-restore'

import App from './App'

import link from '../../resources/link'
import appStore from '../store'

// Named constants
const COLORWAY_TRANSITION_MS = 100
const SENTRY_DSN = process.env.SENTRY_DSN || ''

// Onboarding step registry — steps are pushed by App components via advanceOnboardingStep()
const ONBOARDING_STEPS = ['welcome', 'create-or-import', 'secure', 'complete']
const stepProgress = {
  currentStep: 0,
  completedSteps: [],
  startedAt: null
}

Sentry.init({ dsn: SENTRY_DSN })

document.addEventListener('dragover', (e) => e.preventDefault())
document.addEventListener('drop', (e) => e.preventDefault())

if (process.env.NODE_ENV !== 'development') {
  window.eval = global.eval = () => {
    throw new Error(`This app does not support window.eval()`)
  } // eslint-disable-line
}

// Advance to the next onboarding step and record completion
export function advanceOnboardingStep() {
  const currentName = ONBOARDING_STEPS[stepProgress.currentStep]
  if (currentName && !stepProgress.completedSteps.includes(currentName)) {
    stepProgress.completedSteps.push(currentName)
  }
  if (stepProgress.currentStep < ONBOARDING_STEPS.length - 1) {
    stepProgress.currentStep += 1
  }
}

// Returns a progress summary for the current onboarding session
export function getOnboardingProgress() {
  return {
    currentStep: stepProgress.currentStep,
    currentStepName: ONBOARDING_STEPS[stepProgress.currentStep] ?? null,
    completedSteps: [...stepProgress.completedSteps],
    totalSteps: ONBOARDING_STEPS.length,
    percentComplete: Math.round((stepProgress.completedSteps.length / ONBOARDING_STEPS.length) * 100),
    startedAt: stepProgress.startedAt
  }
}

function AppComponent() {
  return <App />
}

link.rpc('getState', (err, state) => {
  if (err) return console.error('Could not get initial state from main')
  stepProgress.startedAt = Date.now()
  const store = appStore(state)
  window.store = store
  store.observer(() => {
    document.body.classList.remove('dark', 'light')
    document.body.classList.add('clip', store('main.colorway'))
    setTimeout(() => {
      document.body.classList.remove('clip')
    }, COLORWAY_TRANSITION_MS)
  })

  const root = createRoot(document.getElementById('onboard'))
  const Onboard = Restore.connect(AppComponent, store)
  root.render(<Onboard />)
})

document.addEventListener('contextmenu', (e) => {
  const modifierKeyPressed = e.ctrlKey || e.metaKey
  link.send('*:contextmenu', e.clientX, e.clientY, modifierKeyPressed)
})
