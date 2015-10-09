'use strict';

var Winston = require('winston');

var winston = new Winston.Logger({
    transports: [
        new Winston.transports.Console({
            colorize: true,
            timestamp: true
        }),
        new Winston.transports.File({
            filename: './logs/logs.txt',
            colorize: true,
            level: 'info',
            json: false
        })
    ],
    timestamp: true,
    level: 'debug'
});

module.exports = winston;