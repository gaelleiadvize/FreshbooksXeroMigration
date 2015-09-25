'use strict'

var when = require('when');
var traverse = require('traverse');
var moment = require('moment');


module.exports = function(Freshbooks, Xero, logger) {

	var invoiceList = [];
	var invoiceApi = new Freshbooks.Invoice();
	var paymentApi = new Freshbooks.Payment;

	function listInvoices(status, page){
		assert(_.isString(status));
		assert(_.isNumber(page));

		

		var deferred = when.defer();

		invoiceApi.list({status: 'paid', number: 'AQ460' ,per_page : 100, page: page},function(err, invoices, options) {
			logger.info('Invoices page : ' + page);
			if (err) {

			} else {

				_.forEach(invoices, function(invoice) {
					invoiceList.push({
						id : invoice.invoice_id,
						number : invoice.number,
						amount : invoice.amount,
						contact : invoice.organization
					});
				});

				var nbInvoices = _.size(invoices);
				if (nbInvoices) {		  	 	
					deferred.resolve(listInvoices(status, page+1));
				} else {
					deferred.resolve(invoiceList);
				} 
			}	
		});

		return deferred.promise;
	}

	function setApprouved(invoices) {

		return when.map(invoices, function (invoice){
			return {
				InvoiceNumber : invoice.number,
				Status : 'AUTHORISED'
			}
		})
		.then(callApprouved);
		// .then(function (data){
		// 	return when.resolve(invoices);
		// }).catch(function(err){
		// 	logger.error('erreur');
		// });

	}

	function callApprouved(data){

		var deferred = when.defer();

		logger.info('calling api xero for approuved ....')
		Xero.call('POST', '/Invoices/?SummarizeErrors=false', data, function(err, json) {
			if (err) {
		    	logger.error('NOT APPROUVED');
		    	deferred.reject(err);
			} else {
				
				var InvoicesError = [];
				when(json.Response)
				//.then(JSON.stringify)
				.then(function (items){					
					traverse(items).forEach(function (item) {
						if ('ValidationErrors' == this.key){
							InvoicesError.push(this.parent.node.InvoiceNumber);
						}								
					});
					logger.error(InvoicesError);
					var total = _.size(data);
					var errors = _.size(InvoicesError);
					logger.info((total - errors) + ' APPROUVED DONE !!!!!!!!!!');

					return deferred.resolve(invoiceList);
				});
			}
		});

		return deferred.promise;

	}

	function addPayments(invoices){
		return when(invoices)
				.then(addPayment)
				.then(callPayments);
	}

	function getPayment (invoice) {
	    var deferred = when.defer();

		paymentApi.list({invoice_id: invoice.id},function(err, payments, options) {
			if (err) {
				logger.error(err);
				deferred.reject(err); 
			} else {

				logger.info(payments);
				var paymentList = [];
				_.forEach(payments, function (payment){
					var paid = {
						Invoice : {
							InvoiceNumber : invoice.number	
						},			
						Amount : payment.amount,
						Account : {
							AccountID : '5c0bcc56-99a1-464d-ac45-defe718131ee'
						},
						Date : moment(payment.date).format('YYYY-MM-DD'),
						Reference : payment.type + ' - ' + payment.notes
						}
					paymentList.push(paid);

					if (payment.type == 'Credit') {
						//setStatusPaid(payment.notes);
					}
				});
				deferred.resolve(paymentList); 
			}
		});

	return deferred.promise;
}

function setStatusPaid(invoiceID){
	var data = [{
		Type : 'ACCRECCREDIT',
		InvoiceNumber : invoiceID,
		Status : 'PAID'
	}];

	Xero.call('POST', '/creditnotes/', data, function(err, json) {
		if (err) {
			logger.error(err);
		} else {
			logger.info('Credit note created with success ')
		}
	});


}

function addPayment(invoices) {
	//875b9c4e-5715-45b4-a120-bd615397b1fc
	logger.info('Adding payments .....');
	 var deferreds = [];
	 _.forEach(invoices, function (invoice){
	 	deferreds.push(getPayment(invoice));
	 });
	
	return when.all(deferreds).then(format);
}

function format(data){
	logger.info('Formating data ....');

	var deferred = when.defer();
	var paymentsList = [];
	_.forEach(data, function (payments) {
		_.forEach(payments, function (payment) {
			paymentsList.push(payment);	
		});
	});

	return when.all(paymentsList);
}


function callPayments(data){

	var deferred = when.defer();
	logger.info('Call payment API');
	Xero.call('POST', '/Payments/?SummarizeErrors=false', data, function(err, json) {
		if(err) {
			logger.error(err);
			deferred.reject(err);
		} else {
			logger.info(_.size(data) + ' payments DONE !!!!');
			deferred.resolve(json);
		}
	});

	return deferred.promise;
}

	return {
		paymentMigration: function (type, page){
			listInvoices(type, page)
			.then(setApprouved)
			.then(addPayments)
			.then(function (data){
				//logger.info(data);
				//logger.info(data);
			}).catch(function (err){
				logger.error(err);
			});
		}
	}
}