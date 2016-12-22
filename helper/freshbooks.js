'use strict'

var FreshBooks = require("freshbooks");

module.exports = function(config, logger) {
	  assert(_.isString(config.uri));
  	  assert(_.isString(config.token));

  	  return new FreshBooks(config.uri, config.token);
}