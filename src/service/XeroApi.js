'use strict'

var when = require('when');
var traverse = require('traverse');
var moment = require('moment');


module.exports = function(Xero, logger) {

    var invoiceList = [];

    function listInvoices(page, filter) {

        var deferred = when.defer();

        Xero.call('GET', '/Invoices/?page=' + page + filter, null, function(err, json) {
            logger.info('Invoices page : ' + page);
            if (err) {
                logger.error(err);
            } else {
                if (json.Response.Invoices) {
                    _.forEach(json.Response.Invoices.Invoice, function(invoice) {
                        invoiceList.push(invoice);
                    });

                    deferred.resolve(listInvoices(page + 1, filter));
                } else {
                    deferred.resolve(invoiceList);
                }
            }
        });

        return deferred.promise;
    }


    function formatInvoiceNumberFilter(filters) {

        var queryString = '&where=Status == "DRAFT"';

        if (filters) {
            var max = 0;
            queryString += ' AND ';
            _.forEach(filters, function(item) {
                if (max <= 50) {
                    queryString += 'InvoiceNumber=="' + item + '" OR ';
                }
                max++;
            });

            return _.trimRight(queryString, 'OR ');
        }

        return queryString;
    }

    function getInvoiceList(csvData) {

        return when(csvData)
            .then(function(csvData) {

                var invoicesNumber = [];
                _.forEach(csvData, function(invoice) {
                    invoicesNumber.push(invoice[1]);
                });

                return when.all(_.uniq(invoicesNumber));
            })
            .then(formatInvoiceNumberFilter)
            .then(function(queryString) {
                return listInvoices(1, queryString);
            });
    }

    function getRequestBody(xeroInvoices, csvInvoices) {


        var XeroPostData = [];
        var currentCsvLine = false;
        var XeroProductData = [];
        var i = 0;
        var indexItem;

        _.forEach(csvInvoices, function(csvItem) {
            var invoiceNumber = csvItem[1];
            var discountRate = csvItem[11];
            var xeroIndex = _.findIndex(xeroInvoices, function(xeroItem) {
                return xeroItem.InvoiceNumber == invoiceNumber;
            });

            if (_.gt(xeroIndex, -1)) {

                if (currentCsvLine !== invoiceNumber) {
                    indexItem = 0;
                    XeroProductData = [];
                    logger.debug('First line for ' + invoiceNumber);
                }

                var productItem = xeroInvoices[xeroIndex].LineItems.LineItem;
                if (_.isArray(productItem)) {
                    productItem = productItem[indexItem];
                }

                XeroProductData.push({
                    LineItemID: productItem.LineItemID,
                    Description: productItem.Description,
                    UnitAmount: productItem.UnitAmount,
                    Quantity: productItem.Quantity,
                    DiscountRate: discountRate
                });

                logger.debug('current line : ' + invoiceNumber);
                if (invoiceNumber != csvInvoices[i + 1][1]) {
                    XeroPostData.push({
                        InvoiceNumber: invoiceNumber,
                        LineItems: XeroProductData
                    });

                    logger.debug('Last line for ' + invoiceNumber);
                }

                indexItem++;
            }
            currentCsvLine = invoiceNumber;
            i++;

        });

        return when.all(XeroPostData);

    }

    function updateInvoice(data) {

        var deferred = when.defer();
        logger.info('Calling Xero Invoice API ....');

        Xero.call('POST', '/Invoices/?SummarizeErrors=false', data, function(err, json) {
            if (err) {
                logger.error(err);
                deferred.reject(err);
            } else {


                var InvoicesError = [];
                when(json.Response)
                    .then(function(items) {
                        traverse(items).forEach(function(item) {
                            if ('ValidationErrors' == this.key) {
                                InvoicesError.push(
                                    {
                                        invoice : this.parent.node.InvoiceNumber,
                                        message : this.node.ValidationError.Message

                                    }
                                );
                            }
                        });

                        var total = _.size(data);
                        var errors = _.size(InvoicesError);
                        if (errors) {
                            logger.error(InvoicesError);
                        }
                        logger.info((total - errors) + '/' +  total + ' INVOICE(S) UPDATED SUCCESSFUL !');

                        return deferred.resolve(data);
                    });
            }
        });

        return deferred.promise;

    }


    return {
        updateDiscounts: function(csvData) {
            csvData.shift();

            when(csvData)
                .then(getInvoiceList)
                .then(function(xeroInvoices) {
                    return getRequestBody(xeroInvoices, csvData);
                })
                .then(updateInvoice)
                .then(function(invoices) {

                    //var test=  _.findIndex(invoices, function(chr) {
                    //     return chr.InvoiceNumber == 'AP418';
                    // });
                    //
                    // logger.debug(invoices[1]);
                    return true;
                });
        }
    }
}