// Connection state constants used by the view preload
const CONNECTION_STATE_INITIAL_OPACITY = '0'
const CONNECTION_STATE_READY_OPACITY = '1'
const CONNECTION_STATE_TRANSPARENT = 'transparent'
const CONNECTION_STATE_COLOR_SCHEME = 'light'
const META_COLOR_SCHEME_NAME = 'color-scheme'
const DOM_EVENT_CONTENT_LOADED = 'DOMContentLoaded'

document.addEventListener(
  DOM_EVENT_CONTENT_LOADED,
  () => {
    const meta = document.createElement('meta')
    meta.name = META_COLOR_SCHEME_NAME
    meta.content = CONNECTION_STATE_COLOR_SCHEME
    document.head?.appendChild(meta)
    document.documentElement.style.colorScheme = CONNECTION_STATE_COLOR_SCHEME

    document.body.style.opacity = CONNECTION_STATE_INITIAL_OPACITY
    const bg = document.body.style.backgroundColor
    document.body.style.backgroundColor = CONNECTION_STATE_TRANSPARENT
    document.documentElement.style.backgroundColor = CONNECTION_STATE_TRANSPARENT
    requestAnimationFrame(() => {
      document.body.style.backgroundColor = bg
      document.body.style.opacity = CONNECTION_STATE_READY_OPACITY
    })
  },
  false
)
