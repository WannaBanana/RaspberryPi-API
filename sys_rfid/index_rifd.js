const express = require('express');
const bodyParser = require('body-parser');
const config = require('../ENV.json');

var app = express();
var prefix = "RFID";
var rfid = require('./rfidControl');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

/* Server routing */

    /* 啟用讀取 */
    app.put('/rfid', function(req, res) {
        if(rfid.init()) {
            res.status(200).send({
                "message": "RFID讀取啟動成功"
            });
        } else {
            res.status(500).send({
                "message": "RFID讀取啟動失敗"
            });
        }
    });

    /* 停用讀取 */
    app.delete('/rfid', function(req, res) {
        if(rfid.terminate()) {
            res.status(200).send({
                "message": "RFID讀取關閉成功"
            });
        } else {
            res.status(500).send({
                "message": "RFID讀取關閉失敗"
            });
        }
    });

/* Server function */

    function gracefulShutdown() {
        try {
            // 終止 rfid 掃描
            rfid.terminate();
        } catch(err) {
            log.record('[' + prefix + '] Server shutdown catch error <Error>: ' + err);
        }

        log.record('[' + prefix + '] Server GPIO cleanup');

        console.log('[console] Received kill signal, shutting down gracefully.');
        server.close(function() {
            console.log('[console] Closed out remaining connections.');
            process.exit();
        });

        // if after
        setTimeout(function() {
            console.error('[console] Could not close connections in time, forcefully shutting down');
            process.exit();
        }, 10*1000);
    }


/* Server setting */

    // 監聽TERM訊號 .e.g. kill
    process.on('SIGTERM', function() {
        log.record('[' + prefix + '] Server shutdown by kill process');
        gracefulShutdown();
    });

    // 監聽INT訊號 .e.g. Ctrl-C
    process.on('SIGINT', function() {
        log.record('[' + prefix + '] Server shutdown by Ctrl-C');
        gracefulShutdown();
    });

    // 監聽Exception事件
    process.on('uncaughtException', function(err) {
        log.record('[' + prefix + '] Server shutdown by exception <Error>: ' + err.stack || err.message);
        gracefulShutdown();
    });

var server = app.listen(config.rfid.port || 8001, function() {
    var port = server.address().port;
    log.record('[' + prefix + '] System running at port ' + port);
});