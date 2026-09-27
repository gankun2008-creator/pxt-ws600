// Run the official PXT CLI against the installed micro:bit target.
const path = require('node:path');
const target = path.dirname(require.resolve('pxt-microbit/package.json'));
require('pxt-core').mainCli(target, process.argv.slice(2));
