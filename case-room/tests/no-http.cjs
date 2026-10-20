// Synthetic test-only guard: any fetch / HTTP(S) request fails the subprocess.
// No generated or mocked responses. Local file-backed SQLite remains available.
const deny = () => { throw new Error('TEST_NETWORK_FORBIDDEN: no HTTP/model API calls allowed'); };
globalThis.fetch = deny;
for (const moduleName of ['node:http', 'node:https']) {
  const module = require(moduleName);
  module.request = deny;
  module.get = deny;
}
require('node:module').syncBuiltinESMExports();
