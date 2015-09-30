'use strict';

require('./bootstrap');

var logger = require('./helper/logger');
var config = require('./config/config')(logger);
var when = require('when');
var moment = require('moment');


var FreshBooks = require("./helper/freshbooks")(config.freshbooks, logger);
var Xero = require("./helper/xero")(config.xero, logger);

var FreshbooksInvoices = require('./src/service/FreshbooksInvoices')(FreshBooks, Xero, logger);

var invoice = new FreshBooks.Invoice();
var payment = new FreshBooks.Payment;

var invoiceList = [];
FreshbooksInvoices.paymentMigration('partial', 1);

