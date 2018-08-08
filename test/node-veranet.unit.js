'use strict';

const { expect } = require('chai');
const VeranetNode = require('../lib/node-veranet');
const levelup = require('levelup');
const memdown = require('memdown');
const storage = levelup(memdown('veranet-unit-test'));
const { HTTPTransport } = require('@kadenceproject/kadence');
const transport = new HTTPTransport();
const bunyan = require('bunyan');
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
        node.rolodex.getBootstrapCandidates().then(nodes => {
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
