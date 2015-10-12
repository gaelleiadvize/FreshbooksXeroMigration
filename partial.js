'use strict';

require('./bootstrap');

var logger = require('./helper/logger');
var config = require('./config/config')(logger);
var when = require('when');

var FreshBooks = require("./helper/freshbooks")(config.freshbooks, logger);
var Xero = require("./helper/xero")(config.xero, logger);
var Cache = require("./helper/cache")('partial', logger);


var FreshbooksApi = require('./src/service/FreshbooksApi')(FreshBooks, Cache, logger);
var XeroApi = require('./src/service/XeroApi')(Xero, Cache, logger);

//var FreshbooksInvoices = require('./src/service/FreshbooksInvoices')(FreshBooks, Xero, logger);

var Migration = require('./src/service/Migration')(FreshbooksApi, XeroApi, logger);

//logger.debug(Cache.getInstance().keys('toto'));


//FreshbooksInvoices.paymentMigration('paid', 1);
Migration.paymentMigration('partial', 1);
