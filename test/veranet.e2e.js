'use strict';

const { expect } = require('chai');
const async = require('async');
const netgen = require('./fixtures/node-generator');
const kadence = require('@deadcanaries/kadence');


kadence.constants.T_RESPONSETIMEOUT = 120000; // NB: Testing only!

describe('@module veranet (end-to-end)', function() {

  const NUM_NODES = 6;
  const nodes = [];

  before(function(done) {
    this.timeout(12000);
    netgen(NUM_NODES, (n) => {
      n.forEach((node) => nodes.push(node));
      async.eachSeries(nodes, (n, done) => {
        n.contact.ethaddr = '0x1111111111111111111111111111111111111111';
        n.listen(n.contact.port, n.contact.hostname, done);
      }, done);
    });
  });

  after(function(done) {
    this.timeout(12000);
    setTimeout(() => {
      async.each(nodes, (n, next) => {
        n.transport.server.close();
        next();
      }, done);
    }, 4000);
  });

  it('should join all nodes together', function(done) {
    this.timeout(240000);
    async.eachOfSeries(nodes, (n, i, next) => {
      if (i === 0) {
        next();
      } else {
        n.join([
          nodes[0].identity.toString('hex'),
          nodes[0].contact
        ], () => next());
      }
    }, () => {
      nodes.forEach((n) => {
        expect(n.router.size > 0.75 / NUM_NODES).to.equal(true);
      });
      done();
    });
  });

});
