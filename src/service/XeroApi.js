'use strict'

var when = require('when');
var traverse = require('traverse');
var moment = require('moment');


module.exports = function(Xero, logger) {

    var invoiceList = [];

    function listInvoices(page, filter) {


        var deferred = when.defer();

        // logger.debug ('/Invoices/?page=' + page + filter);
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
        var queryString = '';

        if (filters) {
            queryString = '&where=';
            var i = 0;
            _.forEach(filters, function(item) {
                if (i <= 50) {
                    queryString += 'InvoiceNumber=="' + item + '" OR ';
                }
                i++;
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
        var i=0;
        var j;
        _.forEach(csvInvoices, function(csvItem) {
            var invoiceNumber = csvItem[1];
            var discountRate = csvItem[11];
            var xeroIndex = _.findIndex(xeroInvoices, function(xeroItem) {
                return xeroItem.InvoiceNumber == invoiceNumber;
            });

            if (_.gt(xeroIndex, -1)) {

                if (currentCsvLine !== invoiceNumber) {
                    j = 0;
                    var currentPostData = [];
                    XeroProductData = [];
                    logger.debug('First line for ' + invoiceNumber);
                    var productItems = xeroInvoices[xeroIndex].LineItems;
                }

                logger.debug(productItems);

                var productItem = xeroInvoices[xeroIndex].LineItems.LineItem[j];
                XeroProductData.push({
                    LineItemID: productItem.LineItemID,
                    Description: productItem.Description,
                    UnitAmount : productItem.UnitAmount,
                    DiscountRate : discountRate
                });

            //<Description>avr-12</Description>
            //    <UnitAmount>-185.00</UnitAmount>
            //    <AccountCode>200</AccountCode>
            //    <Quantity>1.0000</Quantity>
            //    <DiscountRate>5.00</DiscountRate>
            //    <LineItemID>43138b35-9d9a-42fc-a921-41c38cc7c709</LineItemID>


                logger.debug('current line : ' + invoiceNumber);
                if (invoiceNumber != csvInvoices[i+1][1]) {
                  //  logger.debug(XeroProductData);
                    XeroPostData.push({
                        InvoiceNumber: invoiceNumber,
                        LineItems : XeroProductData
                    })

                    logger.debug('Last line for ' + invoiceNumber);
                }

                j++;
            }
            currentCsvLine = invoiceNumber;
            i++;

        });

        logger.debug(XeroPostData);

    }

    function updateInvoice(data) {


    }


    return {
        updateDiscounts: function(csvData) {
            csvData.shift();

            when(csvData)
                .then(getInvoiceList)
                .then(function(xeroInvoices) {
                    getRequestBody(xeroInvoices, csvData);

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