# LightPay Dependencies

LightPay uses several third-party packages for data and logging:

- `lightpay-data-client` (`@framelabs/pylon-client`) — **replaced** by the custom LightPay Price Service in `main/services/prices/` and `main/services/rates/`. Price data is now fetched directly from the CoinGecko public API (no API key required for basic usage). The `lightpay-data-client` dependency and its `@framelabs/pylon-client` override have been removed from `package.json`.
- Logging is provided through a wrapper in `main/logger/` that isolates the implementation.

See `package.json` for the complete dependency list.
