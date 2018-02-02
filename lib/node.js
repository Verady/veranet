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

      // TODO
    });
  }

  /**
   * Returns a list of bootstrap nodes from local profiles
   * @returns {string[]} urls
   */
  getBootstrapCandidates() {
    return new Promise((resolve, reject) => {
      // TODO

      resolve([]);
    });
  }

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
