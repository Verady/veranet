'use strict';

const { expect } = require('chai');
const sinon = require('sinon');
const version = require('../lib/version');
const Rules = require('../lib/rules-veranet');


describe('@class Rules', function() {

  describe('@method validate', function() {

    it('should error with incompatible agent', function(done) {
      const rules = new Rules({});
      rules.validate({
        contact: [
          '0000000000000000000000000000000000000000',
          {
            agent: '999.0.0'
          }
        ]
      }, {}, function(err) {
        expect(err.message).to.equal('Unsupported protocol version 999.0.0');
        done();
      });
    });

    it('should pass with compatible agent', function(done) {
      const rules = new Rules({});
      rules.validate({
        contact: [
          '0000000000000000000000000000000000000000',
          {
            agent: version.protocol
          }
        ]
      }, {}, function(err) {
        expect(err).to.equal(undefined);
        done();
      });
    });

  });

  describe('@method createSnapshot', function() {

    it('should reject invalid root', function(done) {
      const rules = new Rules({});
      rules.createSnapshot(
        {
          params: [
            '000000',
            'BTC',
            [
              { address: '1234567890', from: 0, to: 500 },
              { address: '1234567890', from: 500, to: 1500 }
            ]
          ]
        },
        {},
        function(err) {
          expect(err.message).to.equal(
            'Invalid merkle root provided for snapshot selection'
          );
          done();
        }
      );
    });

    it('should reject unsupported chain', function(done) {
      const chains = new Map();
      const rules = new Rules({ chains });
      chains.set('BTC', {});
      rules.createSnapshot(
        {
          params: [
            '5d0f7e5cf7f4c07ab9ee2f342f77845495c23719',
            'ETH',
            [
              { address: '1234567890', from: 0, to: 500 },
              { address: '1234567890', from: 500, to: 1500 }
            ]
          ]
        },
        {},
        function(err) {
          expect(err.message).to.equal(
            'Chain module for ETH is not registed on this node'
          );
          done();
        }
      );
    });

    it('should report error', function(done) {
      const chains = new Map();
      const invoke = sinon.stub().callsArgWith(2, new Error('Failed'));
      const reportSnapshot = sinon.stub().callsFake(function() {
        expect(reportSnapshot.args[0][1].error).to.equal('Failed');
        done();
      });
      const rules = new Rules({
        chains,
        reportSnapshot
      });
      chains.set('BTC', { invoke })
      rules.createSnapshot(
        {
          params: [
            '5d0f7e5cf7f4c07ab9ee2f342f77845495c23719',
            'BTC',
            [
              { address: '1234567890', from: 0, to: 500 },
              { address: '1234567890', from: 500, to: 1500 }
            ]
          ]
        },
        { send: () => null }
      );
    });

    it('should report success', function(done) {
      const chains = new Map();
      const selection = [];
      const invoke = sinon.stub().callsArgWith(2, null, selection);
      const reportSnapshot = sinon.stub().callsFake(function() {
        expect(reportSnapshot.args[0][1].selection).to.equal(selection);
        done();
      });
      const rules = new Rules({
        chains,
        reportSnapshot
      });
      chains.set('BTC', { invoke })
      rules.createSnapshot(
        {
          params: [
            '5d0f7e5cf7f4c07ab9ee2f342f77845495c23719',
            'BTC',
            [
              { address: '1234567890', from: 0, to: 500 },
              { address: '1234567890', from: 500, to: 1500 }
            ]
          ]
        },
        { send: () => null }
      );
    });

  });

  describe('@method reportSnapshot', function() {

    it('should reject invalid root', function(done) {
      const jobs = new Map();
      const rules = new Rules({ jobs });
      rules.reportSnapshot(
        {
          contact: [
            '0000000000000000000000000000000000000000',
            {}
          ],
          params: [
            '5d0f7e5cf7f4c07ab9ee2f342f77845495c23719',
            'BTC',
            [
              { address: '1234567890', from: 0, to: 500 },
              { address: '1234567890', from: 500, to: 1500 }
            ]
          ]
        },
        {},
        function(err) {
          expect(err.message).to.equal('Unknown snapshot root supplied');
          done();
        }
      );
    });

    it('should reject unknown worker', function(done) {
      const jobs = new Map();
      const rules = new Rules({ jobs });
      jobs.set(
        '5d0f7e5cf7f4c07ab9ee2f342f77845495c23719',
        { workers: new Map() }
      );
      rules.reportSnapshot(
        {
          contact: [
            '0000000000000000000000000000000000000000',
            {}
          ],
          params: [
            '5d0f7e5cf7f4c07ab9ee2f342f77845495c23719',
            'BTC',
            [
              { address: '1234567890', from: 0, to: 500 },
              { address: '1234567890', from: 500, to: 1500 }
            ]
          ]
        },
        {},
        function(err) {
          expect(err.message).to.equal('Unknown identity for job supplied');
          done();
        }
      );
    });

    it('should reject duplicate report', function(done) {
      const jobs = new Map();
      const rules = new Rules({ jobs });
      const workers = new Map();
      workers.set('0000000000000000000000000000000000000000', {
        results: []
      });
      jobs.set(
        '5d0f7e5cf7f4c07ab9ee2f342f77845495c23719',
        { workers }
      );
      rules.reportSnapshot(
        {
          contact: [
            '0000000000000000000000000000000000000000',
            {}
          ],
          params: [
            '5d0f7e5cf7f4c07ab9ee2f342f77845495c23719',
            'BTC',
            [
              { address: '1234567890', from: 0, to: 500 },
              { address: '1234567890', from: 500, to: 1500 }
            ]
          ]
        },
        {},
        function(err) {
          expect(err.message).to.equal('Results already delivered by identity');
          done();
        }
      );
    });

    it('should commit results', function(done) {
      const jobs = new Map();
      const rules = new Rules({ jobs });
      const workers = new Map();
      const commit = sinon.stub();
      workers.set('0000000000000000000000000000000000000000', {
        results: null,
        error: null,
        commit
      });
      jobs.set(
        '5d0f7e5cf7f4c07ab9ee2f342f77845495c23719',
        { workers }
      );
      rules.reportSnapshot(
        {
          contact: [
            '0000000000000000000000000000000000000000',
            {}
          ],
          params: [
            '5d0f7e5cf7f4c07ab9ee2f342f77845495c23719',
            'BTC',
            [
              { address: '1234567890', from: 0, to: 500 },
              { address: '1234567890', from: 500, to: 1500 }
            ]
          ]
        },
        {
          send: () => {
            expect(commit.called).to.equal(true);
            done();
          }
        }
      );
    });



  });

});
