'use strict';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const async = require('async');
const pem = require('pem');
const bunyan = require('bunyan');
const veranet = require('../../index');
const levelup = require('levelup');
const memdown = require('memdown');
const encoding = require('encoding-down');
const kadence = require('@deadcanaries/kadence');

let startPort = 45000;


module.exports = function(numNodes, callback) {

  const nodes = [];

  function createNode(callback) {
    const logger = bunyan.createLogger({
      levels: ['fatal'],
      name: 'node-veranet'
    });
    const contact = {
      hostname: 'localhost',
      port: startPort++,
      protocol: 'https:'
    };
    const storage = levelup(encoding(memdown('veranet-test')));

    pem.createCertificate({ days: 1, selfSigned: true }, function(err, keys) {
      const transport = new kadence.HTTPSTransport({
        key: keys.serviceKey,
        cert: keys.certificate
      });

      callback(new veranet.VeranetNode({
        contact,
        storage,
        logger,
        transport
      }));
    });
  }

  async.times(numNodes, function(n, done) {
    createNode((node) => {
      nodes.push(node);
      done();
    });
  }, () => callback(nodes));
};
