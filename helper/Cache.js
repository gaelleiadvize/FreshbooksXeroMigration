'use strict';
var fs = require("fs");

module.exports = function(scope, logger) {
    assert(_.isObject(logger));

    var path = './cache/';

    function formatKey(key) {
        return key + '-' + scope;
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

        get: function(filename) {

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
    }
};
