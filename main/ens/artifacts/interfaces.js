// ENS contract ABI fragments used by LightPay.
//
// Interfaces are grouped into three sections:
//   1. ENS Registry  — the root name registry contract
//   2. ENS Resolver  — public resolver (text records, addresses, content hashes, …)
//
// Helper functions at the bottom of this file provide ergonomic access to the
// raw ABI arrays without exposing consumers to the module.exports structure.

// ---------------------------------------------------------------------------
// Section 1 — ENS Registry
// The registry is the single source of truth for name ownership and resolver
// pointers. It is NOT ERC-20 or ERC-721; it is ENS-specific.
// ---------------------------------------------------------------------------
const registryAbi = [
  // --- ENS-specific: read owner of a node ---
  {
    constant: true,
    inputs: [
      {
        name: 'node',
        type: 'bytes32'
      }
    ],
    name: 'owner',
    outputs: [
      {
        name: '',
        type: 'address'
      }
    ],
    type: 'function'
  },
  // --- ENS-specific: read resolver for a node ---
  {
    constant: true,
    inputs: [
      {
        name: 'node',
        type: 'bytes32'
      }
    ],
    name: 'resolver',
    outputs: [
      {
        name: '',
        type: 'address'
      }
    ],
    type: 'function'
  },
  // --- ENS-specific: update resolver pointer for a node ---
  {
    constant: false,
    inputs: [
      {
        name: 'node',
        type: 'bytes32'
      },
      {
        name: 'resolver',
        type: 'address'
      }
    ],
    name: 'setResolver',
    outputs: [],
    type: 'function'
  },
  // --- ENS-specific: update owner of a node ---
  {
    constant: false,
    inputs: [
      {
        name: 'node',
        type: 'bytes32'
      },
      {
        name: 'owner',
        type: 'address'
      }
    ],
    name: 'setOwner',
    outputs: [],
    type: 'function'
  },
  // --- ENS-specific: create or update a sub-node and assign its owner ---
  {
    constant: false,
    inputs: [
      {
        name: 'node',
        type: 'bytes32'
      },
      {
        name: 'label',
        type: 'bytes32'
      },
      {
        name: 'owner',
        type: 'address'
      }
    ],
    name: 'setSubnodeOwner',
    outputs: [],
    type: 'function'
  }
]

