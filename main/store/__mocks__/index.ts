/** Recursively reads a value at `path` from `obj` */
function getAtPath(obj: Record<string, any>, path: string[]): any {
  if (!obj) return obj
  if (path.length === 1) return obj[path[0]]
  return getAtPath(obj[path[0]], path.slice(1))
}

/** Immutably sets a value at `path` within `obj` */
function setAtPath(obj: Record<string, any>, path: string[], value: any): Record<string, any> {
  if (path.length === 1) {
    return { ...obj, [path[0]]: value }
  }

  obj[path[0]] = setAtPath(obj[path[0]] || {}, path.slice(1), value)
  return obj
}

const createStoreMock = function () {
  const internal: { state: Record<string, any>; observers: Record<string, any> } = {
    observers: {},
    state: {}
  }

  const store: any = function (...args: string[]) {
    const path = args.join('.').split('.')
    return getAtPath(internal.state, path)
  }

  store.clear = function () {
    internal.observers = {}
    internal.state = {}
  }

  store.getObserver = function (id: string) {
    return internal.observers[id]
  }

  store.observer = function (cb: () => void, id: string) {
    const observer = {
      fire: () => { cb() },
      remove: () => { delete internal.observers[id] }
    }

    internal.observers[id] = observer
    return observer
  }

  store.set = function (...args: any[]) {
    const path = args
      .slice(0, args.length - 1)
      .join('.')
      .split('.')
    const value = args[args.length - 1]

    internal.state = setAtPath(internal.state, path, value)
  }

  return store
}

module.exports = createStoreMock()
export default createStoreMock()
