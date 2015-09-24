'use strict'

var when = require('when');
var traverse = require('traverse');


module.exports = function(Freshbooks, Xero, logger) {

	var invoiceList = [];
	var invoiceApi = new Freshbooks.Invoice();
	var paymentApi = new Freshbooks.Payment;

	function listInvoices(status, page){
		assert(_.isString(status));
		assert(_.isNumber(page));

		

		var deferred = when.defer();

		invoiceApi.list({status: status, per_page : 100, page: page},function(err, invoices, options) {
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
		
		//var data = [];
		var deferred = when.defer();

		when.map(invoices, function (invoice){
			return {
				InvoiceNumber : invoice.number,
				Status : 'AUTHORISED'
			}
		})
		//.then(JSON.stringify)
		.then(callApprouved)
		.then(function (result){
			//logger.info(result);
		});


		var data = invoices.map(function (invoice){
			return {
				InvoiceNumber : invoice.number,
				Status : 'AUTHORISED'
			}
		});

		// _.forEach(invoices, function (invoice){
		// 	data.push({
		// 		InvoiceNumber : invoice.number,
		// 		Status : 'AUTHORISED'
		// 	});
		// });
		
		deferred.resolve({
			approuved : data,
			invoices : invoices
		});
		logger.info(_.size(data) + ' invoices approuved'); 

		return deferred.promise;
	}

	function callApprouved(data){

		return when.promise(function (resolve, reject) {
			 	logger.info('calling api xero for approuved ....')
				Xero.call('POST', '/Invoices/?SummarizeErrors=false', data, function(err, json) {
					if (err) {
				    	logger.error('NOT APPROUVED');
				    	return reject(err); 
					} else {
						logger.info(_.size(data) + ' APPROUVED DONE !!!!!!!!!!');

						when(json.Response)
						//.then(JSON.stringify)
						.then(function (items){
							var InvoicesError = [];
							traverse(items).forEach(function (item) {
								if ('ValidationErrors' == this.key){
									InvoicesError.push(this.parent.node.InvoiceNumber);
								}								
							});
							logger.error(InvoicesError);
						});
						return resolve(invoiceList); 
					}
				});
			}
		);
	}

	return {
		paymentMigration: function (type, page){
			listInvoices(type, page)
			.then(setApprouved)
			.then(function (data){
				//logger.info(data);
			})
		}
	}
}