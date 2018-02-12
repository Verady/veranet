'use strict';

const { expect } = require('chai');
const VeranetNode = require('../lib/node');
const levelup = require('levelup');
const memdown = require('memdown');
const storage = levelup(memdown('veranet-unit-test'));
const { HTTPTransport } = require('kad');
const transport = new HTTPTransport();
const bunyan = require('bunyan');


describe('@class Node', function() {

  describe('@constructor', function() {

    it('should create a Node instance', function() {
      const node = new VeranetNode({
        storage, transport,
        logger: bunyan.createLogger({ name: 'veranet-test', levels: ['fatal']})
      });
      expect(node).to.be.instanceOf(VeranetNode);
    });

  });

  describe('@method getBootstrapCandidates', function() {

    // TODO

  });

  describe('@method createSnapshot', function() {

    // TODO

  });

  describe('@method reportSnapshot', function() {

    // TODO

  });

  describe('@method registerModule', function() {

    // TODO

  });

  describe('@method deregisterModule', function() {

    // TODO

  });

  describe('@private @method _updateContact', function() {

    // TODO

  });

});
