'use strict';

require('./bootstrap');

var logger = require('./helper/logger');
var config = require('./config/config')(logger);
var when = require('when');


var FreshBooks = require("./helper/freshbooks")(config.freshbooks, logger);
var Xero = require("./helper/xero")(config.xero, logger);

var FreshbooksInvoices = require('./src/service/FreshbooksInvoices')(FreshBooks, Xero, logger);

FreshbooksInvoices.paymentMigration('paid', 1);