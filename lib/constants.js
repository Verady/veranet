/**
 * @module veranet/constants
 */

'use strict';


module.exports = {


  /**
   * @constant {string} TOKEN_CONTRACT_ADDRESS_TEST - ERC20 Token Address
   */
  TOKEN_CONTRACT_ADDRESS_TEST: '0x2261316092B0a81E6565F0ec39d77D041bADb15a',

  /**
   * @constant {string} TOKEN_CONTRACT_ADDRESS_MAIN - ERC20 Token Address
   */
  TOKEN_CONTRACT_ADDRESS_MAIN: '0x0000000000000000000000000000000000000000',

  /**
   * @constant {array} TOKEN_CONTRACT_ABI - ERC20 Token ABI
   */
  TOKEN_CONTRACT_ABI: require('./token-contract-abi'),

  /**
   * @constant {number} TOKEN_PAYMENT_RATE - Number tokens for successful query
   */
  TOKEN_PAYMENT_RATE: 1,

  /**
   * @constant {string} NULL_ADDR - Null ethereum address
   */
  NULL_ADDR: '0x0000000000000000000000000000000000000000'

};
