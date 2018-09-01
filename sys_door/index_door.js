var express = require('express');
var bodyParser = require('body-parser');
var rpio = require('rpio');
var config = require('../ENV.json');

rpio.init({mapping: 'physical', gpiomem: true});

var app = express();
var prefix = "DOOR";
var door = require('./doorControl')(rpio, config);
var logSystem = require('../module/logControl');
var log = new logSystem(config.main.logDirectory, 'api-system-' + prefix);

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// 初始化門鎖
door.init();

/* Server routing */

    /* 查詢門鎖狀態 */
    app.get('/door', function(req, res) {
        let result = door.state();
        if (result) {
            res.status(200).send(result);
        } else {
            res.status(500).send({
                "message": "狀態讀取失敗"
            });
        }
    });

    /* 修改門鎖狀態 */
    app.post('/door', function(req, res) {
        let requsetObject = req.body;
        if(requsetObject['method'] && (requsetObject['method'] != 'open' || requsetObject['method'] != 'close' || requsetObject['method'] != 'temp')) {
            if(requsetObject['method'] == 'temp') {
                if(requsetObject['delay'] && typeof(requsetObject['delay']) == 'number') {
                    if(door.lockSwitch(requsetObject['method'], requsetObject['delay'])) {
                        res.status(200).send({
                            "message": "狀態修改成功"
                        });
                    } else {
                        res.status(500).send({
                            "message": "狀態修改失敗"
                        });
                    }
                } else {
                    res.status(500).send({
                        "message": "缺少延遲秒數欄位或該欄位值不為數字"
                    });
                }
            } else {
                if(door.lockSwitch(requsetObject['method'])) {
                    res.status(200).send({
                        "message": "狀態修改成功"
                    });
                } else {
                    res.status(500).send({
                        "message": "狀態修改失敗"
                    });
                }
            }
        } else {
            res.status(500).send({
                "message": "缺少狀態欄位或不合法的狀態"
            });
        }
    });

    /* 啟動電源 */
    app.put('/door', function(req, res) {
        if(door.init()) {
            res.status(200).send({
                "message": "門鎖裝置啟動成功"
            });
        } else {
            res.status(500).send({
                "message": "門鎖裝置啟動失敗"
            });
        }
    });

    /* 更新門鎖狀態 */
    app.patch('/door', function(req, res) {
        let result = door.reload();
        if (result) {
            res.status(200).send(result);
        } else {
            res.status(500).send({
                "message": "重新讀取狀態失敗"
            });
        }
    });

    /* 關閉電源 */
    app.delete('/door', function(req, res) {
        if(door.terminate()) {
            res.status(200).send({
                "message": "門鎖裝置關閉成功"
            });
        } else {
            res.status(500).send({
                "message": "門鎖裝置關閉失敗"
            });
        }
    });
/* Server function */

    function gracefulShutdown() {
        try {
            // 結束門鎖gpio
            door.terminate();
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

var server = app.listen(config.lock.port || 8002, function() {
    var port = server.address().port;
    log.record('[' + prefix + '] System running at port ' + port);
});
