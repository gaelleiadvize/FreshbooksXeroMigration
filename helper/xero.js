'use strict'

var Xero = require("xero");

module.exports = function(config, logger) {
	  assert(_.isString(config.key));
  	  assert(_.isString(config.secret));
  	  assert(_.isString(config.rsa));

  	  return new Xero(config.key, config.secret, config.rsa);
}