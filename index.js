const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const config = require('./ENV.json');
const rpio = require('rpio');

var app = express();

// 載入紀錄物件
const logSystem = require('./modules/logControl');
const log = new logSystem(config.main.logDirectory, 'api-system');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const webcam = require('./modules/webcamControl')(config);
const door = require('./modules/doorControl')(rpio, config);
const glass = require('./modules/glassDetect')(rpio, config);
const rfid = require('./modules/rfidReader')(config, door, webcam);

try {
    // gpio以物理編號載入
    rpio.init({mapping: 'physical'});
    // 門鎖初始化
    door.init();
    // 綁定 rfid 掃描
    rfid.init();
    // 玻璃感應器初始化
    glass.init();
} catch(err) {
    log.record('Server startup catch error <Error>: ' + err);
}

app.use(function(req, res, next) {
    // 傳入模組控制
    req.rfid = rfid;
    req.door = door;
    req.webcam = webcam;
    req.log = log;
    next();
});

const routeDoor = require('./route/door');
const routeRfid = require('./route/rfid');
const routeGlass = require('./route/glass');

app.use('/', [routeDoor, routeGlass, routeRfid]);

// 系統終止事件函式
function gracefulShutdown() {
    try {
        // 門鎖終止運作
        door.terminate();
        // 終止 rfid 掃描
        rfid.terminate();
        // 玻璃感應器終止運作
        glass.terminate();
    } catch(err) {
        log.record('Server shutdown catch error <Error>: ' + err);
    }
    // 檢查並終止GPIO
    let gpioPin = [3,5,7,8,10,11,12,13,15,16,18,19,21,22,23,24,26,29,31,32,33,35,36,37,38,40];
    for(let index in gpioPin) {
        if(rpio.read(gpioPin[index]) == 1) {
            rpio.write(gpioPin[index], 0);
            rpio.close(gpioPin[index], rpio.PIN_PRESERVE);
        }
    }
    log.record('Server GPIO cleanup');

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
    log.record('Server shutdown by kill process');
    gracefulShutdown();
});

// 監聽INT訊號 .e.g. Ctrl-C
process.on('SIGINT', function() {
    log.record('Server shutdown by Ctrl-C');
    gracefulShutdown();
});

// 監聽Exception事件
process.on('uncaughtException', function(err) {
    log.record('Server shutdown by exception <Error>: ' + err.stack || err.message);
    gracefulShutdown();
});

var server = app.listen(config.main.port || 8080, function() {
    var port = server.address().port;
    log.record('System running at port ' + port);
});