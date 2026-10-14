# Changelog

## 2.0.0

### Breaking

- Updated to `@companion-module/base` 2.1 and the Node.js 26 runtime. This version requires a Companion release that supports module API 2.x; older Companion installations keep using 1.x.

### Bug Fixes

- Fixed the connection retrying every 2 seconds and flooding the log with `Network error: Could not connect to display` when a display was unreachable for a longer time ([#5](https://github.com/bitfocus/companion-module-philips-sicp/issues/5)). The module now keeps a single connection, retries every 5 seconds and logs a persisting problem only once, plus a message when the connection is restored.
- A display that accepts the TCP connection but stops answering is now detected and the connection is re-established.
- Changing the IP address or port in the config now reconnects to the new address.
- Responses split over or combined in multiple TCP packets are now handled correctly.

### Features

- Added variables for power state and active input source.
- Added presets for power and input source selection.

### Chores

- Migrated to the current Companion module template: Yarn 4, ESLint 10 flat config, TypeScript 6, release workflow.
- Removed unused dependencies (`webpack`, `webpack-cli`, `delay`) and the unused Jest configuration.
