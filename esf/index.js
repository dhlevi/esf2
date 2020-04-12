#!/usr/bin/env node

const esf = require('./lib/service/init');

// Any initializing can be done here

// start the ESF service
esf.launch(8080);