'use strict';
var fs = require("fs");
var when = require('when');
var moment = require('moment');

module.exports = function(scope, logger) {
    assert(_.isObject(logger));

    var path = './cache/';
    var now = moment().format('YYYYMMDD');

    function formatKey(key) {
        return key + '-' + scope + '-'+ now;
    }

    function exists(filename) {

        var filename = formatKey(filename);

        var content = '';
        var filepath = path + filename + '.json';

        try {
            content = fs.readFileSync(filepath);

            return content;
        } catch (err) {
            logger.info(filename + ' has no cache');
        }
    }

    return {
        set: function(filename, data) {
            var filename = formatKey(filename);
            var filepath = path + filename + '.json';
            fs.writeFile(filepath, JSON.stringify(data),  function(err) {
                if (err) {
                    return logger.error(err);
                }
            });
        },

        exists: function(filename) {

            var filename = formatKey(filename);

            var content = '';
            var filepath = path + filename + '.json';

            try {
                content = fs.readFileSync(filepath);

                return content;
            } catch (err) {
                logger.info(filename + ' has no cache');
            }
        },

        get: function (filename) {
            var cache =exists(filename);

            if (cache) {
                return when(cache)
                    .then(JSON.parse);
            }
            return false;
        }
    }
};
