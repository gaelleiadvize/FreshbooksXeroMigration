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
            .then(XeroApi.approuved)
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
            .then(XeroApi.updatePayments);
    }

    return {

        paymentMigration: function(type) {

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

        creditNoteMigration: function (type) {

        },

        updateTaxeRate: function () {
            XeroApi.listDraftInvoices()
                .then(function (invoices){
                    var taxeRate = config.xero.taxe.split(",");
                    var tmpRate = [];
                    var XeroProductData = [];
                    var XeroPostData = []
                    _.forEach(invoices, function (invoice) {
                        var items = [];

                        var productItem = invoice.LineItems.LineItem;
                        if (_.isArray(productItem)) {
                            items = productItem;
                        } else {
                            items.push(invoice.LineItems.LineItem);
                        }
                        XeroProductData = [];
                        _.forEach(items, function (item) {

                            if (item.TaxType) {
                                var tmp = _.includes(taxeRate, item.TaxType);
                                if (!tmp) {
                                    if (!_.includes(tmpRate, item.TaxType)) {
                                        tmpRate.push(item.TaxType);

                                       // logger.debug(invoice.InvoiceNumber + ' : ' + item.TaxType + ' ' + tmp);
                                    }
                                    XeroProductData.push({
                                        LineItemID: item.LineItemID,
                                        Description: item.Description,
                                        TaxType: taxAssoc[item.TaxType]
                                    });



                                } else {
                                    XeroProductData.push({
                                        LineItemID: item.LineItemID,
                                        Description: item.Description,
                                        TaxType: item.TaxType
                                    });
                                }
                            }
                        })
                        if (!_.isEmpty(XeroProductData)) {
                            if (invoice.InvoiceNumber == 'AQ095') {
                                logger.debug(XeroProductData);
                            }
                            XeroPostData.push({
                                InvoiceNumber: invoice.InvoiceNumber,
                                LineItems: XeroProductData
                            });
                        }

                    });
                    return when.all(XeroPostData);
                })
                .then(function (data) {
                   XeroApi.updateTaxe(data);
                })

        }
    }
}