// ---------------------------------------------------------------------------
// Section 2 — ENS Public Resolver
// Implements EIP-137 resolution plus additional ENS-specific records (text,
// content hash, public key, ABI).  The addr() / setAddr() functions overlap
// conceptually with the ERC-20 "address" convention but are ENS-specific in
// this context.
// ---------------------------------------------------------------------------
const resolverAbi = [
  // --- ENS-specific: ERC-165 interface detection ---
  {
    constant: true,
    inputs: [
      {
        name: 'interfaceID',
        type: 'bytes4'
      }
    ],
    name: 'supportsInterface',
    outputs: [
      {
        name: '',
        type: 'bool'
      }
    ],
    payable: false,
    stateMutability: 'pure',
    type: 'function'
  },
  // --- ENS-specific: resolve ETH address for a node ---
  {
    constant: true,
    inputs: [
      {
        name: 'node',
        type: 'bytes32'
      }
    ],
    name: 'addr',
    outputs: [
      {
        name: '',
        type: 'address'
      }
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function'
  },
  // --- ENS-specific: set ETH address for a node ---
  {
    constant: false,
    inputs: [
      {
        name: 'node',
        type: 'bytes32'
      },
      {
        name: 'addr',
        type: 'address'
      }
    ],
    name: 'setAddr',
    outputs: [],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function'
  },
  // --- ENS-specific: read reverse-resolution name for a node ---
  {
    constant: true,
    inputs: [
      {
        name: 'node',
        type: 'bytes32'
      }
    ],
    name: 'name',
    outputs: [
      {
        name: '',
        type: 'string'
      }
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function'
  },
  // --- ENS-specific: set reverse-resolution name ---
  {
    constant: false,
    inputs: [
      {
        name: 'node',
        type: 'bytes32'
      },
      {
        name: 'name',
        type: 'string'
      }
    ],
    name: 'setName',
    outputs: [],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function'
  },
  // --- ENS-specific: read text record for a node + key ---
  {
    constant: true,
    inputs: [
      {
        name: 'node',
        type: 'bytes32'
      },
      {
        name: 'key',
        type: 'string'
      }
    ],
    name: 'text',
    outputs: [
      {
        name: '',
        type: 'string'
      }
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function'
  },
  // --- ENS-specific: set text record ---
  {
    constant: false,
    inputs: [
      {
        name: 'node',
        type: 'bytes32'
      },
      {
        name: 'key',
        type: 'string'
      },
      {
        name: 'value',
        type: 'string'
      }
    ],
    name: 'setText',
    outputs: [],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function'
  },
  // --- ENS-specific: read content hash ---
  {
    constant: true,
    inputs: [
      {
        name: 'node',
        type: 'bytes32'
      }
    ],
    name: 'contenthash',
    outputs: [
      {
        name: '',
        type: 'bytes'
      }
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function'
  },
  // --- ENS-specific: set content hash ---
  {
    constant: false,
    inputs: [
      {
        name: 'node',
        type: 'bytes32'
      },
      {
        name: 'hash',
        type: 'bytes'
      }
    ],
    name: 'setContenthash',
    outputs: [],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function'
  },
  // --- ENS-specific: read secp256k1 public key ---
  {
    constant: true,
    inputs: [
      {
        name: 'node',
        type: 'bytes32'
      }
    ],
    name: 'pubkey',
    outputs: [
      {
        name: 'x',
        type: 'bytes32'
      },
      {
        name: 'y',
        type: 'bytes32'
      }
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function'
  },
  // --- ENS-specific: set secp256k1 public key ---
  {
    constant: false,
    inputs: [
      {
        name: 'node',
        type: 'bytes32'
      },
      {
        name: 'x',
        type: 'bytes32'
      },
      {
        name: 'y',
        type: 'bytes32'
      }
    ],
    name: 'setPubkey',
    outputs: [],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function'
  },
  // --- ENS-specific: read ABI blob ---
  {
    constant: true,
    inputs: [
      {
        name: 'node',
        type: 'bytes32'
      },
      {
        name: 'contentTypes',
        type: 'uint256'
      }
    ],
    name: 'ABI',
    outputs: [
      {
        name: 'contentType',
        type: 'uint256'
      },
      {
        name: 'data',
        type: 'bytes'
      }
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function'
  },
  // --- ENS-specific: set ABI blob ---
  {
    constant: false,
    inputs: [
      {
        name: 'node',
        type: 'bytes32'
      },
      {
        name: 'contentType',
        type: 'uint256'
      },
      {
        name: 'data',
        type: 'bytes'
      }
    ],
    name: 'setABI',
    outputs: [],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function'
  },
  // --- Resolver constructor (sets registry address) ---
  {
    inputs: [
      {
        name: 'ensAddr',
        type: 'address'
      }
    ],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'constructor'
  },
  // --- Events ---
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        name: 'node',
        type: 'bytes32'
      },
      {
        indexed: false,
        name: 'a',
        type: 'address'
      }
    ],
    name: 'AddrChanged',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        name: 'node',
        type: 'bytes32'
      },
      {
        indexed: false,
        name: 'name',
        type: 'string'
      }
    ],
    name: 'NameChanged',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        name: 'node',
        type: 'bytes32'
      },
      {
        indexed: true,
        name: 'contentType',
        type: 'uint256'
      }
    ],
    name: 'ABIChanged',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        name: 'node',
        type: 'bytes32'
      },
      {
        indexed: false,
        name: 'x',
        type: 'bytes32'
      },
      {
        indexed: false,
        name: 'y',
        type: 'bytes32'
      }
    ],
    name: 'PubkeyChanged',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        name: 'node',
        type: 'bytes32'
      },
      {
        indexed: false,
        name: 'indexedKey',
        type: 'string'
      },
      {
        indexed: false,
        name: 'key',
        type: 'string'
      }
    ],
    name: 'TextChanged',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        name: 'node',
        type: 'bytes32'
      },
      {
        indexed: false,
        name: 'hash',
        type: 'bytes'
      }
    ],
    name: 'ContenthashChanged',
    type: 'event'
  }
]

// ---------------------------------------------------------------------------
// Internal index — built once at module load for O(1) lookups.
// ---------------------------------------------------------------------------

/** Flat map of every named ABI entry across all interface sections. */
const _allInterfaces = [
  ...registryAbi.map((entry) => ({ ...entry, _section: 'registry' })),
  ...resolverAbi.map((entry) => ({ ...entry, _section: 'resolver' }))
]

const _byName = _allInterfaces.reduce((acc, entry) => {
  if (entry.name) acc[entry.name] = entry
  return acc
}, /** @type {Record<string, object>} */ ({}))

// ---------------------------------------------------------------------------
// Public helpers
// ---------------------------------------------------------------------------

/**
 * Look up a single ABI entry by its `name` field.
 *
 * @param {string} interfaceId - The function or event name (e.g. "setAddr").
 * @returns {object|undefined} The matching ABI fragment, or undefined if not found.
 */
function getInterfaceById(interfaceId) {
  return _byName[interfaceId]
}

/**
 * Return all ABI entries sorted alphabetically by name.
 * Unnamed entries (constructors, anonymous events) are sorted to the end.
 *
 * @returns {object[]} Sorted array of all ABI fragments across all sections.
 */
function getAllInterfaces() {
  return [..._allInterfaces].sort((a, b) => {
    const nameA = a.name || '\xff'
    const nameB = b.name || '\xff'
    return nameA.localeCompare(nameB)
  })
}

// ---------------------------------------------------------------------------
// Module exports
// ---------------------------------------------------------------------------

module.exports = {
  registry: registryAbi,
  resolver: resolverAbi,
  getInterfaceById,
  getAllInterfaces
}
