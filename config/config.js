'use strict';

module.exports = function(logger) {
    var env = require('common-env/withLogger')(logger);

    return env.getOrElseAll({
        freshbooks: {
            uri: {
                $default: 'uri',
                $aliases: ['SALES_FRESHBOOK_INVOICING_URI']
            },
            token: {
                $default: 'token',
                $aliases: ['SALES_FRESHBOOK_INVOICING_APITOKEN']
            }
        },
        xero: {
            key: {
                $default: 'key',
                $aliases: ['SALES_XERO_INVOICING_KEY']
            },
            secret: {
                $default: 'secret',
                $aliases: ['SALES_XERO_INVOICING_SECRET']
            },
            rsa: {
                $default: 'rsa',
                $aliases: ['SALES_XERO_INVOICING_RSA']
            },
            taxe: {
                $default: 'taxe',
                $aliases: ['SALES_XERO_INVOICING_TAXE_RATE']
            },
            account: {
                $default: 'accountID',
                $aliases: ['SALES_XERO_ACCOUNT_ID']
            }
        }
    });
};