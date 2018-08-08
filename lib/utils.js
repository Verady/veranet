/**
 * @module veranet/utils
 */

'use strict';

const crypto = require('crypto');


/**
 * Returns a key value pair for storage in the DHT given some buffer
 * @param {buffer} data - Arbitrary data to store
 * @returns {array}
 */
module.exports.toTableEntry = function(buf) {
  return [
    crypto.createHash('rmd160').update(buf).digest('hex'),
    buf.toString('base64')
  ];
};
