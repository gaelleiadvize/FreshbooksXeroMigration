'use strict'

var when = require('when');
var traverse = require('traverse');
var moment = require('moment');

module.exports = function(Freshbooks, Xero, logger) {
    assert(_.isObject(Freshbooks));
    assert(_.isObject(Xero));
    assert(_.isObject(logger));
}
