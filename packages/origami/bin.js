#! /usr/bin/env node
/* eslint-disable */
const { runExit } = require('clipanion');
const { DeployCommand } = require('./cli.js');

runExit([DeployCommand]);
