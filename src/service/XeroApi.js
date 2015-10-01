'use strict'

var when = require('when');
var traverse = require('traverse');
var moment = require('moment');


module.exports = function(Xero, logger) {

    var invoiceList = [];

    function listInvoices(page, filters) {


        var deferred = when.defer();

        if (filters) {

            var string = '&where=';
            var i=0;
            _.forEach(filters, function (item){
                if (i<= 50) {
                    string += 'InvoiceNumber=="' + item + '" OR ';
                }

                i++;
            })

            var filterString = _.trimRight(string, 'OR ');

        }
        logger.debug ('/Invoices/?page=' + page + filterString);
        Xero.call('GET', '/Invoices/?page=' + page + filterString, null, function(err, json) {
            logger.info('Invoices page : ' + page);
            if (err) {
                logger.error(err);
            } else {
                _.forEach(json.Response.Invoices.Invoice, function(invoice) {
                    invoiceList.push(invoice);
                });
                //
                //var nbInvoices = _.size(invoices);
                //if (nbInvoices) {
                //    deferred.resolve(listInvoices(status, page + 1));
                //} else {
                //    deferred.resolve(invoiceList);
                //}
            }
        });

        return deferred.promise;


    }

    function getInvoiceList(csvData) {

        return when(csvData)
            .then(function(csvData) {
                csvData = _.slice(csvData, 1, csvData.length);
                var invoicesNumber = [];
                _.forEach(csvData, function (invoice){
                    invoicesNumber.push(invoice[1]);
                })

                listInvoices(1, invoicesNumber);
                //Xero.call('GET', '/Invoices/?where=InvoiceNumber=="AP418" OR InvoiceNumber=="AP266"&page=1', null, function(err, json) {
                //    if (err) {
                //        logger.error(err);
                //    } else {
                //
                //        _.forEach(json, function(item) {
                //            logger.debug(JSON.stringify(item));
                //        });
                //
                //
                //        return when.resolve(json);
                //    }
                //
                //    logger.info('coucou');
                //});


                //var invoiceNumber = [];
                //
                //_.forEach(csvData, function(invoice) {
                //    invoiceNumber.push(invoice);
                //})
                //
                //return when.all(invoiceNumber);
            });


    }


    return {
        updateDiscounts: function(csvData) {
            when(csvData)
                .then(getInvoiceList)
                .then(function(data) {

                    return true;
                });
        }
    }
}