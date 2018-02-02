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
      envs[`veranet_${prop}`] = config[prop];
    }
  }

  return fork(file, args, opts);
};

/** {@link Node} */
module.exports.Node = require('./lib/node');

/** {@link Rules} */
module.exports.Rules = require('./lib/rules');

/** {@link Transport} */
module.exports.Transport = require('./lib/transport');

/** {@link module:orc/constants} */
module.exports.constants = require('./lib/constants');

/** {@link module:orc/utils} */
module.exports.utils = require('./lib/utils');

/** {@link module:orc/version} */
module.exports.version = require('./lib/version');

/** {@link module:orc/logger} */
module.exports.logger = require('./lib/logger');
