"use strict";

const winston = require('winston');
require('winston-daily-rotate-file');

module.exports = class logSystem {
    // 建構時傳入資料夾位置source與紀錄感測器類型type
    constructor(source, type) {
        this.source = source;
        this.type = type;
        // 設定紀錄檔名 / 資料夾位置 / 日期格式 / 壓縮與否 / 最大檔案大小 / 最多紀錄保留天數
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

    // 將Log字串寫入
    record(log) {
        this.logger.info(log);
    }
};