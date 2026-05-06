# LightPay

Your personal Web3 wallet for macOS.

LightPay is a secure, lightweight Ethereum wallet that runs in your macOS menu bar. It connects to any blockchain and lets you sign transactions from any application on your Mac.

## Features

- **Menu Bar Access** — LightPay lives quietly in your menu bar until you need it
- **Multiple Account Types** — Mnemonic phrases, private keys, and keystore files
- **Multi-Chain Support** — Ethereum, Polygon, Arbitrum, Base, Optimism, and more
- **Transaction Signing** — Review and sign transactions with full fee details
- **dApp Integration** — Connect to any Web3 application via the system-wide JSON-RPC endpoint
- **Token Tracking** — View your ERC-20 token balances at a glance
- **Privacy First** — Your keys stay on your device, always

## Requirements

- macOS 12.0 or later
- Apple Silicon or Intel Mac

## Installation

Download the latest release from the [releases page](https://github.com/lightpay-labs/lightpay/releases) or install from the Mac App Store.

## How It Works

LightPay runs a local JSON-RPC server at `ws://127.0.0.1:1248` and `http://127.0.0.1:1248`. Any application can connect to this endpoint and use it to interact with Ethereum and compatible blockchains.

## Development

### Requirements
- Node.js v22 LTS
- npm v10+

### Setup
```bash
npm run setup:deps
```

### Run in Development
```bash
npm run dev
```

### Build for Mac App Store
```bash
npm run compile && npm run bundle && electron-builder --config=build/electron-builder-mas.js
```

## License

GPL-3.0 — see [LICENSE](LICENSE) for details.

## Support

- [Discord](https://discord.gg/lightpay)
- [Twitter](https://twitter.com/LightPayApp)
- [Website](https://lightpay.tech)
