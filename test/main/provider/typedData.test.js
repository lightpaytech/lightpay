import { getVersionFromTypedData } from '../../../main/provider/typedData'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const EIP712_DOMAIN_FIELDS = [
  { name: 'name', type: 'string' },
  { name: 'version', type: 'string' },
  { name: 'chainId', type: 'uint256' },
  { name: 'verifyingContract', type: 'address' }
]

const TYPED_DATA_V4 = {
  types: {
    EIP712Domain: EIP712_DOMAIN_FIELDS,
    Person: [
      { name: 'name', type: 'string' },
      { name: 'wallet', type: 'address' }
    ],
    Mail: [
      { name: 'from', type: 'Person' },
      { name: 'to', type: 'Person' },
      { name: 'contents', type: 'string' }
    ]
  },
  domain: 'domainData',
  primaryType: 'Mail',
  message: {
    from: {
      name: 'Cow',
      wallet: '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826'
    },
    to: {
      name: 'Bob',
      wallet: '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB'
    },
    contents: 'Hello!'
  }
}

const TYPED_DATA_LEGACY = [
  {
    type: 'string',
    name: 'fullName',
    value: 'Satoshi Nakamoto'
  },
  {
    type: 'uint32',
    name: 'userId',
    value: '1212'
  }
]

const TYPED_DATA_RECURSIVE = {
  ...TYPED_DATA_V4,
  types: {
    EIP712Domain: EIP712_DOMAIN_FIELDS,
    Person: [
      { name: 'name', type: 'string' },
      { name: 'mother', type: 'Person' },
      { name: 'father', type: 'Person' }
    ]
  },
  primaryType: 'Person',
  message: {
    name: 'Satoshi Nakamoto',
    mother: { name: 'unknown' },
    father: { name: 'unknown' }
  }
}

const TYPED_DATA_WITH_ARRAYS = {
  ...TYPED_DATA_V4,
  types: {
    EIP712Domain: EIP712_DOMAIN_FIELDS,
    Person: [
      { name: 'name', type: 'string' },
      { name: 'wallet', type: 'address' }
    ],
    Mail: [
      { name: 'from', type: 'Person' },
      { name: 'to', type: 'Person' },
      { name: 'contents', type: 'string' }
    ],
    Group: [
      { name: 'name', type: 'string' },
      { name: 'members', type: 'Person[]' }
    ]
  }
}

const TYPED_DATA_ARRAYS_INVALID = {
  ...TYPED_DATA_WITH_ARRAYS,
  primaryType: 'b0rk'
}

const TYPED_DATA_NULL_CUSTOM_TYPE = {
  ...TYPED_DATA_V4,
  message: {
    to: null,
    from: {
      name: 'Cow',
      wallet: '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826'
    },
    contents: 'Hello, Bob!'
  }
}

const TYPED_DATA_UNDEFINED_PROPERTY = {
  ...TYPED_DATA_V4,
  message: {
    from: {
      name: 'Cow',
      wallet: '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826'
    },
    to: {
      name: 'Bob',
      wallet: '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB'
    },
    contents: undefined
  }
}

const TYPED_DATA_INVALID = {
  ...TYPED_DATA_V4,
  primaryType: 'b0rk'
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('#getVersionFromTypedData', () => {
  beforeEach(() => jest.clearAllMocks())

  describe('valid versioned data', () => {
    const validRequests = [
      { data: TYPED_DATA_LEGACY, version: 'V1', dataDescription: 'legacy' },
      { data: TYPED_DATA_V4, version: 'V4', dataDescription: 'eip-712' },
      { data: TYPED_DATA_INVALID, version: 'V4', dataDescription: 'eip-712 invalid' },
      { data: TYPED_DATA_RECURSIVE, version: 'V4', dataDescription: 'eip-712 with recursion' }, // supported by both v3 and v4
      { data: TYPED_DATA_WITH_ARRAYS, version: 'V4', dataDescription: 'eip-712 with arrays' }, // unsupported by v3
      { data: TYPED_DATA_ARRAYS_INVALID, version: 'V4', dataDescription: 'eip-712 invalid with arrays' },
      { data: TYPED_DATA_NULL_CUSTOM_TYPE, version: 'V4', dataDescription: 'eip-712 with null custom type' }, // unsupported by v3
      { data: TYPED_DATA_UNDEFINED_PROPERTY, version: 'V3', dataDescription: 'eip-712 with undefined property' } // unsupported by v4
    ]

    validRequests.forEach(({ data, version, dataDescription }) => {
      it(`returns ${version} when parsing ${dataDescription} data`, () => {
        expect(getVersionFromTypedData(data)).toBe(version)
      })
    })
  })

  describe('edge cases', () => {
    it('returns V1 for an empty array (treated as legacy)', () => {
      expect(getVersionFromTypedData([])).toBe('V1')
    })

    it('does not throw when primaryType is missing entirely', () => {
      const data = { ...TYPED_DATA_V4 }
      delete data.primaryType
      expect(() => getVersionFromTypedData(data)).not.toThrow()
    })
  })
})
