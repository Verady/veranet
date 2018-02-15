'use strict';

const { expect } = require('chai');
const async = require('async');
const netgen = require('./fixtures/node-generator');
const boscar = require('boscar');
const kad = require('kad');


kad.constants.T_RESPONSETIMEOUT = 120000; // NB: Testing only!

describe('@module veranet (end-to-end)', function() {

  const NUM_NODES = 6;
  const nodes = [];

  before(function(done) {
    this.timeout(12000);
    netgen(NUM_NODES, (n) => {
      n.forEach((node) => nodes.push(node));
      async.eachSeries(nodes, (n, done) => {
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

  it('should register the chain modules with nodes', function(done) {
    this.timeout(240000);
    const report1 = [
      {
        address: '1234567890abcdefghijklmnopqrstuvwxyz',
        from: 0,
        to: 100000,
        transactions: [
          {
            tx: {
              hash: 'abcdefghijklmnopqrstuvwxyz',
              from: [
                {
                  address: '0987654321abcdefghijklmnopqrstuvwxyz',
                  amounts: [
                    {
                      symbol: 'BTC',
                      amount: 600,
                      decimals: 0
                    }
                  ]
                }
              ],
              to: [
                {
                  address: '1234567890abcdefghijklmnopqrstuvwxyz',
                  amounts: [
                    {
                      symbol: 'BTC',
                      amount: 600,
                      decimals: 0,
                    }
                  ]
                }
              ],
              blockNumber: 501,
              blockHash: 'abcdefghijklmnopqrstuvwxyz',
              fee: {
                amounts: [
                  {
                    symbol: 'BTC',
                    amount: 1
                  }
                ]
              }
            },
            meta: {}
          }
        ]
      }
    ];
    const report2 = [
      {
        address: '1234567890abcdefghijklmnopqrstuvwxyz',
        from: 0,
        to: 100000,
        transactions: [
          {
            tx: {
              hash: 'abcdefghijklmnopqrstuvwxyz',
              from: [
                {
                  address: '0987654321abcdefghijklmnopqrstuvwxyz',
                  amounts: [
                    {
                      symbol: 'BTC',
                      amount: 500,
                      decimals: 0
                    }
                  ]
                }
              ],
              to: [
                {
                  address: '1234567890abcdefghijklmnopqrstuvwxyz',
                  amounts: [
                    {
                      symbol: 'BTC',
                      amount: 500,
                      decimals: 0,
                    }
                  ]
                }
              ],
              blockNumber: 500,
              blockHash: 'abcdefghijklmnopqrstuvwxyz',
              fee: {
                amounts: [
                  {
                    symbol: 'BTC',
                    amount: 1
                  }
                ]
              }
            },
            meta: {}
          }
        ]
      }
    ];
    function module1() {
      return new boscar.Server({
        AUDIT_SELECTION: function(selection, callback) {
          callback(null, report1);
        }
      });
    }
    function module2() {
      return new boscar.Server({
        AUDIT_SELECTION: function(selection, callback) {
          callback(null, report2);
        }
      });
    }
    async.each(nodes.slice(0, 4), (node, next) => {
      const module = module1();
      module.listen(0, '127.0.0.1', () => {
        const port = module.server.address().port;
        node.registerModule('BTC', `tcp://localhost:${port}`, next);
      });
    }, (err) => {
      expect(err).to.equal(null);
      async.each(nodes.slice(4), (node, next) => {
        const module = module2();
        module.listen(0, '127.0.0.1', () => {
          const port = module.server.address().port;
          node.registerModule('BTC', `tcp://localhost:${port}`, next);
        });
      }, (err) => {
        expect(err).to.equal(null);
        nodes.forEach(n => {
          expect(n.contact.chains.includes('BTC')).to.equal(true);
        });
        done();
      });
    });
  });

  it('should perform a successful snapshot creation', function(done) {
    this.timeout(480000);
    const node = nodes[nodes.length - 1];
    node.rediscover(() => {
      node.createSnapshot({
        pool: 5,
        consistency: 3,
        chain: 'BTC',
        query: [
          {
            address: '1234567890abcdefghijklmnopqrstuvwxyz',
            from: 0,
            to: 100000
          }
        ]
      }, function(err, consensus) {
        expect(err).to.equal(null);
        expect(consensus[0]).to.equal(
          'c0fc6c2e1749a7cc853709753f8dda17336aa779e7369ffaa4233441da5ed88c'
        );
        done();
      });
    });
  });

});
