'use strict';

require('./bootstrap');
var when = require('when');

var logger = require('./helper/logger');
var config = require('./config/config')(logger);

var Cache = require("./helper/cache")('discount', logger);
var Xero = require("./helper/xero")(config.xero, logger);

var Csv = require('./src/service/Csv')(logger);
var XeroApi = require('./src/service/XeroApi')(Xero, Cache, logger);

Csv.parse('discountConverted')
    .then(XeroApi.updateDiscounts);



