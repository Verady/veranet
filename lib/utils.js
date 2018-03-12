/**
 * @module veranet/utils
 */

'use strict';

const url = require('url');
const kadence = require('@kadenceproject/kadence');
const semver = require('semver');
const ip = require('ip');
const mtree = require('mtree');
const crypto = require('crypto');


/**
 * Returns a unique identifier for this audit selection
 * @param {object[]} selection
 * @param {string} selection.address
 * @param {number} selection.from
 * @param {number} selection.to
 * @returns {string}
 */
module.exports.getSelectionRoot = function(selection) {
  selection = selection.sort((a, b) => {
    if (a.address < b.address) {
      return -1;
    } else if (a.address > b.address) {
      return 1;
    } else {
      return 0;
    }
  });

  if (selection.length < 2) {
    selection.push(Buffer.alloc(32).fill(0));
  }

  const merkle = mtree(selection.map(hashQuery), hashLeaves);

  function hashLeaves(l) {
    return crypto.createHash('rmd160')
      .update(l)
      .digest();
  }

  function hashQuery(q) {
    return crypto.createHash('sha256')
      .update(Buffer.from(`${q.address}:${q.from}:${q.to}`))
      .digest();
  }

  return merkle.root().toString('hex');
};

/**
 * Returns a stringified URL from the supplied contact object
 * @param {array} contact
 * @param {string} contact.0 - Node identity key
 * @param {object} contact.1
 * @param {string} contact.1.hostname
 * @param {string} contact.1.port
 * @param {string} contact.1.protocol
 * @returns {string}
 */
module.exports.getContactURL = function(contact) {
  const [id, info] = contact;

  return `${info.protocol}//${info.hostname}:${info.port}/#${id}`;
};

/**
 * Returns a parsed contact object from a URL
 * @returns {object}
 */
module.exports.parseContactURL = function(addr) {
  const { protocol, hostname, port, hash } = url.parse(addr);
  const contact = [
    (hash ? hash.substr(1) : null) || Buffer.alloc(20).fill(0).toString('hex'),
    {
      protocol,
      hostname,
      port
    }
  ];

  return contact;
};

/**
 * Returns whether or not the supplied semver tag is compatible
 * @param {string} version - The semver tag from the contact
 * @returns {boolean}
 */
module.exports.isCompatibleVersion = function(version) {
  const local = require('./version').protocol;
  const remote = version;
  const sameMajor = semver.major(local) === semver.major(remote);
  const diffs = ['prerelease', 'prepatch', 'preminor', 'premajor'];

  if (diffs.indexOf(semver.diff(remote, local)) !== -1) {
    return false;
  } else {
    return sameMajor;
  }
};

/**
 * Determines if the supplied contact is valid
 * @param {array} contact - The contact information for a given peer
 * @param {boolean} loopback - Allows contacts that are localhost
 * @returns {boolean}
 */
module.exports.isValidContact = function(contact, loopback) {
  const [, info] = contact;
  const isValidAddr = ip.isV4Format(info.hostname) ||
                      ip.isV6Format(info.hostname) ||
                      ip.isPublic(info.hostname);
  const isValidPort = info.port > 0;
  const isAllowedAddr = ip.isLoopback(info.hostname) ? !!loopback : true;

  return isValidPort && isValidAddr && isAllowedAddr;
};

/**
 * Determines if a value is hexadecimal string
 * @param {*} a - The value to be tested
 * @returns {boolean}
 */
module.exports.isHexaString = function(a) {
  if (typeof a !== 'string') {
    return false;
  }

  return /^[0-9a-fA-F]+$/.test(a);
};

/**
 * Checks if the supplied HD key is valid (base58 encoded) and proper length
 * @param {string} hdKey - The HD key in base 58 encoding
 * @returns {boolean} isValidHDKey
 */
module.exports.isValidHDNodeKey = function(hdKey) {
  return typeof hdKey === 'string' &&
    /^[1-9a-km-zA-HJ-NP-Z]{1,111}$/.test(hdKey);
};

/**
 * Checks if the input is a non-hardened HD key index
 * @param {number} hdIndex - The HD key index
 * @returns {boolean} isValidHDKeyIndex
 */
module.exports.isValidNodeIndex = function(n) {
  return !Number.isNaN(n) && (parseInt(n) === n) && n >= 0 &&
    n <= kadence.constants.MAX_NODE_INDEX;
};
