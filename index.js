/**
 * @module veranet
 * @license AGPL-3.0
 */

'use strict';

const { fork } = require('child_process');
const { join } = require('path');


/**
 * Forks a child veranet process and returns the child process
 * @function
 * @param {object|string} config - Configuration properties as object or path
 * to a configuration file. See {@tutorial config} for details.
 * connect to the control port
 * @returns {object}
 */
/* istanbul ignore next */
module.exports = function(config = {}) {
  let envs = {};
  let file = join(__dirname, './bin/veranet.js');
  let args = [];
  let opts = {
    env: envs,
    execPath: process.execPath,
    stdio: ['pipe', 'pipe', 'pipe', 'ipc']
  };

  if (typeof config === 'string') {
    args = args.concat(['--config', config]);
  } else {
    for (let prop in config) {
      opts.env[`veranet_${prop}`] = config[prop];
    }
  }

  return fork(file, args, opts);
};

/** {@link Node} */
module.exports.VeranetNode = require('./lib/node-veranet');

/** {@link Rules} */
module.exports.VeranetRules = require('./lib/rules-veranet');

/** {@link module:veranet/constants} */
module.exports.constants = require('./lib/constants');

/** {@link module:veranet/utils} */
module.exports.utils = require('./lib/utils');

/** {@link module:veranet/version} */
module.exports.version = require('./lib/version');
