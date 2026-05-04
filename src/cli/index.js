#!/usr/bin/env node
'use strict';
const OpenDesktopEngine = require('../core/engine.js');

async function main() {
  const engine = new OpenDesktopEngine();
  await engine.start();
}

main().catch(err => {
  console.error('❌ Fatal:', err.message);
  process.exit(1);
});
