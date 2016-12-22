'use strict'

var when = require('when');
var traverse = require('traverse');
var moment = require('moment');


module.exports = function(Freshbooks, Xero, logger) {

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

        invoiceApi.list({status: status, number: 'AR1053', per_page: 100, page: page}, function(err, invoices, options) {
            logger.info('Invoices page : ' + page);
            if (err) {
                logger.error(err);
            } else {
                logger.debug(invoices);
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
                    deferred.resolve(invoiceList);
                }
            }
        });

        return deferred.promise;
    }

    /**
     * Set invoices approuved
     *
     * @param invoices
     * @returns {*|Promise}
     */
    function setApprouved(invoices) {

        return when.map(invoices, function(invoice) {
            return {
                InvoiceNumber: invoice.number,
                Status: 'AUTHORISED'
            }
        })
            .then(callApprouved);
    }

    /**
     * Call Xero invoices resource
     *
     * @param invoices
     * @returns {Promise|promise|*|Handler.promise|when.promise|Deferred.promise}
     */
    function callApprouved(invoices) {

        var deferred = when.defer();

        logger.info('calling api xero for approuved ....')
        Xero.call('POST', '/Invoices/?SummarizeErrors=false', invoices, function(err, json) {
            if (err) {
                logger.error('NOT APPROUVED');
                deferred.reject(err);
            } else {

                var InvoicesError = [];
                when(json.Response)
                    .then(function(items) {
                        traverse(items).forEach(function(item) {
                            if ('ValidationErrors' == this.key) {
                                InvoicesError.push(this.parent.node.InvoiceNumber);
                            }
                        });

                        var total = _.size(invoices);
                        var errors = _.size(InvoicesError);
                        if (errors) {
                            logger.error(InvoicesError);
                        }
                        logger.info((total - errors) + ' INVOICE(S) APPROUVED DONE !');

                        return deferred.resolve(invoiceList);
                    });
            }
        });

        return deferred.promise;

    }

    /**
     * Add payments in Xero invoices
     * @param invoices
     * @returns {*|Promise}
     */
    function addPayments(invoices) {

        return when(invoices)
            .then(getPayments)
            .then(callPayments);
    }

    function getPayment(invoice) {
        var deferred = when.defer();

        paymentApi.list({invoice_id: invoice.id}, function(err, payments, options) {
            if (err) {
                deferred.reject(err);
            } else {

                logger.info(payments);
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
        var deferreds = [];
        _.forEach(invoices, function(invoice) {
            deferreds.push(getPayment(invoice));
        });

        return when.all(deferreds).then(format);
    }

    function format(data) {
        var paymentsList = [];
        _.forEach(data, function(payment) {
            paymentsList = paymentsList.concat(payment);
        });

        // traverse(data).forEach(function (item) {
        // 	if ('payments' == this.key){
        // 		//paymentsList.push(this.node);
        // 		paymentsList = paymentsList.concat(this.node);
        // 	} else if ('refunds' == this.key)	{
        // 		//refundsList.push(this.node);
        // 		refundsList = refundsList.concat(this.node);
        // 	}
        // });

        return when.all(paymentsList);
    }

    // function setApprouvedCreditNotes(data){

    // 	var deferred = when.defer();
    // 	var creditNotes = data[1];

    // 	when.map(creditNotes, function (item){
    // 		item.Status = 'AUTHORISED';
    // 		return item;
    // 	})
    // 	.then(function(refunds) {

    // 			Xero.call('POST', '/creditnotes/', refunds, function(err, json) {
    // 				if (err) {
    // 					logger.error(err);
    // 				} else {
    // 					logger.info(_.size(creditNotes) + ' Credits notes approuved');

    // 					deferred.resolve(data[0]);

    // 				}
    // 			});

    // 	});

    // 	return deferred.promise;
    // }

    function callPayments(data) {
        var deferred = when.defer();
        logger.info('Calling Xero payment API ....');
        Xero.call('POST', '/Payments/?SummarizeErrors=false', data, function(err, json) {
            if (err) {
                logger.error(err);
                deferred.reject(err);
            } else {
                logger.info(_.size(data) + ' payments DONE !!!!');
                deferred.resolve(json);
            }
        });
        deferred.resolve(data);

        return deferred.promise;
    }

    return {
        paymentMigration: function(type, page) {
            listInvoices(type, page)
                .then(setApprouved)
                .then(addPayments)
                // .then(setApprouved)
                // .then(addPayments)
                // .then(setApprouvedCreditNotes)
                // .then(callPayments)
                .catch(function(err) {
                    logger.error(err);
                });
        }
    }
}