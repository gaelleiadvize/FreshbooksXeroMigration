'use strict'

var when = require('when');
var traverse = require('traverse');
var moment = require('moment');

module.exports = function (FreshbooksApi, XeroApi, logger) {
    assert(_.isObject(FreshbooksApi));
    assert(_.isObject(XeroApi));
    assert(_.isObject(logger));


    var xeroDraftInvoicesNumber = [];

    /**
     * Set invoices approuved
     *
     * @param invoices
     * @returns {*|Promise}
     */
    function setApprouved(invoices) {

        return when.map(invoices, function (invoice) {
            var isDraftInXero = _.includes(xeroDraftInvoicesNumber, invoice.number);

            if (isDraftInXero) {
                return {
                    InvoiceNumber: invoice.number,
                    Status: 'AUTHORISED'
                }
            }
            return false;
        })
            .then(_.filter)
            .then(XeroApi.approuved)
            .then(function (data) {
                return when.all(invoices);
            });
    }

    /**
     * Add payments in Xero invoices
     * @param invoices
     * @returns {*|Promise}
     */
    function addPayments(invoices) {

        return when(invoices)
            .then(FreshbooksApi.getPayments)
            .then(function (data) {
                logger.debug('COUCOU');
            })
            .then(XeroApi.updatePayments);
    }

    return {

        paymentMigration: function (type, page) {

            XeroApi.listDraftInvoices()
                .then(function (draftInvoices) {

                    _.forEach(draftInvoices, function (invoice) {
                        xeroDraftInvoicesNumber.push(invoice.InvoiceNumber);
                    });

                    return FreshbooksApi.listInvoices('PAID', 1);

                })
                .then(setApprouved)
                .then(addPayments)
                .then(function (data) {
                    logger.info('coucou');
                });


            //listInvoices(type, page)
            //    //.then(setApprouved)
            //    //.then(addPayments)
            //    .then(function(data) {
            //        logger.info(data);
            //    })
            //    .
            //    catch(function(err) {
            //        logger.error(err);
            //    });
        }
    }
}
