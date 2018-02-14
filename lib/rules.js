'use strict';

const assert = require('assert');
const utils = require('./utils');


/**
 * Represents Veranet protocol handlers
 */
class Rules {

  /**
   * Constructs a Veranet rules instance in the context of a Veranet node
   * @constructor
   * @param {Node} node
   */
  constructor(node) {
    this.node = node;
  }

  /**
   * Validates all incoming RPC messages
   * @param {object} request
   * @param {object} response
   */
  validate(request, response, next) {
    try {
      assert(utils.isCompatibleVersion(request.contact[1].agent),
        `Unsupported protocol version ${request.contact[1].agent}`);
    } catch (err) {
      return next(err);
    }

    return next();
  }

  /**
   * Receives a request to create a snapshot, checks the chain module is
   * supported, then queues the work
   * @param {object} request
   * @param {object} response
   */
  createSnapshot(request, response, next) {
    const [root, chain, selection] = request.params;

    try {
      assert(utils.getSelectionRoot(selection) === root,
        'Invalid merkle root provided for snapshot selection');
      assert(this.node.chains.has(chain.toUpperCase()),
        `Chain module for ${chain} is not registed on this node`);
    } catch (err) {
      return next(err);
    }

    const mod = this.node.chains.get(chain.toUpperCase());

    mod.invoke('AUDIT_SELECTION', [selection], (err, result) => {
      if (err) {
        this.node.reportSnapshot(request.contact, {
          root,
          chain,
          selection: [],
          error: err.message,
          payment: null
        });
      } else {
        this.node.reportSnapshot(request.contact, {
          root,
          chain,
          selection: result,
          error: null,
          payment: null // TODO: Include payment destination for work
        });
      }
    });

    response.send([]);
  }

  /**
   * Receives a notification that a snapshot job has completed and triggers
   * any callback that is waiting in the queue for it
   * @param {object} request
   * @param {object} response
   */
  reportSnapshot(request, response, next) {
    const [root,, results /*, payment */] = request.params;

    try {
      assert(this.node.jobs.has(root), 'Unknown snapshot root supplied');
      assert(this.node.jobs.get(root).workers.get(request.contact[0]),
        'Unknown identity for job supplied');
    } catch (err) {
      return next(err);
    }

    const job = this.node.jobs.get(root);
    const worker = job.workers.get(request.contact[0]);

    if (worker.results) {
      next(new Error('Results already delivered by identity'));
    } else {
      worker.commit(results); // TODO: Queue payment to destination
      response.send([]);
    }
  }

}

module.exports = Rules;
