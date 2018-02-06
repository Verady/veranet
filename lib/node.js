'use strict';

const async = require('async');
const url = require('url');
const { createLogger } = require('bunyan');
const merge = require('merge');
const kad = require('kad');
const spartacus = require('kad-spartacus');
const cas = require('kad-content');
const hashcash = require('kad-hashcash');
const constants = require('./constants');
const utils = require('./utils');
const version = require('./version');
const Rules = require('./rules');
const tiny = require('tiny');
const boscar = require('boscar');
const stringify = require('json-stable-stringify');
const { createHash } = require('crypto');


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
   * @param {string} options.peerCacheFilePath - Path to cache peers
   * @param {object} [options.logger] - Bunyan compatible logger
   * @param {number} [options.keyDerivationIndex] - HD derivation index
   */
  constructor(options) {
    /* eslint max-statements: [2, 16] */
    const opts = merge(Node.DEFAULTS, options);

    super(opts);

    this.contact.agent = this.contact.agent || version.protocol;
    this.contact.chains = this.contact.chains || [];

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
    this.peers = tiny(opts.peerCacheFilePath);
    this.chains = new Map();
    this.jobs = new Map();

    this._bootstrap();
  }

  /**
   * @private
   */
  _bootstrap() {
    // Keep a record of the contacts we've seen
    this.router.events.on('add', identity => {
      this.logger.debug(`updating peer profile ${identity}`);
      const contact = this.router.getContactByNodeId(identity);
      contact.timestamp = Date.now();
      this.peers.set(identity, contact);
    });
  }

  /**
   * Returns a list of bootstrap nodes from local profiles
   * @returns {string[]} urls
   */
  getBootstrapCandidates() {
    const candidates = [];
    return new Promise(resolve => {
      this.peers.each((contact, identity) => {
        candidates.push(utils.getContactURL([identity, contact]));
      });
      resolve(candidates.sort((a, b) => {
        b.timestamp - a.timestamp;
      }));
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
    const root = utils.getSelectionRoot(options.query);
    const routerdump = this.router.getClosestContactsToKey(root,
      kad.contants.K * kad.constants.B);

    let peers = [], pool = [];

    for (let [identity, contact] of routerdump) {
      if (!contact.chains.includes(options.chain)) {
        continue;
      }
      peers.push([identity, contact]);
    }

    if (peers.length < options.pool) {
      return callback(new Error('Not enough peers for pool requirements'));
    }

    const job = {
      workers: new Map(),
      root,
      handler: { called: false, callback },
      get satisfied() {
        let completed = 0;

        for (let [, worker] of job.workers) {
          if (worker.results === null && worker.error === null) {
            continue;
          }
          completed++;
        }

        return (completed === job.pool) || job.consensus !== null;
      },
      get consensus() {
        const consensus = {
          records: {},
          copies: {},
          get results() {
            const weighted = [];

            for (let hash in consensus.copies) {
              weighted.push({ hash, weight: consensus.copies[hash] });
            }

            const heaviest = weighted.sort((a, b) => b - a).shift();

            if (!heaviest || heaviest.weight < options.consistency) {
              return null;
            } else {
              return JSON.parse(consensus.records[heaviest.hash]);
            }
          }
        };

        for (let [, worker] of job.workers) {
          if (worker.results === null) {
            continue;
          }

          const hash = createHash('sha256')
            .update(stringify(worker.results))
            .digest('hex');

          if (consensus.records[hash]) {
            consensus.copies[hash]++;
          } else {
            consensus.records[hash] = stringify(worker.results);
            consensus.copies[hash] = 1;
          }
        }

        return consensus.results;
      },
      pool: options.pool,
      consistency: options.consistency,
      chain: options.chain,
      query: options.query
    };

    function poolNotFilled() {
      return pool.length < options.pool;
    }

    async.whilst(poolNotFilled, next => {
      const peer = peers.shift();

      if (!peer) {
        return next(new Error('Not enough peers to build pool'));
      }

      const worker = {
        identity: peer[0],
        contact: peer[1],
        results: null,
        error: null,
        commit(results, error) {
          worker.results = results;
          worker.error = error;

          if (job.satisfied && job.handler.called === false) {
            if (job.consensus) {
              job.handler.callback(null, job.consensus);
            } else {
              job.handler.callback(new Error('Failed to gather consensus'));
            }
            job.handler.called = true;
          }
        },
        get finished() {
          return worker.results || worker.error;
        }
      };

      this.ping(peer, err => {
        if (err) {
          next();
        } else {
          pool.push(peer);
          job.workers.set(worker.identity, worker);
          next();
        }
      });
    }, err => {
      if (err) {
        return callback(err);
      }

      this.jobs.set(root, job);

      for (let [identity, worker] of job.workers) {
        this.send('CREATE_SNAPSHOT', [
          root,
          options.chain,
          options.query
        ], [identity, worker.contact], err => {
          if (err) {
            worker.commit(null, err);
          }
        });
      }
    });

    return job;
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
   * @param {object} snapshot
   * @param {string} snapshot.root
   * @param {string} snapshot.chain
   * @param {object} snapshot.selection
   * @param {Node~reportSnapshotCallback} callback
   */
  reportSnapshot(contact, snapshot, callback) {
    this.send('REPORT_SNAPSHOT', [
      snapshot.root,
      snapshot.chain,
      snapshot.selection,
      null
    ], callback);
  }
  /**
   * @callback Node~reportSnapshotCallback
   * @param {error|null} err
   */

  /**
   * Registers the chain module that we should connect to
   * @param {string} chain - The chain code this module is for
   * @param {string} endpoint - The TCP URL or UNIX domain socket path
   * @param {Node~registerModuleCallback} callback
   */
  registerModule(chain, endpoint, callback) {
    chain = chain.toUpperCase();

    if (this.chains.has(chain)) {
      return callback(new Error(
        `Chain module for ${chain} is already registered`
      ));
    }

    const parsed = url.parse(endpoint);
    const client = new boscar.Client();

    client.once('error', err => {
      this.logger.error(err.message);
      this.deregisterModule(chain, () => null);
    });

    client.socket.once('close', () => {
      this.logger.warn(`Chain module ${chain} closed`);
      this.deregisterModule(chain, () => null);
    });

    client.once('ready', () => {
      this.chains.set(chain, client);
      this.contact.chains.push(chain);
      callback();
    });

    switch (parsed.protocol) {
      case 'unix:':
        client.connect(parsed.pathname);
        break;
      case 'tcp:':
        client.connect(parseInt(parsed.port), parsed.hostname);
        break;
      default:
        callback(new Error(`Invalid endpoint ${endpoint}`));
    }
  }
  /**
   * @callback Node~registerModuleCallback
   * @param {error|null} err
   */

  /**
   * Deregisters the chain module
   * @param {string} chain - The chain code this module is for
   * @param {Node~deregisterModuleCallback} callback
   */
  deregisterModule(chain, callback) {
    chain = chain.toUpperCase();

    if (!this.chains.has(chain)) {
      return callback(new Error(
        `Chain module for ${chain} is not registered`
      ));
    }

    const idx = this.contact.chains.indexOf(chain);
    const mod = this.chains.get(chain);

    if (idx !== -1) {
      this.contact.chains.splice(idx, 1);
    }

    mod.removeAllListeners();
    mod.socket.close();
    this.chains.delete(chain);
    callback();
  }
  /**
   * @callback Node~deregisterModuleCallback
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
