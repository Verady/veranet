'use strict';

const { expect } = require('chai');
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

});
