'use strict'

var when = require('when');
var traverse = require('traverse');
var moment = require('moment');

module.exports = function(Xero, Cache, logger) {
    assert(_.isObject(Xero));
    assert(_.isObject(logger));
    assert(_.isObject(Cache));

    var invoiceList = [];
    var creditNoteList = [];
    var filterList = [];

    /**
     * List Xero invoices
     *
     * @param integer page current page
     * @param string filter Invoices number list
     * @returns {Promise|promise|*|Handler.promise|when.promise|Deferred.promise}
     */
    function listInvoices(page, filter, cacheEnabled) {
        assert(_.isNumber(page));

        if (cacheEnabled == undefined) {
            cacheEnabled = true;
        }

        var deferred = when.defer();

        // Read json cache file !
        if (cacheEnabled) {
            var cacheXeroInvoices = Cache.get('xero-invoices');
            if (cacheXeroInvoices) {
                deferred.resolve(cacheXeroInvoices);

                return deferred.promise;
            }
        }

        logger.info('Calling Xero list invoices ...');

        //Xero.call('GET', '/Invoices/?page=' + page + filter + ' AND InvoiceNumber="AR1493"', null, function(err, json) {
        Xero.call('GET', '/Invoices/?page=' + page + filter, null, function(err, json) {
            //logger.debug('/Invoices/?page=' + page + filter + ' AND InvoiceNumber="AR1493"');
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

                    deferred.resolve(listInvoices(page + 1, filter, cacheEnabled));
                } else {

                    logger.info('[xero] On met en cache [%s]', filter, {});
                    if (cacheEnabled) {
                        Cache.set('xero-invoices', invoiceList);
                    }

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
    function formatInvoiceNumberFilterNew(status, filters) {

        var queryString = '&where=Status == "' + status + '"';

        if (filters) {
            var max = 0;
            queryString += ' AND (';
            _.forEach(filters, function(item) {
                if (max <= 50) {
                    queryString += 'InvoiceNumber=="' + item + '" OR ';
                } else {
                    filterList.push(_.trimRight(queryString, 'OR ') + ')');
                    max = 0;
                    queryString = '&where=Status == "' + status + '" AND (';
                }

                max++;
            });

            return filterList;
            return _.trimRight(queryString, 'OR ') + ')';
        }

        return queryString;
    }

    /**
     * Format filter (invoice number)
     *
     * @param array filters Array of invoices number
     *
     * @returns {string}
     */
    function formatInvoiceNumberFilter(status, filters) {

        var queryString = '&where=Status == "' + status + '"';

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
     * List Xero Credit Notes
     *
     * @param integer page current page
     * @param string filter Invoices number list
     * @returns {Promise|promise|*|Handler.promise|when.promise|Deferred.promise}
     */
    function listCreditNotes(filter, cacheEnabled) {

        if (cacheEnabled == undefined) {
            cacheEnabled = true;
        }

        var deferred = when.defer();

        // Read json cache file !
        if (cacheEnabled) {
            var cacheXeroInvoices = Cache.get('xero-creditnotes');
            if (cacheXeroInvoices) {
                deferred.resolve(cacheXeroInvoices);

                return deferred.promise;
            }
        }

        logger.info('Calling Xero list credit notes ...');
        Xero.call('GET', '/CreditNotes/?' + filter, null, function(err, json) {
            logger.info('query  ' + '/CreditNotes/?page=1' + filter);
            if (err) {
                logger.error(err);
                deferred.reject({
                    status: 'KO',
                    message: err
                });
            } else {
                if (json.Response.CreditNotes) {
                    if (_.isArray(json.Response.CreditNotes.CreditNote)) {
                        _.forEach(json.Response.CreditNotes.CreditNote, function(creditNote) {
                            creditNoteList.push(creditNote);
                        });
                    } else {
                        creditNoteList.push(json.Response.CreditNotes.CreditNote);
                    }

                    logger.info('[xero] On met en cache [%s]', filter, {});
                    if (cacheEnabled) {
                        Cache.set('xero-creditnotes', creditNoteList);
                    }

                    deferred.resolve(creditNoteList);
                }
            }
        });

        return deferred.promise;
    }

    function createQuery(status) {
        var queryString = '&where=CreditNoteNumber.StartsWith("AF") AND (';

        _.forEach(status, function(item) {
            queryString += 'Status=="' + item + '" OR ';
        });

        return _.trimRight(queryString, 'OR ') + ')';
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
            .then(function(filters) {
                return formatInvoiceNumberFilterNew('DRAFT', filters);

            })
            .then(function(queryString) {
                var cacheXeroInvoice = Cache.get('xero-invoices');

                if (cacheXeroInvoice) {
                    return cacheXeroInvoice;
                }
                var promise = [];

                _.forEach(queryString, function(filter) {
                    promise.push(listInvoices(1, filter, false));
                });

                return when.all(promise).then(function(data) {
                    Cache.set('xero-invoices', invoiceList);
                    return invoiceList;
                });
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
            var discountRate = csvItem[11].replace(',', '.');

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
        logger.info('Calling Xero Invoice POST API for %s invoice(s)', _.size(data), {});

        if (_.size(data) == 0) {

            deferred.reject({
                status: 'KO',
                message: 'No data to update invoice'
            });

            return deferred.promise;
        }

        Xero.call('POST', '/Invoices/?SummarizeErrors=false', data, function(err, json) {

                if (err) {
                    logger.error(err);
                    deferred.reject({
                        status: 'KO',
                        message: err
                    });
                } else {

                    var InvoicesError = [];

                    return when(json.Response)
                        .then(function(items) {

                            //logger.debug(JSON.stringify(items))

                            InvoicesError = parseXeroResponse(items.Invoices.Invoice);

                            var total = _.size(data);
                            var errors = _.size(InvoicesError);
                            if (errors) {
                                logger.error('Xero Update Invoice Error %j', InvoicesError, {});
                            }
                            logger.info('%s INVOICE(S) UPDATED SUCCESSFUL !', (total - errors) + '/' + total, {});
                            //logger.info((total - errors) + '/' + total + ' INVOICE(S) UPDATED SUCCESSFUL !');

                            return deferred.resolve(data);
                        }
                    );
                }
            }
        );

        return deferred.promise;
    }

    function parseXeroResponse(response) {
        return _.filter(_.map(response, function(item) {
                if (item.ValidationErrors) {
                    var messages = item.ValidationErrors.ValidationError;
                    var invoiceNumber = item.InvoiceNumber;
                    if (item.Invoice) {
                        invoiceNumber = item.Invoice.InvoiceNumber;
                    }
                    return {
                        invoice: invoiceNumber,
                        message: messages
                    }
                }
            })
        );
    }

    function updatePayments(data) {
        var deferred = when.defer();

        logger.info('Calling Xero Payment POST API for %s payments(s)', _.size(data), {});

        Xero.call('POST', '/Payments/?SummarizeErrors=false', data, function(err, json) {
            if (err) {
                logger.error(err);
                deferred.reject(err);
            } else {

                var InvoicesError = [];
                when(json.Response)
                    .then(function(items) {

                        InvoicesError = parseXeroResponse(items.Payments.Payment);

                        var total = _.size(data);
                        var errors = _.size(InvoicesError);
                        if (errors) {
                            logger.error('Xero Update Payments Error %j', InvoicesError, {});
                        }

                        logger.info('%s PAYMENT(S) UPDATED SUCCESSFUL !', (total - errors) + '/' + total, {});
                        //logger.info((total - errors) + '/' + total + ' PAYMENT(S) UPDATED SUCCESSFUL !');

                        return deferred.resolve(data);
                    });
            }
        });

        deferred.resolve(data);

        return deferred.promise;
    }

    return {
        listDraftInvoices: function() {
            var status = 'DRAFT';
            return when.try(formatInvoiceNumberFilter, status, null)
                .then(function(query) {
                    return listInvoices(1, query, true);
                });
        },

        listAuthorisedInvoices: function() {
            var status = 'AUTHORISED';
            return when.try(formatInvoiceNumberFilter, status, null)
                .then(function(query) {
                    return listInvoices(1, query, true);
                });
        },

        listCredits: function(status, filters) {
            return when.try(createQuery, status, null)
                .then(listCreditNotes);
        },

        updateDiscounts: function(csvData) {
            csvData.shift();

            when(csvData)
                .then(getInvoiceList)
                .then(function(xeroInvoices) {
                    return getItemsRequestBody(xeroInvoices, csvData);
                })
                .then(updateInvoice)
                .catch(function(err) {
                   // logger.error('Update discount error : %j', err, {});
                });
        },

        approuved: function(invoices) {
            return updateInvoice(invoices);
        },

        updatePayments: function(payments) {
            return updatePayments(payments);
        },

        updateTaxe: function(data) {
            return updateInvoice(data);
        }
    }
}
;
