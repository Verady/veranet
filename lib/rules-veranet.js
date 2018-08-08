'use strict';

const assert = require('assert');
const { utils } = require('@kadenceproject/kadence');


/**
 * Represents Veranet protocol handlers
 */
class VeranetRules {

  /**
   * Constructs a Veranet rules instance in the context of a Veranet node
   * @constructor
   * @param {VeranetNode} node
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

module.exports = VeranetRules;
