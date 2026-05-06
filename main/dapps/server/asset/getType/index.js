// MIME type map grouped by category
const SUPPORTED_MIME_TYPES = {
  scripts: {
    js: 'application/javascript'
  },
  styles: {
    css: 'text/css',
    html: 'text/html'
  },
  fonts: {
    ttf: 'application/font-sfnt'
  },
  images: {
    svg: 'image/svg+xml',
    jpeg: 'image/jpeg',
    jpg: 'image/jpeg',
    gif: 'image/gif',
    png: 'image/png'
  },
  data: {}
}

// Flattened lookup map derived from the grouped constant above
const types = Object.values(SUPPORTED_MIME_TYPES).reduce(
  (acc, group) => Object.assign(acc, group),
  {}
)

// Returns true when the extension has a known MIME type
function isSupportedType(extension) {
  return Object.prototype.hasOwnProperty.call(types, extension)
}

// Returns a human-readable description for a file extension
function getTypeDescription(extension) {
  if (SUPPORTED_MIME_TYPES.scripts[extension]) return 'script'
  if (SUPPORTED_MIME_TYPES.styles[extension]) return 'stylesheet/markup'
  if (SUPPORTED_MIME_TYPES.fonts[extension]) return 'font'
  if (SUPPORTED_MIME_TYPES.images[extension]) return 'image'
  return 'unknown'
}

module.exports = (path) => types[path.substr(path.lastIndexOf('.') + 1)] || 'text/plain'
module.exports.SUPPORTED_MIME_TYPES = SUPPORTED_MIME_TYPES
module.exports.isSupportedType = isSupportedType
module.exports.getTypeDescription = getTypeDescription
