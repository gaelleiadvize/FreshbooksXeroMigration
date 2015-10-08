//'use strict';
//
//require('./bootstrap');
//
//var logger = require('./helper/logger');
//var config = require('./config/config')(logger);
//var when = require('when');
//var moment = require('moment');
//
//
//var FreshBooks = require("./helper/freshbooks")(config.freshbooks, logger);
//var Xero = require("./helper/xero")(config.xero, logger);
//
//var invoice = new FreshBooks.Invoice();
//var payment = new FreshBooks.Payment;
//var promise = require('promise');
//
//var invoiceList = [];
//function listInvoices(page){
//
//	return new promise(function (resolve, reject) {
//
//		invoice.list({status: 'paid', number:'AQ018', per_page : 100, page: page},function(err, invoices, options) {
//			logger.info('Invoices page : ' + page);
//
//			if(err) { //returns if an error has occured, ie invoice_id doesn't exist.
//			   	reject(err);
//			  } else {
//				invoices.forEach(function(invoice) {
//					invoiceList.push({
//						id : invoice.invoice_id,
//						number : invoice.number,
//						amount : invoice.amount,
//						contact : invoice.organization
//					});
//				});
//				//resolve(invoiceList);
//				var nbInvoices = _.size(invoices);
//				if (nbInvoices) {
//					resolve(listInvoices(page+1));
//				} else {
//					//logger.info(invoiceList);
//					resolve(invoiceList);
//				}
//		}
//		});
//	});
//}
//
//function setApprouved(invoices) {
//	logger.info('Approuving....');
//	var data = [];
//	var deferred = when.defer();
//
//	_.forEach(invoices, function (invoice){
//		data.push({
//			InvoiceNumber : invoice.number,
//			Status : 'AUTHORISED'
//		});
//	});
//
//	deferred.resolve({
//			approuved : data,
//			invoices : invoices
//	});
//
//	return deferred.promise;
//}
//
////function callApprouved(data){
////	    logger.info('calling api xero for approuved ....')
////		var deferred = when.defer();
////		Xero.call('POST', '/Invoices/?SummarizeErrors=false', data.approuved, function(err, json) {
////			if (err) {
////			    logger.error('NOT APPROUVED');
////			    deferred.reject(err);
////			} else {
////				logger.info(_.size(data.approuved) + ' APPROUVED DONE !!!!!!!!!!');
////				deferred.resolve(data.invoices);
////			}
////		});
////
////		return deferred.promise;
////}
//
//function getPayment (invoice) {
//    var deferred = when.defer();
//
//	payment.list({invoice_id: invoice.id},function(err, payments, options) {
//		if (err) {
//			logger.error(err);
//			deferred.reject(err);
//		} else {
//			var paymentData = [];
//			_.forEach(payments, function (payment){
//				var paid = {
//					Invoice : {
//						InvoiceNumber : invoice.number
//					},
//					Amount : invoice.amount,
//					Account : {
//						AccountID : '5c0bcc56-99a1-464d-ac45-defe718131ee'
//					},
//					Date : moment(payment.date).format('YYYY-MM-DD'),
//					Reference : payment.type + ' - ' + payment.notes
//					}
//				paymentData.push(paid);
//			});
//			deferred.resolve(paymentData);
//		}
//	});
//
//	return deferred.promise;
//}
//
//function addPayment(invoices) {
//	//875b9c4e-5715-45b4-a120-bd615397b1fc
//	logger.info('Adding payments .....');
//	 var deferreds = [];
//	 var data = [];
//	 _.forEach(invoices, function (invoice){
//	 	deferreds.push(getPayment(invoice));
//	 });
//	console.log('count addPayment ' + _.size(deferreds));
//	return when.all(deferreds);
//}
//
//function format(data){
//	logger.info('Formating data ....');
//
//	var deferred = when.defer();
//	var paymentsList = [];
//	_.forEach(data, function (payments) {
//		_.forEach(payments, function (payment) {
//			paymentsList.push(payment);
//		});
//	});
//
//	return when.all(paymentsList);
//}
//
//function callPayments(data){
//
//	var deferred = when.defer();
//	logger.info('Call payment API');
//	Xero.call('POST', '/Payments/?SummarizeErrors=false', data, function(err, json) {
//		if(err) {
//			logger.err(err);
//			deferred.reject(err);
//		} else {
//			logger.info(_.size(data) + ' payments DONE !!!!');
//			deferred.resolve(json);
//		}
//	});
//
//	return deferred.promise;
//}
//
//listInvoices(1)
//.then(setApprouved)
//.then(callApprouved)
//.then(addPayment)
//.then(format)
//.then(callPayments)
//.then(function (data){
//	logger.info(_.size(data) + ' DONE !!!!');
//
//	//logger.debug(data);
//}).catch(function (err) {
//    console.error('Erreur !!!!!!!!!');
//    logger.error(err);
//});
//
