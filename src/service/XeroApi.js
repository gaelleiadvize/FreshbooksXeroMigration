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
    var filterList = []

    var config = require('../../config/config')(logger);

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
                logger.info('/Invoices/?page=' + page + filter);

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
     * List Xero invoices
     *
     * @param integer page current page
     * @param string filter Invoices number list
     * @returns {Promise|promise|*|Handler.promise|when.promise|Deferred.promise}
     */
    function listCreditNotes(page, filter, cacheEnabled) {
        assert(_.isNumber(page));

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

        //Xero.call('GET', '/Invoices/?page=' + page + filter + ' AND InvoiceNumber="AR1493"', null, function(err, json) {
        Xero.call('GET', '/CreditNotes/?page=' + page + filter, null, function(err, json) {
            //logger.debug('/Invoices/?page=' + page + filter + ' AND InvoiceNumber="AR1493"');
            if (err) {
                logger.error(err);
                deferred.reject({
                    status: 'KO',
                    message: err
                });
            } else {
                logger.info('/CreditNotes/?page=' + page + filter);
                //logger.debug(json.Response.CreditNotes);
                if (json.Response.CreditNotes) {
                    if (_.isArray(json.Response.CreditNotes.CreditNote)) {
                        _.forEach(json.Response.CreditNotes.CreditNote, function(invoice) {
                            creditNoteList.push(invoice);
                        });
                    } else {
                        creditNoteList.push(json.Response.CreditNotes.CreditNote);
                    }
                    logger.info('[xero] On met en cache [%s]', filter, {});
                    if (cacheEnabled) {
                        Cache.set('xero-creditnotes', creditNoteList);
                    }

                    deferred.resolve(creditNoteList);
                    //logger.debug(json.Response.CreditNotes);
                    //deferred.resolve(listCreditNotes(page + 1, filter, cacheEnabled));
                } else {

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
                queryString += 'InvoiceNumber=="' + item + '" OR ';
                if (max <= 50) {
                    max++;
                } else {
                    filterList.push(_.trimEnd(queryString, 'OR ') + ')');
                    max = 0;
                    queryString = '&where=Status == "' + status + '" AND (';
                }
            });
            if (max <= 50) {
                filterList.push(_.trimEnd(queryString, 'OR ') + ')');

            }

            return filterList;
        }
    }

    /**
     * Format filter (invoice number)
     *
     * @param array filters Array of invoices number
     *
     * @returns {string}
     */
    function formatCreditNotNumberFilterNew(status, filters) {

        var queryString = '&where=Status == "' + status + '"';


        if (filters) {
            var max = 0;
            queryString += ' AND (';
            _.forEach(filters, function(item) {
                queryString += 'CreditNoteNumber=="' + item + '" OR ';
                if (max <= 20) {
                    max++;
                } else {
                    filterList.push(_.trimEnd(queryString, 'OR ') + ')');
                    max = 0;
                    queryString = '&where=Status == "' + status + '" AND (';
                }
            });
            if (max <= 20) {
                filterList.push(_.trimEnd(queryString, 'OR ') + ')');

            }

            return filterList;
        }
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
    // function listCreditNotes(filter, cacheEnabled) {
    //
    //     if (cacheEnabled == undefined) {
    //         cacheEnabled = true;
    //     }
    //
    //     var deferred = when.defer();
    //
    //     // Read json cache file !
    //     if (cacheEnabled) {
    //         var cacheXeroInvoices = Cache.get('xero-creditnotes');
    //         if (cacheXeroInvoices) {
    //             deferred.resolve(cacheXeroInvoices);
    //
    //             return deferred.promise;
    //         }
    //     }
    //
    //     logger.info('Calling Xero list credit notes ...');
    //     Xero.call('GET', '/CreditNotes/?' + filter, null, function(err, json) {
    //         logger.info('query  ' + '/CreditNotes/?page=1' + filter);
    //         if (err) {
    //             logger.error(err);
    //             deferred.reject({
    //                 status: 'KO',
    //                 message: err
    //             });
    //         } else {
    //             if (json.Response.CreditNotes) {
    //                 if (_.isArray(json.Response.CreditNotes.CreditNote)) {
    //                     _.forEach(json.Response.CreditNotes.CreditNote, function(creditNote) {
    //                         creditNoteList.push(creditNote);
    //                     });
    //                 } else {
    //                     creditNoteList.push(json.Response.CreditNotes.CreditNote);
    //                 }
    //
    //                 logger.info('[xero] On met en cache [%s]', filter, {});
    //                 if (cacheEnabled) {
    //                     Cache.set('xero-creditnotes', creditNoteList);
    //                 }
    //
    //                 deferred.resolve(creditNoteList);
    //             }
    //         }
    //     });
    //
    //     return deferred.promise;
    // }

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
                    invoicesNumber.push(invoice[0]);
                });

                return when.all(_.uniq(invoicesNumber));
            })
            .then(function(filters) {
                return formatInvoiceNumberFilterNew('AUTHORISED', filters);

            })
            .then(function(queryString) {

                var cacheXeroInvoice = Cache.get('xero-invoices');

                if (cacheXeroInvoice.length > 0) {
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
     * Get invoice list
     *
     * @param array csvData Invoice data from CSV
     * @returns {*|Promise}
     */
    function getCreditNoteList(csvData) {
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
                return formatCreditNotNumberFilterNew('AUTHORISED', filters);

            })
            .then(function(queryString) {

                var cacheXeroInvoice = Cache.get('xero-creditnotes');

                if (cacheXeroInvoice.length > 0) {
                    return cacheXeroInvoice;
                }
                var promise = [];

                _.forEach(queryString, function(filter) {
                    promise.push(listCreditNotes(1, filter, false));
                });

                return when.all(promise).then(function(data) {
                    Cache.set('xero-creditnotes', creditNoteList);
                    return creditNoteList;
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

    function deletePayment(payment, data, number) {
        Xero.call('POST', '/Payments/' + payment.PaymentID, data, (err, json) => {
            if (err) {
                logger.error('Payment deleted for (' + number + ') ' + payment.PaymentID + '[' + payment.Date + ']');
                // logger.error(err);
            } else {
                logger.info('Payment deleted for (' + number + ') ' + payment.PaymentID + '[' + payment.Date + ']');
            }

        });

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

        updateSpain: csvData => {
            csvData.shift();
            logger.debug(csvData);
            when(csvData)
                .then(getInvoiceList)
                .then(xeroInvoices => {
                    var payments = [];
                    _.forEach(xeroInvoices, invoice => {
                        logger.debug(invoice.InvoiceNumber);
                        var payment = {
                            Invoice: {
                                InvoiceID: invoice.InvoiceID
                            },
                            Amount: invoice.AmountDue,
                            Account: {
                                AccountID: config.xero.account
                            },
                            Date: moment().format('YYYY-MM-DD'),
                        }

                        payments.push(payment);
                    })
                    return when.all(payments);
                })
                .then(payments => {
                    updatePayments(payments)
                })
        },

        removeSpain: csvData => {
            csvData.shift();
            logger.debug(csvData);
            when(csvData)
                .then(getInvoiceList)
                .then(xeroInvoices => {
                    var payments = [];
                    _.forEach(xeroInvoices, invoice => {

                        _.forEach(invoice.Payments, item => {

                            // Xero.call('GET', '/Payments/' + item.PaymentID,  function(err, json) {
                            //     if (err) {
                            //         logger.error(err);
                            //     } else {
                            //         logger.debug(json);
                            //     }
                            // });

                            payments = [];
                            const payment = {
                                Status: 'DELETED'
                            };
                            payments.push(payment);

                            // Call Xero API delete payment
                            if (item.Date !== '2016-11-30T00:00:00') {
                                logger.debug(invoice.InvoiceNumber + ' -  ' + item.Date + ' -  ' + item.PaymentID);
                                deletePayment(item, payments, invoice.InvoiceNumber);
                            }

                            // deletePayment(item.PaymentID, payments);

                        });
                        // var payment = {
                        //     Invoice: {
                        //         InvoiceID: invoice.InvoiceID
                        //     },
                        //     Amount: invoice.AmountDue,
                        //     Account: {
                        //         AccountID: config.xero.account
                        //     },
                        //     Date: moment().format('YYYY-MM-DD'),
                        // }

                        //payments.push(payment);
                    })
                    //return when.all(payments);
                })
            // .then(payments => {
            //    // updatePayments(payments)
            // })
        },
        // Call end point CreditNote/ID/Allocations to allocate existing CN to invoices.
        AllocateCreditNote: csvData => {
            csvData.shift();

            when(csvData)
                .then(getInvoiceList)
                .then(xeroInvoices => {
                    let invoices = {};
                    _.forEach(xeroInvoices, item => {
                        invoices[item.InvoiceNumber] = item.InvoiceID;
                        // invoices.push({
                        //     [item.InvoiceNumber] : item.InvoiceID
                        // });
                    });

                    return invoices;

                })
                .then(invoices => {
                    when(csvData)
                        .then(getCreditNoteList)
                        .then(xeroCreditNotes => {
                            _.forEach(csvData, item => {
                                let xeroIndex = _.findIndex(xeroCreditNotes, function(xeroItem) {
                                    return xeroItem.CreditNoteNumber == item[1];
                                });

                                let amount = _.replace(item[2], ',', '.');

                                // Use buffer because endpoint is not enabled
                                let Allocation =
                                    '<Allocations>' +
                                    '<Allocation>' +
                                    '<AppliedAmount>' + Math.abs(_.toNumber(amount)) + '</AppliedAmount>' +
                                    '<Invoice>' +
                                    '<InvoiceID>' + invoices[item[0]] + '</InvoiceID>' +
                                    '</Invoice>' +
                                    '</Allocation>' +
                                    '</Allocations>';

                                logger.debug(Allocation);
                                let data = new Buffer(Allocation);

                                // if (item[0] === 'ES01081') {
                                Xero.call('PUT', '/CreditNotes/' + xeroCreditNotes[xeroIndex].CreditNoteID + '/Allocations', data, (err, json) => {
                                    if (err) {
                                        logger.error(err);
                                    } else {
                                        logger.debug(json);
                                    }
                                });
                            });
                        });

                });
        },
        spainSetPaid: csvData => {
            csvData.shift();
            when(csvData)
                .then(getInvoiceList)
                .then(xeroInvoices => {
                    if (_.isEmpty(xeroInvoices)) {
                        return;
                    }
                    let i = 1;
                    // logger.debug(csvData);
                    let payments = [];
                    _.forEach(csvData, item => {

                        let xeroIndex = _.findIndex(xeroInvoices, function(xeroItem) {
                            return xeroItem.InvoiceNumber == item[0];
                        });

                        let payment = {
                            Invoice: {
                                InvoiceID: xeroInvoices[xeroIndex].InvoiceID
                            },
                            Amount: xeroInvoices[xeroIndex].AmountDue,
                            Account: {
                                AccountID: config.xero.account
                            },
                            Date: moment(item[1], 'DD-MM-YYYY').format('YYYY-MM-DD'),

                        };
                        payments.push(payment);

                    });
                    return when.all(payments);
                })
                .then(payments => {
                    let i = 1;
                    _.forEach(payments, payment => {
                        logger.debug(payment);
                        logger.debug('=================================== ' + i);
                        i++;
                    });
                    //updatePayments(payments);
                });
        },

        checkPaiments: csvData => {
            csvData.shift();
            when(csvData)
                .then(getInvoiceList)
                .then(xeroInvoices => {
                    if (_.isEmpty(xeroInvoices)) {
                        return;
                    }
                    let i = 1;
                    // logger.debug(csvData);
                    let payments = [];
                    _.forEach(csvData, item => {

                        let xeroIndex = _.findIndex(xeroInvoices, function(xeroItem) {
                            return xeroItem.InvoiceNumber == item[0];
                        });

                        if (!_.isUndefined(xeroInvoices[xeroIndex])) {
                            logger.debug(xeroInvoices[xeroIndex].InvoiceNumber);
                            logger.debug(xeroInvoices[xeroIndex].Payments);
                            // let payment = {
                            //     Invoice: {
                            //         InvoiceID: xeroInvoices[xeroIndex].InvoiceID
                            //     },
                            //     Amount: xeroInvoices[xeroIndex].AmountDue,
                            //     Account: {
                            //         AccountID: config.xero.account
                            //     },
                            //     Date: moment(item[1], 'DD-MM-YYYY').format('YYYY-MM-DD'),
                            //
                            // };
                            // payments.push(payment);
                        }

                    });
                    return when.all(payments);
                })
                .then(payments => {
                    let i = 1;
                    _.forEach(payments, payment => {
                        logger.debug(payment);
                        logger.debug('=================================== ' + i);
                        i++;
                    });
                    //updatePayments(payments);
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
