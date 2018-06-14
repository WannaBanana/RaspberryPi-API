const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const config = require('./ENV.json');
const rpio = require('rpio');
const door = require('./modules/doorControl')(rpio, config);
const rfid = require('./modules/rfidReader')(config, door);
const logSystem = require('./modules/logControl');

var app = express();

const log = new logSystem(config.main.logDirectory, 'api-system');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// gpio以物理編號載入
rpio.init({mapping: 'physical'});

door.init();

// 持續掃描rfid
setInterval(function(){
    rfid.read();
}, 500);

// 系統終止事件函式
function gracefulShutdown() {
    console.log('Received kill signal, shutting down gracefully.');
    server.close(function() {
        console.log('Closed out remaining connections.');
        process.exit();
    });

     // if after
     setTimeout(function() {
        console.error('Could not close connections in time, forcefully shutting down');
        process.exit();
    }, 10*1000);
}

  // 監聽TERM訊號 .e.g. kill
process.on('SIGTERM', function() {
    log.record('Server shutdown by kill process');
    gracefulShutdown();
});

process.on('SIGINT', function() {
    log.record('Server shutdown by Ctrl-C');
    gracefulShutdown();
});
  process.on('uncaughtException', function(err) {
    log.record('Server shutdown by exception <Error>: ' + err.stack || err.message);
    console.log( ' UNCAUGHT EXCEPTION ' );
    console.log( '[Inside "uncaughtException" event] ' + err.stack || err.message );
    gracefulShutdown();
});

var server = app.listen(config.main.port || 8080, function() {
    var port = server.address().port;
    console.log('API Server is running on port: ' + port + '!');
    log.record('System running at port ' + port);
});