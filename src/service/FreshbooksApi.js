'use strict'

var when = require('when');
var traverse = require('traverse');
var moment = require('moment');

module.exports = function(Freshbooks, Cache, logger) {
    assert(_.isObject(Freshbooks));
    assert(_.isObject(logger));

    var invoiceApi = new Freshbooks.Invoice;
    var paymentApi = new Freshbooks.Payment;


    var invoiceList = [];

    /**
     * Get freshbook invoices list
     *
     * @param string status Invoice status ("paid" / "partial")
     * @param integer page
     * @returns {Promise|promise|*|Handler.promise|when.promise|Deferred.promise}
     */
    function listInvoices(status, page) {
        assert(_.isString(status));
        assert(_.isNumber(page));

        var deferred = when.defer();

        // Read json cache file !
        var cacheInvoices = Cache.get('freshbooks-invoices');
        if (cacheInvoices) {
            when(cacheInvoices)
                .then(JSON.parse)
                .then(function(cacheInvoices) {
                    deferred.resolve(cacheInvoices);
                });

            return deferred.promise;
        }

        invoiceApi.list({status: status, per_page: 100, page: page}, function(err, invoices, options) {
            logger.info('Freshbook invoices page : ' + page);
            if (err) {
                logger.error(err);
            } else {
                _.forEach(invoices, function(invoice) {
                    invoiceList.push({
                        id: invoice.invoice_id,
                        number: invoice.number,
                        amount: invoice.amount,
                        contact: invoice.organization
                    });
                });

                var nbInvoices = _.size(invoices);
                if (nbInvoices) {
                    deferred.resolve(listInvoices(status, page + 1));
                } else {
                    logger.info('[freshbooks] On met en cache');
                    Cache.set('freshbooks-invoices', invoiceList);
                    deferred.resolve(invoiceList);
                }
            }
        });

        return deferred.promise;
    }

    return {
        listInvoices : function (status, page){
            return listInvoices(status, page);
        }
    }



}
