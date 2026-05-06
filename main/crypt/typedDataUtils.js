// Translated to JavaScript from https://github.com/dicether/eip712/blob/master/src/eip712.ts
const abi = require('ethereumjs-abi')
const ethUtil = require('@ethereumjs/util')

// Named constants
const TYPED_DATA_PREFIX_HEX = '1901'
const EIP712_DOMAIN_TYPE = 'EIP712Domain'
const TYPED_DATA_VERSION_V1 = 'V1'
const TYPED_DATA_VERSION_V3 = 'V3'
const TYPED_DATA_VERSION_V4 = 'V4'
const BYTES32_ABI_TYPE = 'bytes32'
const ARRAY_SUFFIX = ']'

const PRIMITIVE_TYPES = [
  /^bytes[0-9]|[0-2][0-9]|3[0-2]$/,
  /^(?:uint)8|16|32|64|128|256$/,
  /^(?:int)8|16|32|64|128|256$/,
  /^address$/,
  /^bool$/,
  /^bytes$/,
  /^string$/
]

function isPrimitiveType(type) {
  return PRIMITIVE_TYPES.some((regex) => regex.test(type))
}

// Detects which EIP-712 version a typed data object conforms to
function detectTypedDataVersion(typedData) {
  if (!typedData || typeof typedData !== 'object') return null
  if (Array.isArray(typedData)) return TYPED_DATA_VERSION_V1
  if (typedData.types && typedData.domain && typedData.primaryType) {
    // V4 supports arrays in types; V3 does not
    const hasArrayTypes = Object.values(typedData.types || {}).some((fields) =>
      fields.some((f) => f.type.endsWith(ARRAY_SUFFIX))
    )
    return hasArrayTypes ? TYPED_DATA_VERSION_V4 : TYPED_DATA_VERSION_V3
  }
  return null
}

// Validates the total property count across all types in a typed data payload
function validatePropertyCount(types, maxProperties) {
  if (!types || typeof types !== 'object') return false
  const total = Object.values(types).reduce((sum, fields) => sum + (Array.isArray(fields) ? fields.length : 0), 0)
  return maxProperties == null || total <= maxProperties
}

// Recursively finds all the dependencies of a type
function dependencies(primaryType, types, found = []) {
  if (found.includes(primaryType)) {
    return found
  }
  if (types[primaryType] === undefined) {
    if (!isPrimitiveType(primaryType)) {
      throw Error(`${primaryType} is not a primitive type!`)
    }
    return found
  }
  found.push(primaryType)
  for (const field of types[primaryType]) {
    for (const dep of dependencies(field.type, types, found)) {
      if (!found.includes(dep)) {
        found.push(dep)
      }
    }
  }
  return found
}

function encodeType(primaryType, types) {
  // Get dependencies primary first, then alphabetical
  let deps = dependencies(primaryType, types)
  deps = deps.filter((t) => t !== primaryType)
  deps = [primaryType].concat(deps.sort())

  // Format as a string with fields
  let result = ''
  for (const depType of deps) {
    result += `${depType}(${types[depType].map(({ name, type }) => `${type} ${name}`).join(',')})`
  }

  return Buffer.from(result)
}

function typeHash(primaryType, types) {
  return ethUtil.keccak256(encodeType(primaryType, types))
}

function encodeData(primaryType, types, data) {
  const encTypes = []
  const encValues = []

  // Add typehash
  encTypes.push(BYTES32_ABI_TYPE)
  encValues.push(typeHash(primaryType, types))

  // Add field contents
  for (const field of types[primaryType]) {
    const value = data[field.name]
    if (value === undefined) {
      throw Error(`Invalid typed data! Data for ${field.name} not found!`)
    }

    if (field.type === 'string' || field.type === 'bytes') {
      encTypes.push(BYTES32_ABI_TYPE)
      const valueHash = ethUtil.keccak256(Buffer.from(value))
      encValues.push(valueHash)
    } else if (types[field.type] !== undefined) {
      encTypes.push(BYTES32_ABI_TYPE)
      const valueHash = ethUtil.keccak256(encodeData(field.type, types, value))
      encValues.push(valueHash)
    } else if (field.type.lastIndexOf(ARRAY_SUFFIX) === field.type.length - 1) {
      throw new Error('Arrays currently not implemented!')
    } else {
      if (!isPrimitiveType(field.type)) {
        throw Error(`Invalid primitive type ${field.type}`)
      }

      encTypes.push(field.type)
      encValues.push(value)
    }
  }

  return abi.rawEncode(encTypes, encValues)
}

function structHash(primaryType, types, data) {
  return ethUtil.keccak256(encodeData(primaryType, types, data))
}

function hashTypedData(typedData) {
  return ethUtil.keccak256(
    Buffer.concat([
      Buffer.from(TYPED_DATA_PREFIX_HEX, 'hex'),
      structHash(EIP712_DOMAIN_TYPE, typedData.types, typedData.domain),
      structHash(typedData.primaryType, typedData.types, typedData.message)
    ])
  )
}

module.exports = { hashTypedData, detectTypedDataVersion, validatePropertyCount }
