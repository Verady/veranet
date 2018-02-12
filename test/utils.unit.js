'use strict';

const { expect } = require('chai');
const utils = require('../lib/utils');
const semver = require('semver');
const version = require('../lib/version');

describe('@module utils', function() {

  describe('@function getSelectionRoot', function() {

    it('should return the correct merkle root', function() {
      const root = utils.getSelectionRoot([
        { address: '1234567890', from: 1234567890, to: 9234567890 },
        { address: '1234567890', from: 1234567890, to: 9234567890 },
        { address: '0987654321', from: 2345678901, to: 9234567890 },
        { address: 'abcdefghij', from: 3456789012, to: 9234567890 },
      ]);
      expect(root).to.equal(
        'dfbf242b82369c83cc501c62c3d34ecac086523f8b3e5c379671077dee13fc8a'
      );
    });

  });

  describe('@function parseContactURL', function() {

    it('should return the contact object', function() {
      const contact1 = utils.parseContactURL('https://hostname:8080');
      const contact2 = utils.parseContactURL('https://hostname:8080/#nodeid');
      expect(contact1[0]).to.equal('0000000000000000000000000000000000000000');
      expect(contact1[1].hostname).to.equal('hostname')
      expect(contact1[1].port).to.equal('8080');
      expect(contact2[0]).to.equal('nodeid');
      expect(contact2[1].hostname).to.equal('hostname')
      expect(contact2[1].port).to.equal('8080');
    });

  });

  describe('@function isCompatibleVersion', function() {

    it('should be compatible (same version)', function() {
      expect(utils.isCompatibleVersion(version.protocol)).to.equal(true);
    });

    it('should not be compatible (different major)', function() {
      expect(utils.isCompatibleVersion('999.0.0')).to.equal(false);
    });

    it('should be compatible (different patch)', function() {
      expect(
        utils.isCompatibleVersion(semver.inc(version.protocol, 'patch'))
      ).to.equal(true);
    });

    it('should be compatible (different minor)', function() {
      expect(
        utils.isCompatibleVersion(semver.inc(version.protocol, 'minor'))
      ).to.equal(true);
    });

    it('should not be compatible (different build tag)', function() {
      expect(
        utils.isCompatibleVersion(version.protocol + '-buildtag')
      ).to.equal(false);
    });

  });

  describe('@function isValidContact', function() {

    it('should allow loopback iface if enabled', function() {
      expect(utils.isValidContact(['nodeid', {
        hostname: '127.0.0.1',
        port: 1337
      }], true)).to.equal(true);
    });

    it('should not allow loopback iface if disabled', function() {
      expect(utils.isValidContact(['nodeid', {
        hostname: '127.0.0.1',
        port: 1337
      }])).to.equal(false);
    });

    it('should allow valid public hostname', function() {
      expect(utils.isValidContact(['nodeid', {
        hostname: '104.200.143.243',
        port: 1337
      }])).to.equal(true);
    });

    it('should allow valid public hostname', function() {
      expect(utils.isValidContact(['nodeid', {
        hostname: 'some.domain.name',
        port: 1337
      }])).to.equal(true);
    });

    it('should allow valid port', function() {
      expect(utils.isValidContact(['nodeid', {
        hostname: 'some.domain.name',
        port: 80
      }])).to.equal(true);
    });

    it('should not allow invalid port', function() {
      expect(utils.isValidContact(['nodeid', {
        hostname: 'some.domain.name',
        port: 0
      }])).to.equal(false);
    });

  });

  describe('@function isHexaString', function() {
    it('returns false for object', function() {
      expect(utils.isHexaString({})).to.equal(false);
    });

    it('returns false for number', function() {
      expect(utils.isHexaString(123456789)).to.equal(false);
    });

    it('returns false for function', function() {
      expect(utils.isHexaString(function(){})).to.equal(false);
    });

    it('returns false for json string', function() {
      expect(utils.isHexaString('{"hello": "world"}')).to.equal(false);
    });

    it('returns false for base64 string', function() {
      expect(utils.isHexaString('+rx4I0qmXs+I8TYn')).to.equal(false);
    });

    it('returns false for any string with non-base16 characters', function() {
      [ 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q',
        'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', '!', '@',
        '#', '$', '%', '^', '&', '*', '(', ')', 'G', 'H', 'I',
        'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T',
        'U', 'V', 'W', 'X', 'Y', 'Z', '\'', '"'].forEach((a) => {
          expect(utils.isHexaString(a)).to.equal(false);
        });
    });

    it('returns true for hexadecimal string (lowercase)', function() {
      expect(utils.isHexaString('0123456789abcdef')).to.equal(true);
    });

    it('returns true for hexadecimal string (uppercase)', function() {
      expect(utils.isHexaString('0123456789ABCDEF')).to.equal(true);
    });

  });

  describe('@function isValidHDNodeKey', function() {

    it('will return false for a number', function() {
      expect(utils.isValidHDNodeKey(10000)).to.equal(false);
    });

    it('will return false for object literal', function() {
      expect(utils.isValidHDNodeKey({})).to.equal(false);
    });

    it('will return false for non-base58 characters', function() {
      const hdKey = 'xpub68Gmy5EdvgibQVfPdqkBBCHxA5htiqg55crXYuXoQRKfDBFA1WE' +
                    'jWgP6LHhwBZeNK1VTsfTFUHCdrfp1bgwQ9xv5ski8PX9rL2dZXvgGDn0';
      expect(utils.isValidHDNodeKey(hdKey)).to.equal(false);
    });

    it('will return true for extended public key string', function() {
      const hdKey = 'xpub68Gmy5EdvgibQVfPdqkBBCHxA5htiqg55crXYuXoQRKfDBFA1WE' +
                    'jWgP6LHhwBZeNK1VTsfTFUHCdrfp1bgwQ9xv5ski8PX9rL2dZXvgGDnw';
      expect(utils.isValidHDNodeKey(hdKey)).to.equal(true);
    });
  });

  describe('@function isValidNodeIndex', function() {

    it('will return false for NaN', function() {
      expect(utils.isValidNodeIndex(NaN)).to.equal(false);
    });

    it('will return false for Infinity', function() {
      expect(utils.isValidNodeIndex(Infinity)).to.equal(false);
    });

    it('will return false for number greater than 2 ^ 31 - 1', function() {
      expect(utils.isValidNodeIndex(Math.pow(2, 31))).to.equal(false);
    });

    it('will return false for number less than zero', function() {
      expect(utils.isValidNodeIndex(-10000)).to.equal(false);
    });

    it('will return true for => 0 and <= 2 ^ 31 - 1', function() {
      expect(utils.isValidNodeIndex(Math.pow(2, 31) - 1)).to.equal(true);
    });

  });

  describe('@function getContactURL', function() {

    it('should return the contact object as a url', function() {
      expect(utils.getContactURL(['identitykey', {
        hostname: 'my.farmer.hostname',
        port: 8080,
        protocol: 'http:'
      }])).to.equal('http://my.farmer.hostname:8080/#identitykey')
    });

  });

});
