'use strict';

require('./bootstrap');

var logger = require('./helper/logger');
var config = require('./config/config')(logger);
var when = require('when');
var moment = require('moment');


var FreshBooks = require("./helper/freshbooks")(config.freshbooks, logger);
var Xero = require("./helper/xero")(config.xero, logger);

var invoice = new FreshBooks.Invoice();
var payment = new FreshBooks.Payment;
var promise = require('promise'); 

var invoiceList = [];
function listInvoices(page){

	return new promise(function (resolve, reject) {

		invoice.list({status: 'paid', per_page : 100, page: page},function(err, invoices, options) {
			logger.info('Invoices page : ' + page);

			if(err) { //returns if an error has occured, ie invoice_id doesn't exist.
			   	reject(err);
			  } else {
				invoices.forEach(function(invoice) {
					invoiceList.push({
						id : invoice.invoice_id,
						number : invoice.number,
						amount : invoice.amount,
						contact : invoice.organization
					});
				});
				//resolve(invoiceList);
				var nbInvoices = _.size(invoices);
				if (nbInvoices) {		  	 	
					resolve(listInvoices(page+1));
				} else {
					//logger.info(invoiceList);
					resolve(invoiceList);
				} 
		}
		});
	});
}

function setApprouved(invoices) {
	logger.info('Begin Approuving....');

	var ready = promise.resolve(invoices);
	ready.then(function (invoices) {
		var data = [];
		_.forEach(invoices, function (invoice){
			data.push({
				InvoiceNumber : invoice.number,
				Status : 'AUTHORISED'
			});
		});
		logger.info('format data to approuved ....')
		return {
			approuved : data,
			invoices : invoices
		}
	})
	.then(function (data){
		logger.info('setting approuved ....')
	  	Xero.call('POST', '/Invoices/?SummarizeErrors=false', data.approuved, function(err, json) {
	        if (err) {
	            logger.error(err);
	            logger.error('NOT APPROUVED');
	        } else {
	        	logger.info('APPROUVED DONE !!!!!!!!!!');

	        	addPayment(data.invoices);
	        }
	    });
	});
}

function addPayment(invoices) {
	//875b9c4e-5715-45b4-a120-bd615397b1fc
	
	var ready = promise.resolve(invoices);
	ready.then(function (invoices) {
		logger.info('Getting  payments ....');
		return new promise(function (resolve, reject) {
			var paymentData = [];
			_.forEach(invoices, function (invoice){
				payment.list({invoice_id: invoice.id},function(err, payments, options) {
					if (err) {
						logger.error(err);
						reject(err);
					} else {
						
						_.forEach(payments, function (payment){
							var paid = {
								Invoice : {
									InvoiceNumber : invoice.number	
								},			
								Amount : invoice.amount,
								Account : {
									AccountID : '5c0bcc56-99a1-464d-ac45-defe718131ee'
								},
								Date : moment(payment.date).format('YYYY-MM-DD'),
								Reference : payment.type + ' - ' + payment.notes
								}
								//logger.info('pusssh payment');
								paymentData.push(paid);
						});
						resolve(paymentData);
					}
				});
			});
			
		});
	}).then(function (data){
		logger.info('Adding Payments ... ');	
	});
	




	// _.forEach(data, function (invoice){
	// 	ready.then(function () {
	// 		return new promise(function (resolve, reject) {
	// 			payment.list({invoice_id: invoice.id},function(err, payments, options) {
	// 				var paymentData = [];
	// 				_.forEach(payments, function (payment){
	// 					var paid = {
	// 						Invoice : {
	// 							InvoiceNumber : invoice.number	
	// 						},			
	// 						Amount : invoice.amount,
	// 						Account : {
	// 							AccountID : '5c0bcc56-99a1-464d-ac45-defe718131ee'
	// 						},
	// 						Date : moment(payment.date).format('YYYY-MM-DD'),
	// 						Reference : payment.type + ' - ' + payment.notes
	// 						}

	// 					paymentData.push(paid);
	// 				});
			    	
	// 				resolve(paymentData);
										
	// 			});
	// 		});
	// 	})
	// 	.then(function (data) {
	// 		logger.info('Adding Payments ... ');
	// 		logger.debug(data);
	// 		// Xero.call('POST', '/Payments/?SummarizeErrors=false', data, function(err, json) {
	// 	 //        if (err) {
	// 	 //            logger.error(err);
	// 	 //            logger.error('Adding payment Not done !');
	// 	 //        } else {
	// 	 //        	logger.info('Adding payment done !');
	// 	 //        }
		        
	// 	 //    });

	//     });
	// });
}


listInvoices(32)
.then(setApprouved)
.then(function (data){
	//console.log(data);

	//logger.info(data);
}).catch(function (err) {
    console.error('Erreur !');
    console.log(err);
});





