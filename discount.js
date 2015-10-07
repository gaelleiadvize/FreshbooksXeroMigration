'use strict';

require('./bootstrap');

var logger = require('./helper/logger');
var config = require('./config/config')(logger);
//var csv = require("./helper/cs")(config.freshbooks, logger);
var when = require('when');

var FreshBooks = require("./helper/freshbooks")(config.freshbooks, logger);
var Xero = require("./helper/xero")(config.xero, logger);

var FreshbooksInvoices = require('./src/service/FreshbooksInvoices')(FreshBooks, Xero, logger);
var Csv = require('./src/service/Csv')(logger);
var XeroApi = require('./src/service/XeroApi')(Xero, logger);

Csv.parse('discountConverted')
    .then(XeroApi.updateDiscounts);



