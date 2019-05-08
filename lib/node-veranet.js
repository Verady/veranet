'use strict';

const path = require('path');
const os = require('os');
const { createLogger } = require('bunyan');
const merge = require('merge');
const kadence = require('@deadcanaries/kadence');
const version = require('./version');
const VeranetRules = require('./rules-veranet');


/**
 * Extends Kademlia with Veranet protocol rules
 * @license AGPL-3.0
 */
class VeranetNode extends kadence.KademliaNode {

  static get DEFAULTS() {
    return {
      logger: createLogger({ name: 'veranet' }),
      privateExtendedKey: null,
      keyDerivationIndex: 1,
      peerCacheFilePath: path.join(os.tmpdir(), 'veranet_peer_cache')
    };
  }

  /**
   * @constructor
   * @extends {KademliaNode}
   * @param {object} options
   * @param {string} options.privateExtendedKey - HD extended private key
   * @param {string} options.peerCacheFilePath - Path to cache peers
   * @param {object} [options.logger] - Bunyan compatible logger
   * @param {number} [options.keyDerivationIndex] - HD derivation index
   */
  constructor(options) {
    const opts = merge(VeranetNode.DEFAULTS, options);

    super(opts);

    this.contact.agent = this.contact.agent || version.protocol;
    this.contact.chains = this.contact.chains || [];

    this.hashcash = this.plugin(kadence.hashcash({
      methods: ['STORE'],
      difficulty: 6
    }));
    this.spartacus = this.plugin(kadence.spartacus(
      opts.privateKey
    ));
    this.rolodex = this.plugin(kadence.rolodex(opts.peerCacheFilePath));
    this.cas = this.plugin(kadence.contentaddress());
  }

  /**
   * Adds the kademlia rule handlers before calling super#listen()
   */
  listen() {
    let handlers = new VeranetRules(this);

    this.use(handlers.validate.bind(handlers));
    super.listen(...arguments);
  }

  /**
   * Make sure incompatible nodes don't make it into our routing table
   * @private
   */
  _updateContact(identity, contact) {
    try {
      if (!kadence.utils.isCompatibleVersion(contact.agent)) {
        return;
      }
    } catch (err) {
      return;
    }

    super._updateContact(...arguments);
  }

}

module.exports = VeranetNode;
