'use strict'

var when = require('when');
var traverse = require('traverse');
var moment = require('moment');

module.exports = function(Xero, logger) {
    assert(_.isObject(Xero));
    assert(_.isObject(logger));

    var invoiceList = [];

    /**
     * List Xero invoices
     *
     * @param integer page current page
     * @param string filter Invoices number list
     * @returns {Promise|promise|*|Handler.promise|when.promise|Deferred.promise}
     */
    function listInvoices(page, filter) {
        assert(_.isNumber(page));
        assert(_.isString(filter));

        var deferred = when.defer();

        Xero.call('GET', '/Invoices/?page=' + page + filter, null, function(err, json) {
            if (err) {
                logger.error(err);
                deferred.reject({
                    status: 'KO',
                    message: err
                });
            } else {
                if (json.Response.Invoices) {
                    if (_.isArray(json.Response.Invoices.Invoice)) {
                        _.forEach(json.Response.Invoices.Invoice, function(invoice) {
                            invoiceList.push(invoice);
                        });
                    } else {
                        invoiceList.push(json.Response.Invoices.Invoice);
                    }

                    deferred.resolve(listInvoices(page + 1, filter));
                } else {
                    deferred.resolve(invoiceList);
                }
            }
        });

        return deferred.promise;
    }

    /**
     * Format filter (invoice number)
     *
     * @param array filters Array of invoices number
     *
     * @returns {string}
     */
    function formatInvoiceNumberFilter(filters) {
        assert(_.isObject(filters));

        var queryString = '&where=Status == "DRAFT"';

        if (filters) {
            var max = 0;
            queryString += ' AND (';
            _.forEach(filters, function(item) {
                if (max <= 50) {
                    queryString += 'InvoiceNumber=="' + item + '" OR ';
                }
                max++;
            });

            return _.trimRight(queryString, 'OR ') + ')';
        }

        return queryString;
    }

    /**
     * Get invoice list
     *
     * @param array csvData Invoice data from CSV
     * @returns {*|Promise}
     */
    function getInvoiceList(csvData) {
        assert(_.isObject(csvData));

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

    /**
     * Get items request body
     *
     * @param Object xeroInvoices
     * @param Object csvInvoices
     *
     * @returns {*}
     */
    function getItemsRequestBody(xeroInvoices, csvInvoices) {
        assert(_.isArray(xeroInvoices));
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

                if (csvInvoices[i + 1]) {
                    var nextInvoiceNumber = csvInvoices[i + 1][1];
                } else {
                    var nextInvoiceNumber = false;
                }

                if (invoiceNumber != nextInvoiceNumber) {
                    XeroPostData.push({
                        InvoiceNumber: invoiceNumber,
                        LineItems: XeroProductData
                    });
                }

                indexItem++;
            }
            currentCsvLine = invoiceNumber;
            i++;

        });

        return when.all(XeroPostData);

    }

    /**
     * Update invoices
     *
     * @param Object data Data to update
     *
     * @returns {Promise|promise|*|Handler.promise|when.promise|Deferred.promise}
     */
    function updateInvoice(data) {

        var deferred = when.defer();
        logger.info('Calling Xero Invoice API ....');

        Xero.call('POST', '/Invoices/?SummarizeErrors=false', data, function(err, json) {
            if (err) {
                logger.error(err);
                deferred.reject({
                    status: 'KO',
                    message: err
                });
            } else {

                var InvoicesError = [];
                when(json.Response)
                    .then(function(items) {
                        traverse(items).forEach(function(item) {
                            if ('ValidationErrors' == this.key) {
                                InvoicesError.push(
                                    {
                                        invoice: this.parent.node.InvoiceNumber,
                                        message: this.node.ValidationError.Message
                                    }
                                );
                            }
                        });

                        var total = _.size(data);
                        var errors = _.size(InvoicesError);
                        if (errors) {
                            logger.error(InvoicesError);
                        }
                        logger.info((total - errors) + '/' + total + ' INVOICE(S) UPDATED SUCCESSFUL !');

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
                    return getItemsRequestBody(xeroInvoices, csvData);
                })
                .then(updateInvoice)
                .catch(function(err) {
                    logger.error(err);
                });
        }
    }
};
