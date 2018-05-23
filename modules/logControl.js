"use strict";

const winston = require('winston');
require('winston-daily-rotate-file');

module.exports = class logSystem {
    constructor(source, type) {
        this.source = source;
        this.type = type;
        this.transport = new (winston.transports.DailyRotateFile)({
            filename: `${type}-%DATE%.log`,
            dirname: `${source}/${type}/`,
            datePattern: 'YYYY-MMM-DD',
            zippedArchive: false,
            maxSize: '20m',
            maxFiles: '14d'
        });
        this.logger = new (winston.Logger)({
            transports: [
              this.transport
            ]
        });
    }

    record(log) {
        this.logger.info(log);
    }
};