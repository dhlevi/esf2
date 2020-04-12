#!/usr/bin/env node

const agent = require('./service-agent');

// Any initializing can be done here

// start the ESF service agent
agent.launch(9090);