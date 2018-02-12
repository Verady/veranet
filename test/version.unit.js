'use strict';

const { expect } = require('chai');
const version = require('../lib/version');



describe('@module veranet/version', function() {

  describe('@function toString', function() {

    it('should return human readable version', function() {
      expect(version.toString()).to.equal(
        `veranet v${version.software} protocol v${version.protocol}`
      );
    });

  });

});
