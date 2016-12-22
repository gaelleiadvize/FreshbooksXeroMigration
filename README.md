# FreshbooksXeroMigration
Invoices payment migration from Freshbooks to Xero


Tools for Xero Invoices / CreditNote / Payment actions (migration, bulk actions ....)

## Needed :
 - input directory (csv with invoice number ...)
 - .env 
 
 ```sh
 #!/bin/bash
export SALES_FRESHBOOK_INVOICING_URI="https://iadvize.freshbooks.com/api/2.1/xml-in"
export SALES_FRESHBOOK_INVOICING_APITOKEN=""
export SALES_ENV=DEV
export SALES_XERO_INVOICING_KEY=""
export SALES_XERO_INVOICING_SECRET=""
export SALES_XERO_INVOICING_RSA=""
export SALES_XERO_INVOICING_TAXE_RATE="TAX009,TAX004,TAX003,TAX008,TAX006,TAX005,TAX011,TAX007,TAX010,OUTPUT"
export SALES_XERO_ACCOUNT_ID=""
```


#CodeSmell #Ship
