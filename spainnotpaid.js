'use strict';

require('./bootstrap');

var logger = require('./helper/logger');
var config = require('./config/config')(logger);
var when = require('when');

// var FreshBooks = require("./helper/freshbooks")(config.freshbooks, logger);
var Xero = require("./helper/xero")(config.xero, logger);
var Cache = require("./helper/cache")('notpaid-spain', logger, config);
//
//
// var FreshbooksApi = require('./src/service/FreshbooksApi')(FreshBooks, Cache, logger);
 var XeroApi = require('./src/service/XeroApi')(Xero, Cache, logger);
//
//
// var Migration = require('./src/service/Migration')(FreshbooksApi, XeroApi, logger);

var csvService = require('./src/service/csv')(logger);

//Migration.paymentMigration('paid', 'AUTHORISED');
// csvService.parse('spaininvoices')
//     .then(
//         data => {
//             logger.debug(data);
//             let XeroInvoices = XeroApi.listAuthorisedInvoices();
//         }
//
//     );
csvService.parse('spainnotpaid')
    .then(XeroApi.checkPaiments);