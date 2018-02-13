'use strict';

const { expect } = require('chai');
const VeranetNode = require('../lib/node');
const levelup = require('levelup');
const memdown = require('memdown');
const storage = levelup(memdown('veranet-unit-test'));
const { HTTPTransport } = require('kad');
const transport = new HTTPTransport();
const bunyan = require('bunyan');
const net = require('net');
const sinon = require('sinon');


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

  describe('@method registerModule | @method deregisterModule', function() {

    it('should register the module and connect to tcp socket', function(done) {
      const node = new VeranetNode({
        storage, transport,
        logger: bunyan.createLogger({ name: 'veranet-test', levels: ['fatal']})
      });
      const sock = net.createServer(() => null).listen(0);
      const port = sock.address().port;
      node.registerModule('BTC', `tcp://127.0.0.1:${port}`, function(err) {
        expect(err).to.equal(undefined);
        const client = node.chains.get('BTC');
        const deregisterModule = sinon.spy(node, 'deregisterModule');
        node.registerModule('BTC', `tcp://127.0.0.1:${port}`, function(err) {
          expect(err.message).to.equal(
            'Chain module for BTC is already registered'
          );
          client.emit('error', new Error('Failed'));
          setImmediate(() => {
            sock.close();
            expect(deregisterModule.called).to.equal(true);
            done();
          });
        });
      });
    });

    it('should register the module and connect to unix socket', function(done) {
      const node = new VeranetNode({
        storage, transport,
        logger: bunyan.createLogger({ name: 'veranet-test', levels: ['fatal']})
      });
      const sock = net.createServer(() => null).listen('/tmp/vera-test.sock');
      node.registerModule('BTC', `unix:///tmp/vera-test.sock`, function(err) {
        expect(err).to.equal(undefined);
        const client = node.chains.get('BTC');
        const deregisterModule = sinon.spy(node, 'deregisterModule');
        client.socket.emit('close');
        setImmediate(() => {
          sock.close();
          expect(deregisterModule.called).to.equal(true);
          done();
        })
      });
    });

    it('should fail to register the module', function(done) {
      const node = new VeranetNode({
        storage, transport,
        logger: bunyan.createLogger({ name: 'veranet-test', levels: ['fatal']})
      });
      node.registerModule('BTC', 'http://127.0.0.1:80', function(err) {
        expect(err.message).to.equal('Invalid endpoint http://127.0.0.1:80');
        done();
      });
    });

    it('should fail to deregister the module', function(done) {
      const node = new VeranetNode({
        storage, transport,
        logger: bunyan.createLogger({ name: 'veranet-test', levels: ['fatal']})
      });
      node.deregisterModule('ETH', function(err) {
        expect(err.message).to.equal('Chain module for ETH not registered');
        done();
      });
    });

  });

  describe('@method deregisterModule', function() {

    // TODO

  });

  describe('@private @method _updateContact', function() {

    // TODO

  });

});
