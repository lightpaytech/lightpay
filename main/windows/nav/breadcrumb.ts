// Named constants
const REQUEST_VIEW_NAME = 'requestView' as const
const REQUEST_STEP_CONFIRM = 'confirm' as const

export interface Breadcrumb {
  view: string
  data: any
}

type Step = typeof REQUEST_STEP_CONFIRM

interface RequestData {
  step: Step
  accountId: string
  requestId: string
}

export interface RequestBreadcrumb extends Omit<Breadcrumb, 'view'> {
  view: typeof REQUEST_VIEW_NAME
  data: RequestData
}
