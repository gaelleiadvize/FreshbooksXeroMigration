'use strict'

var when = require('when');
var traverse = require('traverse');
var moment = require('moment');

module.exports = function(FreshbooksApi, XeroApi, logger) {
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

         return when.map(invoices, function(invoice) {
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
            //.then(function (data){
            //    logger.info(JSON.stringify(data));
            //})
            .then(XeroApi.approuved);
    }

    return {

        paymentMigration: function(type, page) {

            XeroApi.listDraftInvoices()
                .then(function (draftInvoices) {

                    _.forEach(draftInvoices, function (invoice){
                        xeroDraftInvoicesNumber.push(invoice.InvoiceNumber);
                    });

                   return FreshbooksApi.listInvoices('PAID', 1);

                })
                .then(setApprouved)
                .then(function (data){
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
