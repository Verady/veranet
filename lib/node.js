'use strict';

const stream = require('stream');
const url = require('url');
const { createLogger } = require('bunyan');
const merge = require('merge');
const https = require('https');
const kad = require('kad');
const spartacus = require('kad-spartacus');
const cas = require('kad-content');
const hashcash = require('kad-hashcash');
const constants = require('./constants');
const utils = require('./utils');
const version = require('./version');
const Rules = require('./rules');


/**
 * Extends Kademlia with Veranet protocol rules
 * @license AGPL-3.0
 */
class Node extends kad.KademliaNode {

  static get DEFAULTS() {
    return {
      logger: createLogger({ name: 'veranet' }),
      privateExtendedKey: null,
      keyDerivationIndex: 1
    };
  }

  /**
   * @constructor
   * @extends {KademliaNode}
   * @param {object} options
   * @param {string} options.privateExtendedKey - HD extended private key
   * @param {object} [options.logger] - Bunyan compatible logger
   * @param {Transport} [options.transport]
   * @param {Database} options.database
   * @param {Shards} options.shards
   * @param {number} [options.keyDerivationIndex] - HD derivation index
   */
  constructor(options) {
    /* eslint max-statements: [2, 16] */
    const opts = merge(Node.DEFAULTS, options);

    super(opts);

    this.contact.agent = this.contact.agent || version.protocol;
    this.hashcash = this.plugin(hashcash({
      methods: ['CREATE_SNAPSHOT'],
      difficulty: 5
    }));
    this.spartacus = this.plugin(spartacus(
      options.privateExtendedKey,
      options.keyDerivationIndex,
      constants.HD_KEY_DERIVATION_PATH
    ));
    this.cas = this.plugin(cas({
      keyAlgorithm: 'rmd160',
      valueEncoding: 'base64'
    }));

    this._bootstrap();
  }

  /**
   * @private
   */
  _bootstrap() {
    // Keep a record of the contacts we've seen
    this.router.events.on('add', (identity) => {
      let contact = this.router.getContactByNodeId(identity);

      this.logger.debug(`updating peer profile ${identity}`);

      // TODO: Persist contact/peer cache
    });
  }

  /**
   * Returns a list of bootstrap nodes from local profiles
   * @returns {string[]} urls
   */
  getBootstrapCandidates() {
    return new Promise((resolve, reject) => {
      // TODO: Load any cached contacts

      resolve([]);
    });
  }

  /**
   * Collects the appropriate nodes for the snapshot request and sends them
   * the job information. Waits until N results are received, then performs
   * consistency checks.
   * @param {object} options
   * @param {number} options.pool - Total nodes to query
   * @param {number} options.consistency - Minimum nodes to require consistency
   * @param {string} options.chain - Chain code
   * @param {object[]} options.query - Transaction query list
   * @param {string} options.query.address - Payment address to query
   * @param {number} options.query.from - Start UNIX time
   * @param {number} options.query.to - End UNIX time
   * @param {Node~createSnapshotCallback} callback
   */
  createSnapshot(options, callback) {
    callback(new Error('Not implemented')); // TODO
  }
  /**
   * @callback Node~createSnapshotCallback
   * @param {error|null} err
   * @param {object[]} snapshot
   */

  /**
   * Takes the completed snapshot result and sends it to the given contact
   * @param {array} contact
   * @param {string} contact.0
   * @param {object} contact.1
   * @param {object[]} snapshot
   * @param {Node~reportSnapshotCallback} callback
   */
  reportSnapshot(contact, snapshot, callback) {
    callback(new Error('Not implemented')); // TODO
  }
  /**
   * @callback Node~reportSnapshotCallback
   * @param {error|null} err
   */

  /**
   * Adds the kademlia rule handlers before calling super#listen()
   */
  listen() {
    let handlers = new Rules(this);

    this.use(handlers.validate.bind(handlers));
    this.use('CREATE_SNAPSHOT', handlers.createSnapshot.bind(handlers));
    this.use('REPORT_SNAPSHOT', handlers.reportSnapshot.bind(handlers));

    super.listen(...arguments);
  }

  /**
   * Make sure incompatible nodes don't make it into our routing table
   * @private
   */
  _updateContact(identity, contact) {
    try {
      if (!utils.isCompatibleVersion(contact.agent)) {
        return;
      }
    } catch (err) {
      return;
    }

    super._updateContact(...arguments);
  }

}

module.exports = Node;
