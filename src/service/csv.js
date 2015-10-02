'use strict'

var when = require('when');
var csv = require('ya-csv');


module.exports = function(logger) {

    function readCsv(fileName, index) {
        var deferred = when.defer();

        var path = './input/' + fileName + '.csv';
        logger.info(path);

        var reader = csv.createCsvFileReader(path, {
            'separator': ',',
            'quote': '"',
            'escape': '"',
            'comment': ''
        });

       var allEntries = [];

        //reader.setColumnNames(['firstName', 'lastName', 'username']);
        reader.addListener('data', function(data) {
            //this gets called on every row load
           //if (index) {
           //    allEntries[data[index]] = data;
           //} else  {
                allEntries.push(data);
           //}

        });
        reader.addListener('end', function(data) {
            //this gets called when it's finished loading the entire file
            deferred.resolve(allEntries);
        });

        return deferred.promise;

    }

    return {
        parse: function(fileName, index) {
            return readCsv(fileName, index);
        }
    }

}