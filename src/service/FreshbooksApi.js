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

    function getPayment(invoice) {
        var deferred = when.defer();

        paymentApi.list({invoice_id: invoice.id}, function(err, payments, options) {
            if (err) {
                deferred.reject(err);
            } else {

                var paymentList = [];
                var refundList = [];

                _.forEach(payments, function(payment) {

                    var paid = {
                        Invoice: {
                            InvoiceNumber: invoice.number
                        },
                        Amount: payment.amount,
                        Account: {
                            AccountID: '5c0bcc56-99a1-464d-ac45-defe718131ee'
                        },
                        Date: moment(payment.date).format('YYYY-MM-DD'),
                        Reference: payment.type + ' - ' + payment.notes
                    }

                    paymentList.push(paid);

                    // if (payment.type == 'Credit') {

                    // 	var paid = {
                    // 		CreditNote : {
                    // 			CreditNoteNumber : payment.notes
                    // 		},
                    // 		Amount : payment.amount,
                    // 		Account : {
                    // 			AccountID : '5c0bcc56-99a1-464d-ac45-defe718131ee'
                    // 		},
                    // 		Date : moment(payment.date).format('YYYY-MM-DD'),
                    // 		Reference : payment.type + ' - ' + payment.notes
                    // 	}

                    // 	paymentList.push(paid);

                    // 	refundList.push({
                    // 		RemainingCredit : payment.amount,
                    // 		CreditNoteNumber : payment.notes,
                    // 		Type : 'ACCRECCREDIT'

                    // 	});

                    // }
                });

                deferred.resolve(paymentList);
            }
        });

        return deferred.promise;
    }

    function getPayments(invoices) {
        //875b9c4e-5715-45b4-a120-bd615397b1fc
        logger.info('Getting payments');
        var deferreds = [];
        _.forEach(invoices, function(invoice) {
            deferreds.push(getPayment(invoice));
        });

        return when.all(deferreds)
            .then(formatPayment);
    }


    function formatPayment(data) {
        var paymentsList = [];
        _.forEach(data, function(payment) {
            paymentsList = paymentsList.concat(payment);
        });

        return when.all(paymentsList);
    }

    return {
        listInvoices : function (status, page){
            return listInvoices(status, page);
        },

        getPayments : function (invoices) {
            return getPayments(invoices);
        }
    }



}
