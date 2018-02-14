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
const version = require('../lib/version');
const fs = require('fs');
const async = require('async');


transport.setMaxListeners(0); // NB: We're going to reuse this for all tests

describe('@class Node', function() {

  before(() => {
    if (fs.existsSync('/tmp/vera-test.sock')) {
      fs.unlinkSync('/tmp/vera-test.sock');
    }
    if (fs.existsSync('/tmp/veranet_peer_cache')) {
      fs.unlinkSync('/tmp/veranet_peer_cache');
    }
  });

  describe('@constructor', function() {

    it('should create a Node instance', function() {
      const node = new VeranetNode({
        storage, transport,
        logger: bunyan.createLogger({ name: 'veranet-test', level: 'fatal' })
      });
      expect(node).to.be.instanceOf(VeranetNode);
    });

  });

  describe('@method getBootstrapCandidates', function() {

    before(() => fs.unlinkSync(VeranetNode.DEFAULTS.peerCacheFilePath));

    it('should return a timestamp sorted list of peers', function(done) {
      const node = new VeranetNode({
        storage, transport,
        logger: bunyan.createLogger({ name: 'veranet-test', level: 'fatal' })
      });
      const peers = [
        ['0000000000000000000000000000000000000002', {
          protocol: 'https:',
          hostname: 'localhost',
          port: 8080,
          agent: version.protocol,
          chains: ['BTC']
        }],
        ['0000000000000000000000000000000000000001', {
          protocol: 'https:',
          hostname: 'localhost',
          port: 8080,
          agent: version.protocol,
          chains: ['BTC']
        }],
        ['0000000000000000000000000000000000000000', {
          protocol: 'https:',
          hostname: 'localhost',
          port: 8080,
          agent: version.protocol,
          chains: ['BTC']
        }]
      ];
      async.eachSeries(peers, (peer, next) => {
        node._updateContact(...peer);
        setTimeout(next, 10);
      }, () => {
        node.getBootstrapCandidates().then(nodes => {
          expect(
            nodes[0].includes('0000000000000000000000000000000000000000')
          ).to.equal(true);
          expect(
            nodes[1].includes('0000000000000000000000000000000000000001')
          ).to.equal(true);
          expect(
            nodes[2].includes('0000000000000000000000000000000000000002')
          ).to.equal(true);
          done();
        }, done).catch(done);
      }, 30);
    });

  });

  describe('@method reportSnapshot', function() {

    it('should call AbstractNode#send with args', function(done) {
      const node = new VeranetNode({
        storage, transport,
        logger: bunyan.createLogger({ name: 'veranet-test', level: 'fatal' })
      });
      const send = sinon.stub(node, 'send').callsArg(3);
      const contact = ['identity', {}];
      const snapshot = {
        root: 'merkleroot',
        chain: 'chain',
        selection: []
      };
      node.reportSnapshot(contact, snapshot, () => {
        expect(send.args[0][0]).to.equal('REPORT_SNAPSHOT');
        expect(send.args[0][1][0]).to.equal('merkleroot');
        expect(send.args[0][1][1]).to.equal('chain');
        expect(send.args[0][1][2]).to.equal(snapshot.selection);
        expect(send.args[0][1][3]).to.equal(null);
        expect(send.args[0][2]).to.equal(contact);
        done();
      });
    });

  });

  describe('@method registerModule | @method deregisterModule', function() {

    it('should register the module and connect to tcp socket', function(done) {
      const node = new VeranetNode({
        storage, transport,
        logger: bunyan.createLogger({ name: 'veranet-test', level: 'fatal' })
      });
      const sock = net.createServer(() => null).listen(0);
      const port = sock.address().port;
      node.registerModule('BTC', `tcp://127.0.0.1:${port}`, function(err) {
        expect(err).to.equal(null);
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
        logger: bunyan.createLogger({ name: 'veranet-test', level: 'fatal' })
      });
      const sock = net.createServer(() => null).listen('/tmp/vera-test.sock');
      node.registerModule('BTC', 'unix:///tmp/vera-test.sock', function(err) {
        expect(err).to.equal(null);
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
        logger: bunyan.createLogger({ name: 'veranet-test', level: 'fatal' })
      });
      node.registerModule('BTC', 'http://127.0.0.1:80', function(err) {
        expect(err.message).to.equal('Invalid endpoint http://127.0.0.1:80');
        done();
      });
    });

    it('should fail to deregister the module', function(done) {
      const node = new VeranetNode({
        storage, transport,
        logger: bunyan.createLogger({ name: 'veranet-test', level: 'fatal' })
      });
      node.deregisterModule('ETH', function(err) {
        expect(err.message).to.equal('Chain module for ETH is not registered');
        done();
      });
    });

  });

  describe('@private @method _updateContact', function() {

    it('should not insert into router if incompatible version', function(done) {
      const node = new VeranetNode({
        storage, transport,
        logger: bunyan.createLogger({ name: 'veranet-test', level: 'fatal' })
      });
      const c1 = ['0000000000000000000000000000000000000000', {
        agent: '0.0.0'
      }];
      const c2 = ['0000000000000000000000000000000000000000', null];
      const c3 = ['0000000000000000000000000000000000000000', {
        agent: version.protocol
      }];
      node._updateContact(...c1);
      node._updateContact(...c2);
      node._updateContact(...c3);
      setTimeout(() => {
        expect(node.router.size).to.equal(1);
        done();
      }, 10);
    });

  });

});
