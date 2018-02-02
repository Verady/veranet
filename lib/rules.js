'use strict';


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
    next(new Error('Not implemented')); // TODO
  }

  /**
   * Receives a notification that a snapshot job has completed and triggers
   * any callback that is waiting in the queue for it
   * @param {object} request
   * @param {object} response
   */
  reportSnapshot(request, response, next) {
    next(new Error('Not implemented')); // TODO
  }

}

module.exports = Rules;
