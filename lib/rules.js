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

}

module.exports = Rules;
