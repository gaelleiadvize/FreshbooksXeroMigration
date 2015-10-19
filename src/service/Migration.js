'use strict'

var when = require('when');
var traverse = require('traverse');
var moment = require('moment');

module.exports = function(FreshbooksApi, XeroApi, logger) {
    assert(_.isObject(FreshbooksApi));
    assert(_.isObject(XeroApi));
    assert(_.isObject(logger));

    var config = require('../../config/config')(logger);

    var xeroDraftInvoicesNumber = [];

    var taxAssoc = [];
    taxAssoc['TAX002'] = 'TAX003';
    taxAssoc['TAX015'] = 'TAX017';
    taxAssoc['TAX001'] = 'TAX011';

    /**
     * Set invoices approuved
     *
     * @param invoices
     * @returns {*|Promise}
     */
    function setApprouved(invoices) {
        logger.info('Setting Approuved');
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
            .then(function (invoices) {
                //return invoices;
                //return XeroApi.approuved(invoices);
                var postData = _.chunk(invoices, 20);
                var promise = [];
                //promise.push(XeroApi.approuved(postData[0]));
                //promise.push(XeroApi.approuved(postData[1]));
                //promise.push(XeroApi.approuved(postData[2]));
                _.forEach(postData, function (post){
                    promise.push(XeroApi.approuved(post));
                });

                return when.all(promise).then(function (data){
                    logger.info('Approuved ok !!');
                    return invoices;
                });
            })
            .then(function(data) {
                logger.info('Approuved done !');
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
            .then(function (payments){
                var postData = _.chunk(payments, 100);
                var promise = [];
                //promise.push(XeroApi.approuved(postData[0]));
                //promise.push(XeroApi.approuved(postData[1]));
                //promise.push(XeroApi.approuved(postData[2]));
                _.forEach(postData, function (post){
                    promise.push(XeroApi.updatePayments(post));
                });

                return when.all(promise);
            })
            .then(function (data){
                return payments;
            });
    }

    return {

        paymentMigration: function(type) {
            logger.debug(config.xero.account);
            XeroApi.listDraftInvoices()
                .then(function(draftInvoices) {
                    _.forEach(draftInvoices, function(invoice) {
                        xeroDraftInvoicesNumber.push(invoice.InvoiceNumber);
                    });

                    return FreshbooksApi.listInvoices(type, 1);
                })
                .then(setApprouved)
                .then(addPayments)
                .then(function(data) {
                    logger.info('Migration paiement done !');
                })
                .catch(function(err) {
                    //logger.error(err);
                });
        },

        creditNoteMigration: function(type) {

        },

        /**
         * Update VAT with taxType active (failed on init import)
         */
        updateTaxeRate: function() {
            XeroApi.listDraftInvoices()
                .then(function(invoices) {
                    var taxeRate = config.xero.taxe.split(",");
                    var tmpRate = [];
                    var XeroProductData = [];
                    var XeroPostData = []
                    _.forEach(invoices, function(invoice) {
                        var items = [];

                        var productItem = invoice.LineItems.LineItem;
                        if (_.isArray(productItem)) {
                            items = productItem;
                        } else {
                            items.push(invoice.LineItems.LineItem);
                        }
                        XeroProductData = [];
                        _.forEach(items, function(item) {

                            var product = {
                                LineItemID: item.LineItemID,
                                Description: item.Description,
                                UnitAmount: item.UnitAmount,
                                TaxAmount: item.TaxAmount,
                                Quantity: item.Quantity
                            };

                            if (item.DiscountRate) {
                                product.DiscountRate = item.DiscountRate;
                            }

                            if (item.TaxType) {
                                var tmp = _.includes(taxeRate, item.TaxType);
                                var taxType = item.TaxType;
                                if (!tmp) {
                                    taxType = taxAssoc[item.TaxType];
                                }
                                product.TaxType = taxType;
                             }

                            XeroProductData.push(product);
                        });

                        if (!_.isEmpty(XeroProductData)) {
                            //if (invoice.InvoiceNumber == 'AQ488') {
                            //logger.debug(XeroProductData);

                            XeroPostData.push({
                                InvoiceNumber: invoice.InvoiceNumber,
                                LineItems: XeroProductData
                            });
                           //  }
                        }

                    });
                    return when.all(XeroPostData);
                })
                .then(function(data) {
                    var postData = _.chunk(data, 20);
                    _.forEach(postData, function (post) {
                        XeroApi.updateTaxe(post);
                    });

                })

        }
    }
}
